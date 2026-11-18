-- =========================================================================
-- Migração 11 — Etapa 5: painéis do AFILIADO e do VENDEDOR PRÓPRIO
-- =========================================================================
-- Tudo filtrado por auth.uid(): cada um vê só as próprias indicações.
-- Nenhum dado do comprador sai daqui (LGPD) e o vendedor nunca vê o
-- faturamento total da loja nem os números de outros vendedores.
--
-- Situação da comissão (enquanto o aviso da Lytex não existe, vem do pedido):
--   aguardando_pagamento → pedido criado, ainda não pago
--   a_receber            → pago, dentro do prazo de desistência (7 dias do recebimento)
--   repassada            → pago e prazo encerrado (repassada pelo split)
--   estornada            → desistência/reembolso
--   cancelada            → pedido cancelado antes de pagar
-- p_papel: 'afiliado' (vendas de catálogo) ou 'vendedor' (vendas como vendedor próprio)

create or replace function public.situacao_comissao(p_status text, p_arrependimento_ate timestamptz)
returns text language sql stable set search_path = '' as $$
  select case
    when p_status = 'aguardando_pagamento' then 'aguardando_pagamento'
    when p_status = 'cancelado' then 'cancelada'
    when p_status in ('em_reembolso', 'reembolsado') then 'estornada'
    when p_status = 'pago' and p_arrependimento_ate is not null and p_arrependimento_ate < now() then 'repassada'
    else 'a_receber'
  end;
$$;

-- comissões de uma pessoa (afiliado ou vendedor), por pedido criado no período
create or replace function public.minhas_comissoes(p_papel text, p_inicio timestamptz, p_fim timestamptz)
returns table (pedido_id uuid, data timestamptz, produto text, quantidade integer, loja text,
               valor_centavos bigint, comissao_centavos bigint, status_pedido text, situacao text,
               previsao timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, o.criado_em, oi.nome_item, oi.quantidade, coalesce(p.loja_nome, p.razao_social),
         (oi.quantidade * oi.preco_unitario_centavos)::bigint,
         floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)::bigint,
         o.status, public.situacao_comissao(o.status, o.arrependimento_ate),
         case when o.status = 'pago' then o.arrependimento_ate end
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.producers p on p.id = o.producer_id
  where o.revendedor_id = (select auth.uid())
    and ((p_papel = 'vendedor' and o.vendedor_id is not null) or (p_papel = 'afiliado' and o.vendedor_id is null))
    and o.criado_em >= p_inicio and o.criado_em < p_fim
  order by o.criado_em desc;
$$;

-- cards e gráfico (cliques × vendas por dia) do afiliado ou do vendedor
create or replace function public.painel_indicador(p_papel text, p_inicio timestamptz, p_fim timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  with eu as (select (select auth.uid()) as id),
  -- lojas em que a pessoa é vendedor próprio ativo: os cliques nelas contam como "vendedor"
  lojas_vendedor as (
    select v.producer_id from public.loja_vendedores v, eu where v.user_id = eu.id and v.status = 'ativo'
  ),
  meus_cliques as (
    select c.criado_em, c.item_id, c.external_link_id
    from public.clicks c join public.storefronts s on s.id = c.storefront_id, eu
    where s.revendedor_id = eu.id and c.criado_em >= p_inicio and c.criado_em < p_fim
  ),
  cliques as (
    select mc.criado_em from meus_cliques mc join public.items i on i.id = mc.item_id
    where (p_papel = 'vendedor') = (i.producer_id in (select producer_id from lojas_vendedor))
  ),
  comissoes as (select * from public.minhas_comissoes(p_papel, p_inicio, p_fim)),
  dias as (
    select d::date as dia
    from generate_series((p_inicio at time zone 'America/Sao_Paulo')::date,
                         ((p_fim - interval '1 second') at time zone 'America/Sao_Paulo')::date, interval '1 day') d
  )
  select jsonb_build_object(
    'vendas', (select count(distinct pedido_id) from comissoes where situacao in ('a_receber', 'repassada')),
    'vendido_centavos', (select coalesce(sum(valor_centavos), 0) from comissoes where situacao in ('a_receber', 'repassada')),
    'a_receber_centavos', (select coalesce(sum(comissao_centavos), 0) from comissoes where situacao = 'a_receber'),
    'repassada_centavos', (select coalesce(sum(comissao_centavos), 0) from comissoes where situacao = 'repassada'),
    'estornada_centavos', (select coalesce(sum(comissao_centavos), 0) from comissoes where situacao = 'estornada'),
    'cliques', (select count(*) from cliques),
    'cliques_externos', (select count(*) from meus_cliques where external_link_id is not null),
    'serie', (select coalesce(jsonb_agg(jsonb_build_object(
                'dia', d.dia,
                'cliques', (select count(*) from cliques c where (c.criado_em at time zone 'America/Sao_Paulo')::date = d.dia),
                'vendas', (select count(distinct pedido_id) from comissoes k
                           where k.situacao in ('a_receber', 'repassada')
                             and (k.data at time zone 'America/Sao_Paulo')::date = d.dia))
              order by d.dia), '[]'::jsonb) from dias d)
  );
$$;

-- produtos afiliados (catálogo) com status, comissão e desempenho no período
create or replace function public.meus_produtos_afiliado(p_inicio timestamptz, p_fim timestamptz)
returns table (afiliacao_id uuid, item_id uuid, nome text, produto_slug text, loja text, loja_slug text,
               preco_centavos integer, comissao_percentual numeric, status text, cliques bigint, vendas bigint,
               vitrine_slug text)
language sql stable security definer set search_path = '' as $$
  select a.id, i.id, i.nome, i.slug, coalesce(p.loja_nome, p.razao_social), p.loja_slug,
         i.preco_centavos, i.comissao_percentual,
         case when exists (select 1 from public.loja_afiliados_bloqueados b
                           where b.producer_id = p.id and b.afiliado_id = a.afiliado_id) then 'bloqueada'
              else a.status end,
         (select count(*) from public.clicks c
          where c.storefront_id = a.storefront_id and c.item_id = i.id and c.criado_em >= p_inicio and c.criado_em < p_fim),
         (select count(distinct o.id) from public.orders o join public.order_items oi on oi.order_id = o.id
          where o.revendedor_id = a.afiliado_id and o.vendedor_id is null and oi.item_id = i.id
            and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         s.slug
  from public.afiliacoes a
  join public.items i on i.id = a.item_id
  join public.producers p on p.id = i.producer_id
  join public.storefronts s on s.id = a.storefront_id
  where a.afiliado_id = (select auth.uid()) and a.origem = 'catalogo'
  order by (a.status = 'aprovada') desc, a.criado_em desc;
$$;

revoke execute on function public.situacao_comissao(text, timestamptz) from public, anon;
grant execute on function public.situacao_comissao(text, timestamptz) to authenticated;
revoke execute on function public.minhas_comissoes(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.minhas_comissoes(text, timestamptz, timestamptz) to authenticated;
revoke execute on function public.painel_indicador(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.painel_indicador(text, timestamptz, timestamptz) to authenticated;
revoke execute on function public.meus_produtos_afiliado(timestamptz, timestamptz) from public, anon;
grant execute on function public.meus_produtos_afiliado(timestamptz, timestamptz) to authenticated;
