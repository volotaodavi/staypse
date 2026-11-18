-- =========================================================================
-- Migração 10 — Etapa 5: painéis (relatórios por período) e bloqueio de afiliado
-- =========================================================================
-- Tudo calculado no banco, só sobre a PRÓPRIA loja (minha_loja_id()).
-- Período: [p_inicio, p_fim) em timestamptz; os dias são contados no fuso
-- America/Sao_Paulo. A Staypse não guarda dinheiro: aqui só há totais de
-- vendas e de comissões (a divisão de fato é feita pela instituição de pagamento).

-- -------------------------------------------------------------------------
-- 1. Data de envio (o botão "Marcar como enviado" registra quando)
-- -------------------------------------------------------------------------
alter table public.order_items add column enviado_em timestamptz;

create or replace function public.order_items_nota_e_entrega()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.nota_fiscal_numero is not null and new.nota_fiscal_emitida_em is null then
    new.nota_fiscal_emitida_em := now();
  end if;
  if new.status_entrega = 'enviado' and new.enviado_em is null
     and (tg_op = 'INSERT' or old.status_entrega is distinct from 'enviado') then
    new.enviado_em := now();
  end if;
  return new;
end; $$;

-- -------------------------------------------------------------------------
-- 2. Bloqueio de afiliado pela loja: os links param de atribuir vendas novas
-- -------------------------------------------------------------------------
create table public.loja_afiliados_bloqueados (
  producer_id  uuid not null references public.producers (id) on delete cascade,
  afiliado_id  uuid not null references public.profiles (id) on delete cascade,
  bloqueado_em timestamptz not null default now(),
  primary key (producer_id, afiliado_id)
);
alter table public.loja_afiliados_bloqueados enable row level security;
revoke all on public.loja_afiliados_bloqueados from anon, authenticated;
grant select on public.loja_afiliados_bloqueados to authenticated;
create policy "bloqueios: a loja ou admin" on public.loja_afiliados_bloqueados
  for select to authenticated using (public.eh_dono_produtor(producer_id) or public.is_admin());

create or replace function public.bloquear_afiliado(p_afiliado uuid, p_bloquear boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_loja uuid := public.minha_loja_id();
begin
  if v_loja is null then raise exception 'loja_indisponivel'; end if;
  if p_bloquear then
    insert into public.loja_afiliados_bloqueados (producer_id, afiliado_id) values (v_loja, p_afiliado)
    on conflict do nothing;
    -- afiliações de catálogo aos itens da loja deixam de valer (link e checkout exigem "aprovada")
    update public.afiliacoes a set status = 'recusada', decidido_em = now()
    from public.items i
    where i.id = a.item_id and i.producer_id = v_loja and a.afiliado_id = p_afiliado
      and a.origem = 'catalogo' and a.status <> 'recusada';
  else
    delete from public.loja_afiliados_bloqueados where producer_id = v_loja and afiliado_id = p_afiliado;
  end if;
end; $$;
revoke execute on function public.bloquear_afiliado(uuid, boolean) from public, anon;
grant execute on function public.bloquear_afiliado(uuid, boolean) to authenticated;

-- afiliar-se: igual à migração 7, mais a recusa de quem a loja bloqueou
create or replace function public.afiliar_se(p_item uuid)
returns table (codigo text, status text)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_sf uuid; v_regra text; v_produtor uuid; v_atual record; v_novo text;
begin
  if not public.tem_papel('revendedor') then raise exception 'apenas_revendedor'; end if;
  select id into v_sf from public.storefronts where revendedor_id = v_uid;
  if v_sf is null then raise exception 'crie_sua_vitrine'; end if;
  select i.aprovacao_afiliacao, i.producer_id into v_regra, v_produtor
  from public.items i join public.producers p on p.id = i.producer_id
  where i.id = p_item and i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if v_regra is null then raise exception 'item_indisponivel'; end if;
  if public.eh_dono_produtor(v_produtor) then raise exception 'afiliacao_propria'; end if;
  if exists (select 1 from public.loja_afiliados_bloqueados b where b.producer_id = v_produtor and b.afiliado_id = v_uid) then
    raise exception 'afiliado_bloqueado';
  end if;
  if public.endereco_repetido(v_uid, p_item) then raise exception 'endereco_repetido'; end if;
  v_novo := case v_regra when 'automatica' then 'aprovada' else 'pendente' end;

  select a.id, a.status, a.vendedor_id, coalesce(v.status, 'ativo') as vinculo
  into v_atual
  from public.afiliacoes a left join public.loja_vendedores v on v.id = a.vendedor_id
  where a.afiliado_id = v_uid and a.item_id = p_item;

  if v_atual.id is null then
    insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status, decidido_em)
    values (v_uid, v_sf, p_item, v_novo, case when v_novo = 'aprovada' then now() end);
  elsif v_atual.status = 'recusada' or (v_atual.vendedor_id is not null and v_atual.vinculo <> 'ativo') then
    update public.afiliacoes
    set status = v_novo, decidido_em = case when v_novo = 'aprovada' then now() end,
        origem = 'catalogo', vendedor_id = null, era_catalogo = false, criado_em = now()
    where id = v_atual.id;
  end if;
  return query select a.codigo, a.status from public.afiliacoes a where a.afiliado_id = v_uid and a.item_id = p_item;
