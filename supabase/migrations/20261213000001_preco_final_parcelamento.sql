-- =========================================================================
-- Preço final, parcelamento da loja, aviso prévio das taxas e correções do pagamento
-- (docs/precificacao.md, "Decisão final"; docs/seguranca-auditoria.md A2 e M5; docs/qualidade-auditoria.md 2)
--  1. Taxas finais por modalidade + tarifa mínima + pedido mínimo (padrões; só troca o que ainda é o padrão antigo).
--  2. Aviso prévio de 30 dias: a tabela anterior fica guardada e vale até taxas_vigencia_em;
--     todas as lojas recebem notificação; as lojas já aceitaram taxas "com aviso prévio", sem novo aceite.
--  3. Parcelamento é política da LOJA: parcelas_max (1 a 12) e parcelas_sem_juros (1 a parcelas_max).
--  4. Acréscimo do parcelamento guardado no pedido (a fatura vale total + acréscimo) e conferência de valor.
--  5. Pedido cancelado cancela a cobrança no provedor; pagamento tardio em pedido cancelado vira estorno ou fila.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Validação das novas chaves de configuração
-- -------------------------------------------------------------------------
create or replace function public.configuracao_valida(p_chave text, p_valor jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select case
    when p_chave in ('taxa_staypse_percentual', 'comissao_min_percentual', 'comissao_max_percentual') then
      case when jsonb_typeof(p_valor) = 'number' then (p_valor #>> '{}')::numeric between 0 and 100 else false end
    -- e-mail do ÚNICO admin geral (preenchido só pelo servidor, a partir da variável ADMIN_EMAIL)
    when p_chave = 'admin_email' then
      case when jsonb_typeof(p_valor) = 'string' then
        (p_valor #>> '{}') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and (p_valor #>> '{}') = lower(p_valor #>> '{}')
      else false end
    when p_chave = 'prazo_nf_dias' then
      case when jsonb_typeof(p_valor) = 'number' then
        (p_valor #>> '{}')::numeric between 1 and 60 and (p_valor #>> '{}')::numeric = trunc((p_valor #>> '{}')::numeric)
      else false end
    when p_chave = 'palavras_proibidas' then
      case when jsonb_typeof(p_valor) = 'array' then
        jsonb_array_length(p_valor) <= 500
        and not exists (select 1 from jsonb_array_elements(p_valor) e
                        where jsonb_typeof(e) <> 'string' or char_length(trim(e #>> '{}')) not between 2 and 60)
      else false end
    when p_chave = 'meios_pagamento' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 3
        and jsonb_typeof(p_valor -> 'pix') = 'boolean'
        and jsonb_typeof(p_valor -> 'cartao') = 'boolean'
        and jsonb_typeof(p_valor -> 'boleto') = 'boolean'
      else false end
    -- taxa total (cobrada da loja) e custo Lytex por modalidade: percentual (até 2 casas) + fixo em centavos
    when p_chave ~ '^(taxa_total|custo_lytex)_(pix|boleto|cartao_1x|cartao_2a6|cartao_7a12)$' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 2
        and jsonb_typeof(p_valor -> 'percentual') = 'number' and jsonb_typeof(p_valor -> 'fixo_centavos') = 'number'
        and (p_valor ->> 'percentual')::numeric between 0 and 30
        and (p_valor ->> 'percentual')::numeric * 100 = trunc((p_valor ->> 'percentual')::numeric * 100)
        and (p_valor ->> 'fixo_centavos')::numeric between 0 and 2000
        and (p_valor ->> 'fixo_centavos')::numeric = trunc((p_valor ->> 'fixo_centavos')::numeric)
      else false end
    -- cobrança da Lytex por valor repassado: % com mínimo e máximo, em centavos
    when p_chave = 'custo_lytex_split' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 3
        and jsonb_typeof(p_valor -> 'percentual') = 'number'
        and jsonb_typeof(p_valor -> 'minimo_centavos') = 'number' and jsonb_typeof(p_valor -> 'maximo_centavos') = 'number'
        and (p_valor ->> 'percentual')::numeric between 0 and 10
        and (p_valor ->> 'percentual')::numeric * 100 = trunc((p_valor ->> 'percentual')::numeric * 100)
        and (p_valor ->> 'minimo_centavos')::numeric between 0 and 1000
        and (p_valor ->> 'minimo_centavos')::numeric = trunc((p_valor ->> 'minimo_centavos')::numeric)
        and (p_valor ->> 'maximo_centavos')::numeric between (p_valor ->> 'minimo_centavos')::numeric and 5000
        and (p_valor ->> 'maximo_centavos')::numeric = trunc((p_valor ->> 'maximo_centavos')::numeric)
      else false end
    -- tarifa mínima da taxa total e pedido mínimo, em centavos inteiros
    when p_chave in ('taxa_minima_centavos', 'pedido_minimo_centavos') then
      case when jsonb_typeof(p_valor) = 'number' then
        (p_valor #>> '{}')::numeric between 0 and 5000 and (p_valor #>> '{}')::numeric = trunc((p_valor #>> '{}')::numeric)
      else false end
    -- início da vigência da tabela de taxas nova (texto ISO 8601, ex.: 2026-12-24T12:00:00Z)
    when p_chave = 'taxas_vigencia_em' then
      case when jsonb_typeof(p_valor) = 'string' then
        (p_valor #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
      else false end
    -- tabela de taxas anterior, que vale até a vigência: as 5 modalidades, cada uma com percentual e fixo
    when p_chave = 'taxas_anteriores' then
      case when jsonb_typeof(p_valor) = 'object' then
        (select count(*) from jsonb_object_keys(p_valor)) = 5
        and p_valor ?& array['pix', 'boleto', 'cartao_1x', 'cartao_2a6', 'cartao_7a12']
        and not exists (
          select 1 from jsonb_each(p_valor) e
          where jsonb_typeof(e.value) <> 'object'
             or (select count(*) from jsonb_object_keys(e.value)) <> 2
             or jsonb_typeof(e.value -> 'percentual') is distinct from 'number'
             or jsonb_typeof(e.value -> 'fixo_centavos') is distinct from 'number')
        and not exists (
          select 1 from jsonb_each(p_valor) e
          where (e.value ->> 'percentual')::numeric not between 0 and 30
             or (e.value ->> 'percentual')::numeric * 100 <> trunc((e.value ->> 'percentual')::numeric * 100)
             or (e.value ->> 'fixo_centavos')::numeric not between 0 and 2000
             or (e.value ->> 'fixo_centavos')::numeric <> trunc((e.value ->> 'fixo_centavos')::numeric))
      else false end
    else false end;
$$;

-- -------------------------------------------------------------------------
-- 2. Tipos de notificação novos (taxas novas; pagamento tardio e divergente, só para admins)
-- -------------------------------------------------------------------------
alter table public.notificacoes drop constraint notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'venda_paga', 'pedido_sem_nf', 'desistencia', 'reembolso', 'chargeback',
  'afiliacao_pedida', 'atendimento_novo',
  'afiliacao_aprovada', 'afiliacao_recusada', 'afiliacao_bloqueada',
  'venda_atribuida', 'comissao_estornada',
  'recebedor_aprovado', 'recebedor_recusado', 'recebedor_suspenso',
  'denuncia_nova', 'loja_curadoria', 'saque_staypse',
  'taxas_novas', 'pagamento_tardio', 'pagamento_divergente'));

-- notificar(): igual à anterior; aviso de taxas novas e alertas de pagamento também geram e-mail (não há preferência a desligar)
create or replace function public.notificar(
  p_user uuid, p_tipo text, p_titulo text, p_texto text, p_link text default null, p_chave text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email boolean := false; v_pref record;
begin
  if p_user is null then return; end if;
  -- e-mail só nos eventos importantes e se a pessoa não desligou (sem preferência salva = ligado)
  if p_tipo in ('venda_paga', 'recebedor_recusado', 'recebedor_suspenso', 'comissao_estornada') then
    select * into v_pref from public.preferencias_notificacao where user_id = p_user;
    v_email := case p_tipo
      when 'venda_paga' then coalesce(v_pref.email_venda, true)
      when 'comissao_estornada' then coalesce(v_pref.email_estorno, true)
      else coalesce(v_pref.email_recebedor, true) end;
  elsif p_tipo in ('taxas_novas', 'pagamento_tardio', 'pagamento_divergente') then
    v_email := true;
  end if;
  insert into public.notificacoes (user_id, tipo, titulo, texto, link, chave, email_pendente)
  values (p_user, p_tipo, left(p_titulo, 120), left(p_texto, 400), p_link, p_chave, v_email)
  on conflict (user_id, chave) where chave is not null do nothing;
end; $$;
revoke execute on function public.notificar(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.notificar(uuid, text, text, text, text, text) to service_role;

-- -------------------------------------------------------------------------
-- 3. Taxas finais, guardando a tabela anterior (vale até a vigência)
-- -------------------------------------------------------------------------
-- tabela ANTERIOR = o que está em vigor hoje (padrão antigo ou o que o admin ajustou)
insert into public.configuracoes (chave, valor)
select 'taxas_anteriores',
       jsonb_object_agg(substr(chave, 12), valor)
from public.configuracoes
where chave in ('taxa_total_pix', 'taxa_total_boleto', 'taxa_total_cartao_1x', 'taxa_total_cartao_2a6', 'taxa_total_cartao_7a12')
having count(*) = 5
on conflict (chave) do nothing;

-- padrões novos: só troca quem ainda está no padrão antigo (o que o admin ajustou à mão continua como está)
update public.configuracoes c set valor = n.valor, atualizado_em = now()
from (values
  ('taxa_total_pix',         '{"percentual": 1.5, "fixo_centavos": 230}'::jsonb, '{"percentual": 1.5, "fixo_centavos": 200}'::jsonb),
  ('taxa_total_boleto',      '{"percentual": 1.5, "fixo_centavos": 260}'::jsonb, '{"percentual": 1.5, "fixo_centavos": 230}'::jsonb),
  ('taxa_total_cartao_1x',   '{"percentual": 5.6, "fixo_centavos": 80}'::jsonb,  '{"percentual": 4.9, "fixo_centavos": 50}'::jsonb),
  ('taxa_total_cartao_2a6',  '{"percentual": 6.2, "fixo_centavos": 80}'::jsonb,  '{"percentual": 5.5, "fixo_centavos": 50}'::jsonb),
  ('taxa_total_cartao_7a12', '{"percentual": 6.8, "fixo_centavos": 80}'::jsonb,  '{"percentual": 6.1, "fixo_centavos": 50}'::jsonb)
) as n (chave, valor, antigo)
where c.chave = n.chave and c.valor = n.antigo;

insert into public.configuracoes (chave, valor) values
  ('taxa_minima_centavos', '250'),
  ('pedido_minimo_centavos', '1000'),
  -- 30 dias depois da publicação (esta migração); o admin pode ajustar em configuracoes
  ('taxas_vigencia_em', to_jsonb(to_char((now() + interval '30 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
on conflict (chave) do nothing;

-- Taxas em vigor AGORA: até a vigência, a tabela anterior (e sem tarifa/pedido mínimo); depois, a nova.
-- Usada por dados_split_pedido e pelo checkout (service_role), nunca exposta a usuário comum.
create or replace function public.taxas_vigentes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_vig timestamptz; v_ant jsonb; r jsonb;
begin
  select (valor #>> '{}')::timestamptz into v_vig from public.configuracoes where chave = 'taxas_vigencia_em';
  select valor into v_ant from public.configuracoes where chave = 'taxas_anteriores';
  select coalesce(jsonb_object_agg(
           c.chave,
           case
             when v_vig is not null and v_vig > now() and v_ant is not null and left(c.chave, 11) = 'taxa_total_' and v_ant ? substr(c.chave, 12)
               then v_ant -> substr(c.chave, 12)
             when v_vig is not null and v_vig > now() and c.chave in ('taxa_minima_centavos', 'pedido_minimo_centavos')
               then to_jsonb(0)
             else c.valor
           end), '{}'::jsonb)
    into r
  from public.configuracoes c
  where left(c.chave, 11) = 'taxa_total_' or left(c.chave, 12) = 'custo_lytex_'
     or c.chave in ('taxa_minima_centavos', 'pedido_minimo_centavos');
  return r;
end; $$;
revoke execute on function public.taxas_vigentes() from public, anon, authenticated;
grant execute on function public.taxas_vigentes() to service_role;

-- -------------------------------------------------------------------------
-- 4. Parcelamento é política da loja
-- -------------------------------------------------------------------------
alter table public.producers
  add column parcelas_max smallint not null default 12 check (parcelas_max between 1 and 12),
  add column parcelas_sem_juros smallint not null default 3 check (parcelas_sem_juros >= 1),
  add constraint producers_parcelas_coerentes check (parcelas_sem_juros between 1 and parcelas_max);
-- (sem grant de update por coluna: a loja só muda pela função abaixo)

create or replace function public.salvar_parcelamento(p_max integer, p_sem_juros integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_antes jsonb;
begin
  if p_max is null or p_max not between 1 and 12 then raise exception 'parcelas_invalidas'; end if;
  if p_sem_juros is null or p_sem_juros not between 1 and p_max then raise exception 'parcelas_sem_juros_invalidas'; end if;
  select id, jsonb_build_object('parcelas_max', parcelas_max, 'parcelas_sem_juros', parcelas_sem_juros) into v_id, v_antes
  from public.producers where user_id = (select auth.uid()) and status_verificacao <> 'suspenso' for update;
  if v_id is null then raise exception 'loja_indisponivel'; end if;
  update public.producers set parcelas_max = p_max, parcelas_sem_juros = p_sem_juros where id = v_id;
  perform public.registrar_auditoria('parcelamento_alterado', 'producer', v_id,
    jsonb_build_object('antes', v_antes, 'depois', jsonb_build_object('parcelas_max', p_max, 'parcelas_sem_juros', p_sem_juros)));
end; $$;
revoke execute on function public.salvar_parcelamento(integer, integer) from public, anon;
grant execute on function public.salvar_parcelamento(integer, integer) to authenticated;

-- política de parcelas da loja DONA do produto (informação pública: a página do produto mostra "até Nx sem juros")
create or replace function public.politica_parcelas_item(p_item uuid)
returns table (parcelas_max integer, parcelas_sem_juros integer)
language sql stable security definer set search_path = '' as $$
  select p.parcelas_max::integer, p.parcelas_sem_juros::integer
  from public.items i join public.producers p on p.id = i.producer_id
  where i.id = p_item;
$$;
revoke execute on function public.politica_parcelas_item(uuid) from public;
grant execute on function public.politica_parcelas_item(uuid) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 5. Dados do split: taxas em vigor (com a tarifa mínima) e a política da loja
-- -------------------------------------------------------------------------
create or replace function public.dados_split_pedido(p_order uuid, p_provedor text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  o record; v_dono uuid; v_produtor text; v_indicador text; v_tipo text := 'nenhum'; v_papel text;
  v_forma text; v_pct numeric; v_pol record;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'pedido_inexistente'; end if;

  select p.user_id, p.parcelas_max, p.parcelas_sem_juros into v_pol from public.producers p where p.id = o.producer_id;
  v_dono := v_pol.user_id;
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

  return jsonb_build_object(
    'total_centavos', o.total_centavos, 'subtotal_centavos', o.subtotal_centavos, 'frete_centavos', o.frete_centavos,
    'descricao', 'Pedido ' || o.codigo,
    'comissao_percentual', v_pct, 'indicador', v_tipo,
    'produtor_provedor_id', v_produtor, 'indicador_provedor_id', v_indicador,
    -- taxa total, custo Lytex, repasse e tarifa mínima EM VIGOR (INTERNO: só o servidor, via service_role)
    'taxas', public.taxas_vigentes(),
    'politica', jsonb_build_object('parcelas_max', v_pol.parcelas_max, 'parcelas_sem_juros', v_pol.parcelas_sem_juros));
end; $$;
revoke execute on function public.dados_split_pedido(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_split_pedido(uuid, text) to service_role;

-- -------------------------------------------------------------------------
-- 6. Pedido: acréscimo do parcelamento, cancelamento da cobrança e pagamento tardio
-- -------------------------------------------------------------------------
alter table public.orders
  add column cobranca_acrescimo_centavos integer not null default 0 check (cobranca_acrescimo_centavos >= 0),
  add column cobranca_cancelada_em       timestamptz,
  add column pagamento_tardio_em         timestamptz;
-- (sem "grant select": as colunas novas só o servidor lê)

drop function public.registrar_cobranca(uuid, text, text, text, jsonb, text, integer, jsonb);
create function public.registrar_cobranca(
  p_order uuid, p_provedor text, p_cobranca_id text, p_url text, p_snapshot jsonb,
  p_meio text default null, p_parcelas integer default null, p_pagamento jsonb default null,
  p_acrescimo integer default 0)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
  set cobranca_provedor = p_provedor, cobranca_id = p_cobranca_id, cobranca_url = p_url,
      cobranca_criada_em = now(), split_snapshot = p_snapshot,
      cobranca_meio = p_meio, cobranca_parcelas = p_parcelas, cobranca_pagamento = p_pagamento,
      cobranca_acrescimo_centavos = coalesce(p_acrescimo, 0)
  where id = p_order and status = 'aguardando_pagamento' and cobranca_id is null;
  if not found then raise exception 'pedido_sem_cobranca_possivel'; end if;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'cobranca_criada', 'pedido', p_order,
          jsonb_build_object('provedor', p_provedor, 'cobranca_id', p_cobranca_id, 'meio', p_meio, 'parcelas', p_parcelas,
                             'acrescimo_centavos', coalesce(p_acrescimo, 0)));
end; $$;
revoke execute on function public.registrar_cobranca(uuid, text, text, text, jsonb, text, integer, jsonb, integer) from public, anon, authenticated;
grant execute on function public.registrar_cobranca(uuid, text, text, text, jsonb, text, integer, jsonb, integer) to service_role;

-- pedidos cancelados (comprador desistiu ou venceu o prazo) cuja cobrança ainda está aberta no provedor
create or replace function public.cobrancas_para_cancelar(p_provedor text, p_limite integer default 100)
returns table (pedido_id uuid, cobranca_id text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.cobranca_id from public.orders o
  where o.status = 'cancelado' and o.cobranca_provedor = p_provedor and o.cobranca_id is not null
    and o.cobranca_cancelada_em is null and o.pagamento_tardio_em is null
  order by o.cancelado_em nulls first
  limit greatest(p_limite, 1);
$$;
revoke execute on function public.cobrancas_para_cancelar(text, integer) from public, anon, authenticated;
grant execute on function public.cobrancas_para_cancelar(text, integer) to service_role;

create or replace function public.registrar_cobranca_cancelada(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set cobranca_cancelada_em = now() where id = p_order and cobranca_cancelada_em is null;
  if found then
    insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
    values (null, 'cobranca_cancelada_no_provedor', 'pedido', p_order, jsonb_build_object('status_provedor', p_status));
  end if;
end; $$;
revoke execute on function public.registrar_cobranca_cancelada(uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_cobranca_cancelada(uuid, text) to service_role;

-- a conciliação também olha pedidos cancelados nos últimos 7 dias cuja cobrança NÃO foi cancelada no provedor
-- (pagamento que chegou antes do cancelamento ou cancelamento que falhou); cancelada no provedor = não pode mais ser paga
create or replace function public.cobrancas_para_conciliar(p_provedor text, p_minutos integer default 60, p_limite integer default 200)
returns table (pedido_id uuid, cobranca_id text, status_pedido text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.cobranca_id, o.status
  from public.orders o
  where o.cobranca_provedor = p_provedor
    and ((o.status = 'aguardando_pagamento' and o.cobranca_criada_em < now() - make_interval(mins => p_minutos))
         or o.status = 'em_reembolso'
         or (o.status = 'cancelado' and o.cobranca_id is not null and o.pagamento_tardio_em is null
             and o.cobranca_cancelada_em is null and o.cancelado_em > now() - interval '7 days'))
  order by o.cobranca_criada_em
  limit greatest(p_limite, 1);
$$;
revoke execute on function public.cobrancas_para_conciliar(text, integer, integer) from public, anon, authenticated;
grant execute on function public.cobrancas_para_conciliar(text, integer, integer) to service_role;

-- Pagamento tardio (entrou dinheiro em pedido cancelado): `iniciar` reserva o tratamento (true só na 1ª vez, então o
-- estorno nunca é pedido duas vezes); `registrar` grava o resultado e, se o estorno automático falhou, avisa os admins.
create or replace function public.iniciar_pagamento_tardio(p_order uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set pagamento_tardio_em = now() where id = p_order and status = 'cancelado' and pagamento_tardio_em is null;
  return found;
end; $$;
revoke execute on function public.iniciar_pagamento_tardio(uuid) from public, anon, authenticated;
grant execute on function public.iniciar_pagamento_tardio(uuid) to service_role;

create or replace function public.registrar_pagamento_tardio(p_order uuid, p_resultado text, p_detalhe text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_codigo text;
begin
  if p_resultado not in ('estorno_solicitado', 'fila_admin') then raise exception 'resultado_invalido'; end if;
  select codigo into v_codigo from public.orders where id = p_order;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'pagamento_tardio_' || p_resultado, 'pedido', p_order, jsonb_build_object('detalhe', left(coalesce(p_detalhe, ''), 300)));
  if p_resultado = 'fila_admin' then
    perform public.notificar_admins('pagamento_tardio', 'Pagamento em pedido cancelado',
      'O pedido ' || coalesce(v_codigo, '') || ' foi pago depois de cancelado e o estorno automático falhou. Devolva o valor ao comprador.',
      '/admin/pedidos');
  end if;
end; $$;
revoke execute on function public.registrar_pagamento_tardio(uuid, text, text) from public, anon, authenticated;
grant execute on function public.registrar_pagamento_tardio(uuid, text, text) to service_role;

-- fila do admin: pagamentos tardios e o resultado do último tratamento
create or replace function public.admin_pagamentos_tardios()
returns table (pedido_id uuid, codigo text, total_centavos integer, pago_tardio_em timestamptz, resultado text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return query
    select o.id, o.codigo, o.total_centavos, o.pagamento_tardio_em,
           coalesce((select substr(a.acao, 18) from public.audit_log a
                     where a.entidade = 'pedido' and a.entidade_id = o.id and a.acao like 'pagamento\_tardio\_%'
                     order by a.id desc limit 1), 'sem_resultado')
    from public.orders o
    where o.pagamento_tardio_em is not null
    order by o.pagamento_tardio_em desc;
end; $$;
revoke execute on function public.admin_pagamentos_tardios() from public, anon;
grant execute on function public.admin_pagamentos_tardios() to authenticated;

-- pagamento que NÃO bateu com o valor esperado: não confirma o pedido; fica no log e avisa os admins
create or replace function public.registrar_pagamento_divergente(p_order uuid, p_detalhes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_codigo text;
begin
  select codigo into v_codigo from public.orders where id = p_order;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'pagamento_divergente', 'pedido', p_order, coalesce(p_detalhes, '{}'));
  perform public.notificar_admins('pagamento_divergente', 'Pagamento com valor diferente do pedido',
    'O pedido ' || coalesce(v_codigo, '') || ' recebeu um aviso de pagamento que não bate com o valor cobrado. Não foi confirmado.',
    '/admin/pedidos');
end; $$;
revoke execute on function public.registrar_pagamento_divergente(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_pagamento_divergente(uuid, jsonb) to service_role;

-- -------------------------------------------------------------------------
-- 7. Aviso prévio das taxas: notificação para todas as lojas e aviso no painel
-- -------------------------------------------------------------------------
-- Notifica TODAS as lojas (uma vez por vigência: chave estável). Sem novo aceite: o contrato já prevê o aviso de 30 dias.
create or replace function public.anunciar_novas_taxas()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_vig timestamptz; v_data text; v_n integer := 0; p record;
begin
  select (valor #>> '{}')::timestamptz into v_vig from public.configuracoes where chave = 'taxas_vigencia_em';
  if v_vig is null then return 0; end if;
  v_data := to_char(v_vig at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  for p in select user_id from public.producers loop
    perform public.notificar(p.user_id, 'taxas_novas', 'Novas taxas a partir de ' || v_data,
      'Atualizamos as taxas por meio de pagamento. Até ' || v_data || ' seguem as taxas atuais; depois valem as novas. '
      || 'Veja a tabela completa. Nenhuma ação é necessária.',
      '/taxas', 'taxas_novas:' || to_char(v_vig at time zone 'UTC', 'YYYYMMDD"T"HH24MISS'));
    v_n := v_n + 1;
  end loop;
  return v_n;
end; $$;
revoke execute on function public.anunciar_novas_taxas() from public, anon, authenticated;
grant execute on function public.anunciar_novas_taxas() to service_role;

select public.anunciar_novas_taxas();

-- Aviso no painel da loja: data de vigência, enquanto não passou (e até 7 dias depois, como "em vigor desde").
create or replace function public.aviso_taxas_loja()
returns table (vigencia_em timestamptz, em_vigor boolean)
language sql stable security definer set search_path = '' as $$
  select v.em, v.em <= now()
  from (select (c.valor #>> '{}')::timestamptz as em from public.configuracoes c where c.chave = 'taxas_vigencia_em') v
  where exists (select 1 from public.producers p where p.user_id = (select auth.uid()))
    and v.em > now() - interval '7 days';
$$;
revoke execute on function public.aviso_taxas_loja() from public, anon;
grant execute on function public.aviso_taxas_loja() to authenticated;
