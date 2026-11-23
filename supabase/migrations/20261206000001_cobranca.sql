-- =========================================================================
-- Migração 20261206000001 — Etapa 6: cobrança com split, webhook, chargeback e conciliação
-- =========================================================================
-- Regras garantidas aqui (no banco, não só na tela):
--  * a Staypse NUNCA recebe, guarda ou repassa dinheiro: o pedido guarda só a
--    REFERÊNCIA da cobrança no provedor e o "retrato" (snapshot) do split, para auditoria;
--  * o status da cobrança que o provedor informa (webhook ou conciliação) é aplicado por
--    UMA função (aplicar_status_cobranca), idempotente: repetir o mesmo aviso não repete efeito;
--  * novo status de pedido: 'chargeback' (comissões estornadas, registro em audit_log);
--  * o snapshot do split e o link de pagamento NÃO são legíveis por usuários logados
--    (nem pelo comprador, nem pela loja, nem pelo afiliado): só o servidor lê;
--  * a conciliação diária consulta o provedor das cobranças pendentes há mais de 1 hora.
-- Nada daqui fala com a Lytex: o provedor real só entra com a documentação oficial.

-- -------------------------------------------------------------------------
-- 1. Pedido: referência da cobrança, snapshot do split e status 'chargeback'
-- -------------------------------------------------------------------------
alter table public.orders
  add column cobranca_provedor  text check (cobranca_provedor in ('mock', 'lytex')),
  add column cobranca_id        text check (char_length(cobranca_id) between 1 and 200),
  -- página de pagamento do provedor (pode carregar o link secreto do pedido: nunca sai do servidor)
  add column cobranca_url       text check (char_length(cobranca_url) <= 2000),
  add column cobranca_criada_em timestamptz,
  -- quanto foi para cada recebedor (calcularSplit) no momento da cobrança
  add column split_snapshot     jsonb,
  add column chargeback_em      timestamptz,
  add constraint orders_cobranca_completa check ((cobranca_id is null) = (cobranca_provedor is null));
create unique index orders_cobranca_uk on public.orders (cobranca_provedor, cobranca_id) where cobranca_id is not null;

alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('aguardando_pagamento', 'pago', 'cancelado', 'em_reembolso', 'reembolsado', 'chargeback'));

-- Usuários logados continuam lendo o pedido (RLS), MENOS split_snapshot e cobranca_url.
-- Coluna nova no futuro: liberar explicitamente com "grant select (coluna) on public.orders".
revoke select on public.orders from authenticated;
do $$
declare v_colunas text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_colunas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'orders' and column_name not in ('split_snapshot', 'cobranca_url');
  execute format('grant select (%s) on public.orders to authenticated', v_colunas);
end $$;

-- -------------------------------------------------------------------------
-- 2. Estado do SIMULADOR de pagamentos (PAYMENTS_PROVIDER=mock): faz o papel da Lytex
-- -------------------------------------------------------------------------
-- Só o servidor lê e grava. Não é dinheiro: é o status que o simulador "informa".
create table public.simulador_cobrancas (
  provedor_id           text primary key,
  pedido_id             uuid not null references public.orders (id) on delete cascade,
  total_centavos        integer not null check (total_centavos > 0),
  split                 jsonb not null,
  status                text not null default 'pendente'
                          check (status in ('pendente', 'paga', 'recusada', 'expirada', 'estornada', 'chargeback')),
  meio                  text check (meio in ('pix', 'cartao', 'boleto')),
  estorno_solicitado_em timestamptz,
  -- último webhook enviado (para testar a idempotência reenviando o mesmo aviso)
  ultimo_evento         jsonb,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);
create index simulador_cobrancas_pedido_idx on public.simulador_cobrancas (pedido_id);
create trigger simulador_cobrancas_atualizado_em before update on public.simulador_cobrancas
  for each row execute function public.set_atualizado_em();
alter table public.simulador_cobrancas enable row level security;
revoke all on public.simulador_cobrancas from anon, authenticated;
grant select, insert, update on public.simulador_cobrancas to service_role;
comment on table public.simulador_cobrancas is
  'Estado das cobranças do simulador (mock). Sem política de RLS: só o servidor (service_role) acessa.';