end; $$;

-- aprovar afiliação de quem está bloqueado também é recusado
create or replace function public.afiliacoes_respeita_bloqueio()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'aprovada' and new.origem = 'catalogo' and exists (
      select 1 from public.items i join public.loja_afiliados_bloqueados b on b.producer_id = i.producer_id
      where i.id = new.item_id and b.afiliado_id = new.afiliado_id) then
    raise exception 'afiliado_bloqueado';
  end if;
  return new;
end; $$;
revoke execute on function public.afiliacoes_respeita_bloqueio() from public, anon, authenticated;
create trigger afiliacoes_z_bloqueio before insert or update of status on public.afiliacoes
  for each row execute function public.afiliacoes_respeita_bloqueio();

-- -------------------------------------------------------------------------
-- 3. Relatórios do painel da loja
-- -------------------------------------------------------------------------
-- Venda = pedido com pagamento confirmado no período (status pago).
-- Pedidos desistidos/reembolsados saem das vendas (o dinheiro voltou ao comprador).
create or replace function public.painel_loja_resumo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  with loja as (select public.minha_loja_id() as id),
  vendas as (
    select o.id, o.total_centavos, o.pago_em,
           (select coalesce(sum(floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)), 0)
            from public.order_items oi where oi.order_id = o.id) as comissao
    from public.orders o, loja
    where o.producer_id = loja.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim
  ),
  cliques as (
    select c.criado_em from public.clicks c join public.items i on i.id = c.item_id, loja
    where i.producer_id = loja.id and c.criado_em >= p_inicio and c.criado_em < p_fim
  ),
  dias as (
    select d::date as dia
    from generate_series((p_inicio at time zone 'America/Sao_Paulo')::date,
                         ((p_fim - interval '1 second') at time zone 'America/Sao_Paulo')::date, interval '1 day') d
  )
  select jsonb_build_object(
    'vendas', (select count(*) from vendas),
    'faturamento_centavos', (select coalesce(sum(total_centavos), 0) from vendas),
    'comissoes_centavos', (select coalesce(sum(comissao), 0) from vendas),
    'cliques', (select count(*) from cliques),
    'aguardando_envio', (select count(distinct o.id) from public.orders o join public.order_items oi on oi.order_id = o.id, loja
                         where o.producer_id = loja.id and o.status = 'pago' and oi.status_entrega = 'aguardando'),
    'desistencias', (select count(*) from public.orders o, loja where o.producer_id = loja.id and o.status = 'em_reembolso'),
    'serie', (select coalesce(jsonb_agg(jsonb_build_object(
                'dia', d.dia,
                'vendas', (select count(*) from vendas v where (v.pago_em at time zone 'America/Sao_Paulo')::date = d.dia),
                'faturamento_centavos', (select coalesce(sum(v.total_centavos), 0) from vendas v
                                          where (v.pago_em at time zone 'America/Sao_Paulo')::date = d.dia))
              order by d.dia), '[]'::jsonb) from dias d)
  );
$$;

create or replace function public.painel_loja_produtos(p_inicio timestamptz, p_fim timestamptz)
returns table (item_id uuid, nome text, slug text, status_aprovacao text, tipo text, preco_centavos integer,
               cliques bigint, vendas bigint, unidades bigint, faturamento_centavos bigint)
