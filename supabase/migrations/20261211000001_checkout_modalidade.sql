-- =========================================================================
-- Checkout com escolha de meio e parcelas (docs/precificacao.md, seção 9)
--  * o pedido guarda o meio, as parcelas e os dados de Pix/boleto devolvidos pela fatura;
--  * colunas novas NÃO são liberadas para usuário logado (só o servidor lê, para a página do pedido);
--  * a loja enxerga só "Taxa da plataforma" e "Você recebe" (totais do split_snapshot), nunca a divisão
--    entre Lytex e Staypse; afiliado e vendedor não têm acesso a estes números.
-- =========================================================================

alter table public.orders
  add column cobranca_meio      text check (cobranca_meio in ('pix', 'boleto', 'cartao')),
  add column cobranca_parcelas  integer check (cobranca_parcelas between 1 and 12),
  add column cobranca_pagamento jsonb check (pg_column_size(cobranca_pagamento) <= 4000);
-- (sem "grant select": o grant por coluna de 20261206000001 não inclui as colunas novas)

drop function public.registrar_cobranca(uuid, text, text, text, jsonb);
create function public.registrar_cobranca(
  p_order uuid, p_provedor text, p_cobranca_id text, p_url text, p_snapshot jsonb,
  p_meio text default null, p_parcelas integer default null, p_pagamento jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
  set cobranca_provedor = p_provedor, cobranca_id = p_cobranca_id, cobranca_url = p_url,
      cobranca_criada_em = now(), split_snapshot = p_snapshot,
      cobranca_meio = p_meio, cobranca_parcelas = p_parcelas, cobranca_pagamento = p_pagamento
  where id = p_order and status = 'aguardando_pagamento' and cobranca_id is null;
  if not found then raise exception 'pedido_sem_cobranca_possivel'; end if;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'cobranca_criada', 'pedido', p_order,
          jsonb_build_object('provedor', p_provedor, 'cobranca_id', p_cobranca_id, 'meio', p_meio, 'parcelas', p_parcelas));
end; $$;
revoke execute on function public.registrar_cobranca(uuid, text, text, text, jsonb, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_cobranca(uuid, text, text, text, jsonb, text, integer, jsonb) to service_role;

-- Valores de cada pedido da PRÓPRIA loja: taxa da plataforma (a parte da loja no rateio com o afiliado) e quanto a loja recebe.
-- Só pedidos já com cobrança (snapshot) e nunca a divisão interna.
create or replace function public.loja_valores_pedidos(p_ids uuid[])
returns table (order_id uuid, taxa_centavos bigint, recebe_centavos bigint)
language sql stable security definer set search_path = '' as $$
  select o.id,
         public.fin_snapshot_valor(o.split_snapshot, 'taxaLojaCentavos'),
         public.fin_snapshot_valor(o.split_snapshot, 'produtorCentavos')
  from public.orders o
  where o.id = any (p_ids) and o.producer_id = public.minha_loja_id() and o.split_snapshot is not null;
$$;
revoke execute on function public.loja_valores_pedidos(uuid[]) from public, anon;
grant execute on function public.loja_valores_pedidos(uuid[]) to authenticated;

-- Totais do período (pedidos pagos): taxa da plataforma (parte da loja) e quanto a loja recebe
create or replace function public.painel_loja_taxas(p_inicio timestamptz, p_fim timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'taxa_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'taxaLojaCentavos')), 0),
    'recebe_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'produtorCentavos')), 0))
  from public.orders o
  where o.producer_id = public.minha_loja_id() and o.status = 'pago' and o.pago_em >= p_inicio and o.pago_em < p_fim
    and o.split_snapshot is not null;
$$;
revoke execute on function public.painel_loja_taxas(timestamptz, timestamptz) from public, anon;
grant execute on function public.painel_loja_taxas(timestamptz, timestamptz) to authenticated;

-- Afiliado: a taxa da plataforma sobre a comissão dele e quanto ele recebe, só nos pedidos dele.
-- Vendedor próprio não paga taxa e fica de fora (revendedor_id sem vendedor_id).
create or replace function public.afiliado_valores_pedidos(p_ids uuid[])
returns table (order_id uuid, taxa_centavos bigint, recebe_centavos bigint)
language sql stable security definer set search_path = '' as $$
  select o.id,
         public.fin_snapshot_valor(o.split_snapshot, 'taxaAfiliadoCentavos'),
         public.fin_snapshot_valor(o.split_snapshot, 'indicadorCentavos')
  from public.orders o
  where o.id = any (p_ids) and o.revendedor_id = (select auth.uid()) and o.vendedor_id is null and o.split_snapshot is not null;
$$;
revoke execute on function public.afiliado_valores_pedidos(uuid[]) from public, anon;
grant execute on function public.afiliado_valores_pedidos(uuid[]) to authenticated;