-- -------------------------------------------------------------------------
-- 3. Situação da comissão: pendente → liberada/repassada → estornada
-- -------------------------------------------------------------------------
--   aguardando_pagamento → pedido criado, ainda não pago
--   a_receber (PENDENTE) → pago, dentro do prazo de desistência (7 dias do recebimento)
--   repassada (LIBERADA) → pago e prazo encerrado (já repassada pelo split)
--   estornada            → desistência, reembolso ou chargeback
--   cancelada            → pedido cancelado antes de pagar
create or replace function public.situacao_comissao(p_status text, p_arrependimento_ate timestamptz)
returns text language sql stable set search_path = '' as $$
  select case
    when p_status = 'aguardando_pagamento' then 'aguardando_pagamento'
    when p_status = 'cancelado' then 'cancelada'
    when p_status in ('em_reembolso', 'reembolsado', 'chargeback') then 'estornada'
    when p_status = 'pago' and p_arrependimento_ate is not null and p_arrependimento_ate < now() then 'repassada'
    else 'a_receber'
  end;
$$;

-- -------------------------------------------------------------------------
-- 4. Dados do split de um pedido (o cálculo em si é do servidor: calcularSplit)
-- -------------------------------------------------------------------------
-- Devolve quem recebe (id de cada recebedor NO PROVEDOR), os valores-base e a taxa da Staypse.
-- Falha se a loja (ou quem indicou, quando a comissão vai por split) não tiver recebedor
-- aprovado no provedor: melhor não cobrar do que cobrar sem como repassar.
create or replace function public.dados_split_pedido(p_order uuid, p_provedor text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o record; v_dono uuid; v_produtor text; v_indicador text; v_tipo text := 'nenhum'; v_papel text;
  v_forma text; v_pct numeric; v_taxa numeric;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'pedido_inexistente'; end if;

  select p.user_id into v_dono from public.producers p where p.id = o.producer_id;
  select r.provedor_id into v_produtor from public.recebedores r
  where r.user_id = v_dono and r.papel = 'produtor' and r.provedor = p_provedor
    and r.status_recebedor = 'aprovado' and r.provedor_id is not null;
  if v_produtor is null then raise exception 'loja_sem_recebedor'; end if;

  if o.revendedor_id is not null then
    if o.vendedor_id is not null then
      select forma_pagamento into v_forma from public.loja_vendedores where id = o.vendedor_id;
      -- vendedor "na folha": a loja paga fora do split; "split_direto": recebe pelo provedor
      v_tipo := case when v_forma = 'split_direto' then 'vendedor_split' else 'vendedor_folha' end;
      v_papel := 'vendedor';
    else
      v_tipo := 'afiliado'; v_papel := 'afiliado';
    end if;
    if v_tipo <> 'vendedor_folha' then
      select r.provedor_id into v_indicador from public.recebedores r
      where r.user_id = o.revendedor_id and r.papel = v_papel and r.provedor = p_provedor
        and r.status_recebedor = 'aprovado' and r.provedor_id is not null;
      if v_indicador is null then raise exception 'indicador_sem_recebedor'; end if;
    end if;
  end if;

  -- um pedido tem uma só comissão (criar_pedido); max() é exata e evita média com arredondamento
  select coalesce(max(oi.comissao_percentual), 0) into v_pct from public.order_items oi where oi.order_id = p_order;
  select (c.valor #>> '{}')::numeric into v_taxa from public.configuracoes c where c.chave = 'taxa_staypse_percentual';

  return jsonb_build_object(
    'total_centavos', o.total_centavos, 'subtotal_centavos', o.subtotal_centavos, 'frete_centavos', o.frete_centavos,
    'descricao', 'Pedido ' || o.codigo,
    'comissao_percentual', v_pct, 'indicador', v_tipo,
    'produtor_provedor_id', v_produtor, 'indicador_provedor_id', v_indicador,
    'taxa_staypse_percentual', coalesce(v_taxa, 0));
end; $$;
revoke execute on function public.dados_split_pedido(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_split_pedido(uuid, text) to service_role;

-- guarda a referência da cobrança criada no provedor + o snapshot do split (uma vez só)
create or replace function public.registrar_cobranca(
  p_order uuid, p_provedor text, p_cobranca_id text, p_url text, p_snapshot jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
  set cobranca_provedor = p_provedor, cobranca_id = p_cobranca_id, cobranca_url = p_url,
      cobranca_criada_em = now(), split_snapshot = p_snapshot
  where id = p_order and status = 'aguardando_pagamento' and cobranca_id is null;
  if not found then raise exception 'pedido_sem_cobranca_possivel'; end if;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'cobranca_criada', 'pedido', p_order,
          jsonb_build_object('provedor', p_provedor, 'cobranca_id', p_cobranca_id));
end; $$;
revoke execute on function public.registrar_cobranca(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_cobranca(uuid, text, text, text, jsonb) to service_role;

-- -------------------------------------------------------------------------
-- 5. Reembolso: a lógica sai de concluir_reembolso para uma função interna
-- -------------------------------------------------------------------------
-- Interna (ninguém chama de fora): só concluir_reembolso (pedido sem cobrança no provedor)
-- e aplicar_status_cobranca (provedor confirmou o estorno).
create or replace function public.efetivar_reembolso(p_order uuid, p_aceitos text[])
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = 'reembolsado', reembolsado_em = now()
  where id = p_order and status = any (p_aceitos);
  if not found then return false; end if;
  -- o que ainda não tinha saído da loja não sai mais
  update public.order_items set status_entrega = 'cancelado' where order_id = p_order and status_entrega = 'aguardando';
  -- itens que já tinham saído voltam como devolvidos; o estoque do que não saiu volta
  update public.order_items set status_entrega = 'devolvido'
  where order_id = p_order and status_entrega in ('enviado', 'entregue');
  update public.items it set estoque = it.estoque + oi.quantidade
  from public.order_items oi
  where oi.order_id = p_order and oi.item_id = it.id and oi.status_entrega = 'cancelado'
    and it.tipo = 'fisico' and it.estoque is not null;
  return true;
end; $$;
revoke execute on function public.efetivar_reembolso(uuid, text[]) from public, anon, authenticated;

-- reembolso registrado pelo admin: só para pedido SEM cobrança no provedor (anterior ao pagamento
-- pelo provedor). Com cobrança, o estorno é pedido ao provedor e só vale quando ele confirma.
create or replace function public.concluir_reembolso(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if exists (select 1 from public.orders where id = p_order and cobranca_id is not null) then
    raise exception 'reembolso_pelo_provedor';
  end if;
  if not public.efetivar_reembolso(p_order, array['em_reembolso']) then
    raise exception 'pedido_nao_esta_em_reembolso';
  end if;
end; $$;
revoke execute on function public.concluir_reembolso(uuid) from public, anon;
grant execute on function public.concluir_reembolso(uuid) to authenticated;

-- o admin pediu o estorno ao provedor (fica no log; o pedido só muda quando o provedor confirma)
create or replace function public.registrar_estorno_solicitado(p_order uuid, p_ator uuid, p_status_provedor text)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (p_ator, 'estorno_solicitado', 'pedido', p_order, jsonb_build_object('status_provedor', p_status_provedor));
$$;
revoke execute on function public.registrar_estorno_solicitado(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_estorno_solicitado(uuid, uuid, text) to service_role;

-- -------------------------------------------------------------------------
-- 6. APLICAR O STATUS DA COBRANÇA (webhook e conciliação passam por aqui)
-- -------------------------------------------------------------------------
--   paga       → confirma o pedido (baixa estoque, libera digital); já pago = sem efeito
--   recusada / expirada → cancela o pedido que ainda aguardava pagamento
--   estornada  → pedido reembolsado; comissões estornadas
--   chargeback → pedido em 'chargeback'; comissões estornadas; registro em audit_log
--   pendente / estorno_pendente → nada a fazer
-- Devolve o efeito aplicado ('sem_efeito' quando o aviso repetido não muda nada).
create or replace function public.aplicar_status_cobranca(
  p_provedor text, p_cobranca_id text, p_status text, p_pedido uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare o record; v_efeito text := 'sem_efeito';
begin
  if p_status not in ('pendente', 'paga', 'recusada', 'expirada', 'estornada', 'chargeback', 'estorno_pendente') then
    raise exception 'status_cobranca_invalido';
  end if;
  select * into o from public.orders where cobranca_provedor = p_provedor and cobranca_id = p_cobranca_id for update;
  if o.id is null then raise exception 'cobranca_inexistente'; end if;
  if p_pedido is not null and p_pedido <> o.id then raise exception 'cobranca_de_outro_pedido'; end if;

  if p_status = 'paga' then
    if o.status = 'aguardando_pagamento' then
      perform public.confirmar_pagamento(o.id);
      v_efeito := 'confirmado';
    elsif o.status = 'cancelado' then
      -- dinheiro entrou num pedido já cancelado (ex.: pago depois de expirar): não ressuscita; fica para o admin devolver
      v_efeito := 'pago_em_pedido_cancelado';
    end if;
  elsif p_status in ('recusada', 'expirada') then
    if o.status = 'aguardando_pagamento' then
      update public.orders set status = 'cancelado', cancelado_em = now() where id = o.id;
      update public.order_items set status_entrega = 'cancelado' where order_id = o.id;
      v_efeito := 'cancelado';
    end if;
  elsif p_status = 'estornada' then
    if public.efetivar_reembolso(o.id, array['pago', 'em_reembolso']) then v_efeito := 'reembolsado'; end if;
  elsif p_status = 'chargeback' then
    if o.status in ('pago', 'em_reembolso') then
      update public.orders set status = 'chargeback', chargeback_em = now() where id = o.id;
      -- o que não saiu da loja não sai mais, e o estoque volta; o que já saiu fica como está (a loja decide)
      with cancelados as (
        update public.order_items set status_entrega = 'cancelado'
        where order_id = o.id and status_entrega = 'aguardando' returning item_id, quantidade)
      update public.items it set estoque = it.estoque + c.quantidade
      from cancelados c where it.id = c.item_id and it.tipo = 'fisico' and it.estoque is not null;
      v_efeito := 'chargeback';
    end if;
  end if;

  if v_efeito <> 'sem_efeito' then
    insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
    values (null, 'pedido_' || v_efeito, 'pedido', o.id,
            jsonb_build_object('provedor', p_provedor, 'cobranca_id', p_cobranca_id, 'status_cobranca', p_status,
                               'status_antes', o.status, 'total_centavos', o.total_centavos));
  end if;
  return v_efeito;
end; $$;
revoke execute on function public.aplicar_status_cobranca(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.aplicar_status_cobranca(text, text, text, uuid) to service_role;

-- -------------------------------------------------------------------------
-- 7. Conciliação diária: cobranças pendentes há mais de 1 hora (ou em estorno)
-- -------------------------------------------------------------------------
create or replace function public.cobrancas_para_conciliar(p_provedor text, p_minutos integer default 60, p_limite integer default 200)
returns table (pedido_id uuid, cobranca_id text, status_pedido text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.cobranca_id, o.status
  from public.orders o
  where o.cobranca_provedor = p_provedor
    and ((o.status = 'aguardando_pagamento' and o.cobranca_criada_em < now() - make_interval(mins => p_minutos))
         or o.status = 'em_reembolso')
  order by o.cobranca_criada_em
  limit greatest(p_limite, 1);
$$;
revoke execute on function public.cobrancas_para_conciliar(text, integer, integer) from public, anon, authenticated;
grant execute on function public.cobrancas_para_conciliar(text, integer, integer) to service_role;

-- resumo de cada conciliação no log de auditoria (imutável)
create or replace function public.registrar_conciliacao(p_resumo jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'conciliacao_cobrancas', 'sistema', '00000000-0000-0000-0000-000000000000', coalesce(p_resumo, '{}'));
$$;
revoke execute on function public.registrar_conciliacao(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_conciliacao(jsonb) to service_role;