language sql stable security definer set search_path = '' as $$
  select i.id, i.nome, i.slug, i.status_aprovacao, i.tipo, i.preco_centavos,
         (select count(*) from public.clicks c where c.item_id = i.id and c.criado_em >= p_inicio and c.criado_em < p_fim),
         (select count(distinct o.id) from public.order_items oi join public.orders o on o.id = oi.order_id
          where oi.item_id = i.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         (select coalesce(sum(oi.quantidade), 0) from public.order_items oi join public.orders o on o.id = oi.order_id
          where oi.item_id = i.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         (select coalesce(sum(oi.quantidade * oi.preco_unitario_centavos), 0) from public.order_items oi
          join public.orders o on o.id = oi.order_id
          where oi.item_id = i.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim)
  from public.items i
  where i.producer_id = public.minha_loja_id()
  order by i.criado_em desc;
$$;

-- Afiliados de CATÁLOGO (os vendedores próprios têm seção própria).
-- Sem e-mail nem telefone: só o nome e o @ da vitrine.
create or replace function public.painel_loja_afiliados(p_inicio timestamptz, p_fim timestamptz)
returns table (afiliado_id uuid, vitrine_nome text, vitrine_slug text, itens_aprovados bigint, itens_pendentes bigint,
               bloqueado boolean, cliques bigint, vendas bigint, faturamento_centavos bigint, comissao_centavos bigint)
language sql stable security definer set search_path = '' as $$
  with loja as (select public.minha_loja_id() as id),
  afiliados as (
    select a.afiliado_id from public.afiliacoes a join public.items i on i.id = a.item_id, loja
    where i.producer_id = loja.id and a.origem = 'catalogo'
    union
    select b.afiliado_id from public.loja_afiliados_bloqueados b, loja where b.producer_id = loja.id
  )
  select af.afiliado_id, s.nome_exibicao, s.slug,
         (select count(*) from public.afiliacoes a join public.items i on i.id = a.item_id, loja
          where a.afiliado_id = af.afiliado_id and i.producer_id = loja.id and a.status = 'aprovada' and a.origem = 'catalogo'),
         (select count(*) from public.afiliacoes a join public.items i on i.id = a.item_id, loja
          where a.afiliado_id = af.afiliado_id and i.producer_id = loja.id and a.status = 'pendente'),
         exists (select 1 from public.loja_afiliados_bloqueados b, loja where b.producer_id = loja.id and b.afiliado_id = af.afiliado_id),
         (select count(*) from public.clicks c join public.items i on i.id = c.item_id, loja
          where c.storefront_id = s.id and i.producer_id = loja.id and c.criado_em >= p_inicio and c.criado_em < p_fim),
         (select count(*) from public.orders o, loja
          where o.producer_id = loja.id and o.revendedor_id = af.afiliado_id and o.vendedor_id is null
            and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         (select coalesce(sum(o.total_centavos), 0) from public.orders o, loja
          where o.producer_id = loja.id and o.revendedor_id = af.afiliado_id and o.vendedor_id is null
            and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         (select coalesce(sum(floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)), 0)
          from public.orders o join public.order_items oi on oi.order_id = o.id, loja
          where o.producer_id = loja.id and o.revendedor_id = af.afiliado_id and o.vendedor_id is null
            and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim)
  from afiliados af left join public.storefronts s on s.revendedor_id = af.afiliado_id
  order by 9 desc, 7 desc, 2;
$$;

-- Vendedores próprios: ranking do período
create or replace function public.painel_loja_vendedores(p_inicio timestamptz, p_fim timestamptz)
returns table (vendedor_id uuid, nome text, arroba text, comissao_percentual numeric, forma_pagamento text, status text,
               cliques bigint, vendas bigint, faturamento_centavos bigint, comissao_centavos bigint)
language sql stable security definer set search_path = '' as $$
  select v.id, pr.nome, s.slug, v.comissao_percentual, v.forma_pagamento, v.status,
         (select count(*) from public.clicks c join public.items i on i.id = c.item_id
          where c.storefront_id = s.id and i.producer_id = v.producer_id and c.criado_em >= p_inicio and c.criado_em < p_fim),
         (select count(*) from public.orders o
          where o.vendedor_id = v.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         (select coalesce(sum(o.total_centavos), 0) from public.orders o
          where o.vendedor_id = v.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim),
         (select coalesce(sum(floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)), 0)
          from public.orders o join public.order_items oi on oi.order_id = o.id
          where o.vendedor_id = v.id and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim)
  from public.loja_vendedores v
  left join public.profiles pr on pr.id = v.user_id
  left join public.storefronts s on s.revendedor_id = v.user_id
  where v.producer_id = public.minha_loja_id() and v.status <> 'convidado'
  order by 10 desc, 8 desc, 2;
$$;

do $$
declare f text;
begin
  foreach f in array array['painel_loja_resumo', 'painel_loja_produtos', 'painel_loja_afiliados', 'painel_loja_vendedores'] loop
    execute format('revoke execute on function public.%I(timestamptz, timestamptz) from public, anon', f);
    execute format('grant execute on function public.%I(timestamptz, timestamptz) to authenticated', f);
  end loop;
end $$;
