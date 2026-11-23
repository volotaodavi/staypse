-- =========================================================================
-- Financeiro do admin geral + admin único
--  1. Só UM e-mail pode ser admin (configuracoes 'admin_email', preenchida pelo servidor
--     a partir de ADMIN_EMAIL; nada fixo no código nem no banco).
--  2. Agregações financeiras da plataforma (SECURITY DEFINER, só admin). A Staypse NUNCA
--     recebe nem repassa dinheiro de terceiros: receitas de loja/afiliado/vendedor aqui
--     são INFORMATIVAS, calculadas do split_snapshot gravado no pedido.
--  3. Registro (antes/depois) do saque do dinheiro PRÓPRIO da Staypse na conta Lytex dela.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. ADMIN ÚNICO
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
    else false end;
$$;

-- só o servidor (service_role, sem usuário logado) mexe no admin_email: nem o admin edita pela tela
create or replace function public.configuracoes_protege_admin_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.chave, old.chave) = 'admin_email' and (select auth.uid()) is not null then
    raise exception 'admin_email_so_pelo_servidor';
  end if;
  return coalesce(new, old);
end; $$;
create trigger configuracoes_protege_admin_email
  before insert or update or delete on public.configuracoes
  for each row execute function public.configuracoes_protege_admin_email();

-- e-mail configurado (minúsculo) ou null
create or replace function public.admin_email_configurado()
returns text language sql stable security definer set search_path = '' as $$
  select lower(c.valor #>> '{}') from public.configuracoes c where c.chave = 'admin_email';
$$;
revoke execute on function public.admin_email_configurado() from public, anon, authenticated;
grant execute on function public.admin_email_configurado() to service_role;

-- O servidor informa o e-mail do admin (ADMIN_EMAIL). Se mudou, quem tinha papel admin e
-- não é mais esse e-mail perde o papel. NÃO concede o papel a ninguém.
create or replace function public.definir_admin_email(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_novo text := lower(trim(coalesce(p_email, ''))); v_antigo text;
begin
  select lower(valor #>> '{}') into v_antigo from public.configuracoes where chave = 'admin_email';
  if v_antigo is not distinct from v_novo then return; end if;
  insert into public.configuracoes (chave, valor) values ('admin_email', to_jsonb(v_novo))
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
  delete from public.user_roles r
  where r.papel = 'admin'
    and not exists (select 1 from auth.users u where u.id = r.user_id and lower(u.email) = v_novo);
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'admin_email_definido', 'sistema', md5('admin_email')::uuid, '{}');
end; $$;
revoke execute on function public.definir_admin_email(text) from public, anon, authenticated;
grant execute on function public.definir_admin_email(text) to service_role;

-- Ninguém ganha papel admin se o e-mail não for o configurado (vale até para o service_role)
create or replace function public.user_roles_admin_unico()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.papel = 'admin' and not exists (
    select 1 from auth.users u
    where u.id = new.user_id and public.admin_email_configurado() is not null
      and lower(u.email) = public.admin_email_configurado()
  ) then
    raise exception 'admin_apenas_o_email_configurado';
  end if;
  return new;
end; $$;
create trigger user_roles_admin_unico
  before insert or update on public.user_roles
  for each row execute function public.user_roles_admin_unico();

-- is_admin: além do papel, o e-mail da conta tem de ser o configurado (quando há um configurado)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles r
    join auth.users u on u.id = r.user_id
    where r.user_id = (select auth.uid()) and r.papel = 'admin'
      and (public.admin_email_configurado() is null or lower(u.email) = public.admin_email_configurado())
  );
$$;

-- -------------------------------------------------------------------------
-- 2. FINANCEIRO (informativo)
-- -------------------------------------------------------------------------
-- pedidos pagos por data de pagamento
create index if not exists orders_pago_em_idx on public.orders (pago_em) where pago_em is not null;
create index if not exists orders_reembolsado_em_idx on public.orders (reembolsado_em) where reembolsado_em is not null;
create index if not exists orders_chargeback_em_idx on public.orders (chargeback_em) where chargeback_em is not null;

-- valor (centavos) de um campo do snapshot do split; 0 quando o pedido não tem snapshot
create or replace function public.fin_snapshot_valor(p_snapshot jsonb, p_campo text)
returns bigint language sql immutable set search_path = '' as $$
  select coalesce(nullif(p_snapshot #>> array['resultado', p_campo], '')::numeric::bigint, 0);
$$;
revoke execute on function public.fin_snapshot_valor(jsonb, text) from public, anon, authenticated;

-- cartões do período. "Vendido" = pedidos pagos (pago_em no período) ainda válidos
-- (pago ou em reembolso); reembolsos e chargebacks pela data do próprio evento.
create or replace function public.admin_fin_resumo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  select jsonb_build_object(
    'pedidos', count(*) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')),
    'gmv_centavos', coalesce(sum(o.total_centavos) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'staypse_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'staypseCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'taxa_meio_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'taxaMeioCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'taxa_meio_informada_pedidos', count(*) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and (o.split_snapshot ->> 'taxaMeioInformada') = 'true'),
    'comissao_afiliados_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'comissaoDevidaCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and o.revendedor_id is not null and o.vendedor_id is null), 0),
    'comissao_vendedores_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'comissaoDevidaCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and o.vendedor_id is not null), 0),
    'liquido_lojas_centavos', coalesce(sum(public.fin_snapshot_valor(o.split_snapshot, 'produtorCentavos')) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')), 0),
    'sem_split', count(*) filter (where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso') and o.split_snapshot is null),
    'reembolsos_qtd', count(*) filter (where o.status = 'reembolsado' and o.reembolsado_em >= p_inicio and o.reembolsado_em < p_fim),
    'reembolsos_centavos', coalesce(sum(o.total_centavos) filter (where o.status = 'reembolsado' and o.reembolsado_em >= p_inicio and o.reembolsado_em < p_fim), 0),
    'chargebacks_qtd', count(*) filter (where o.status = 'chargeback' and o.chargeback_em >= p_inicio and o.chargeback_em < p_fim),
    'chargebacks_centavos', coalesce(sum(o.total_centavos) filter (where o.status = 'chargeback' and o.chargeback_em >= p_inicio and o.chargeback_em < p_fim), 0)
  ) into r
  from public.orders o
  where (o.pago_em >= p_inicio and o.pago_em < p_fim)
     or (o.reembolsado_em >= p_inicio and o.reembolsado_em < p_fim)
     or (o.chargeback_em >= p_inicio and o.chargeback_em < p_fim);
  return r;
end; $$;
revoke execute on function public.admin_fin_resumo(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_fin_resumo(timestamptz, timestamptz) to authenticated;

-- vendido e receita da Staypse por dia (dias de Brasília)
create or replace function public.admin_fin_por_dia(p_inicio timestamptz, p_fim timestamptz)
returns table (dia date, pedidos bigint, gmv_centavos bigint, staypse_centavos bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return query
  select (o.pago_em at time zone 'America/Sao_Paulo')::date, count(*),
         sum(o.total_centavos)::bigint, sum(public.fin_snapshot_valor(o.split_snapshot, 'staypseCentavos'))::bigint
  from public.orders o
  where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')
  group by 1 order by 1;
end; $$;
revoke execute on function public.admin_fin_por_dia(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_fin_por_dia(timestamptz, timestamptz) to authenticated;

-- ranking informativo: p_tipo = loja | afiliado | vendedor. valor_centavos = o que coube à loja
-- (líquido) ou a quem indicou (comissão). total_linhas serve à paginação.
create or replace function public.admin_fin_ranking(
  p_tipo text, p_inicio timestamptz, p_fim timestamptz, p_busca text default null,
  p_limite int default 20, p_offset int default 0)
returns table (nome text, pedidos bigint, vendido_centavos bigint, valor_centavos bigint, total_linhas bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_busca text := nullif(trim(coalesce(p_busca, '')), '');
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if p_tipo not in ('loja', 'afiliado', 'vendedor') then raise exception 'tipo_invalido'; end if;
  if p_limite not between 1 and 5000 or p_offset < 0 then raise exception 'paginacao_invalida'; end if;
  if v_busca is not null then
    v_busca := '%' || replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
  with base as (
    select case p_tipo
             when 'loja' then coalesce(pr.razao_social, 'Não informado')
             when 'afiliado' then coalesce(pf.nome, 'Não informado')
             else coalesce(pv.nome, lv.email, 'Não informado') end as nome,
           case p_tipo when 'loja' then o.producer_id when 'afiliado' then o.revendedor_id else o.vendedor_id end as chave,
           o.total_centavos as total,
           case p_tipo when 'loja' then public.fin_snapshot_valor(o.split_snapshot, 'produtorCentavos')
                       else public.fin_snapshot_valor(o.split_snapshot, 'comissaoDevidaCentavos') end as valor
    from public.orders o
    left join public.producers pr on pr.id = o.producer_id
    left join public.profiles pf on pf.id = o.revendedor_id
    left join public.loja_vendedores lv on lv.id = o.vendedor_id
    left join public.profiles pv on pv.id = lv.user_id
    where o.pago_em >= p_inicio and o.pago_em < p_fim and o.status in ('pago', 'em_reembolso')
      and (p_tipo = 'loja'
           or (p_tipo = 'afiliado' and o.revendedor_id is not null and o.vendedor_id is null)
           or (p_tipo = 'vendedor' and o.vendedor_id is not null))
  ), agrupado as (
    select b.chave, max(b.nome) as nome, count(*)::bigint as pedidos,
           sum(b.total)::bigint as vendido, sum(b.valor)::bigint as valor
    from base b group by b.chave
  )
  select a.nome, a.pedidos, a.vendido, a.valor, count(*) over ()
  from agrupado a
  where v_busca is null or a.nome ilike v_busca escape '\'
  order by a.vendido desc, a.nome
  limit p_limite offset p_offset;
end; $$;
revoke execute on function public.admin_fin_ranking(text, timestamptz, timestamptz, text, int, int) from public, anon;
grant execute on function public.admin_fin_ranking(text, timestamptz, timestamptz, text, int, int) to authenticated;

-- -------------------------------------------------------------------------
-- 3. SAQUE da conta PRÓPRIA da Staypse na Lytex: registro antes e depois + aviso aos admins
-- -------------------------------------------------------------------------
alter table public.notificacoes drop constraint notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'venda_paga', 'pedido_sem_nf', 'desistencia', 'reembolso', 'chargeback',
  'afiliacao_pedida', 'atendimento_novo',
  'afiliacao_aprovada', 'afiliacao_recusada', 'afiliacao_bloqueada',
  'venda_atribuida', 'comissao_estornada',
  'recebedor_aprovado', 'recebedor_recusado', 'recebedor_suspenso',
  'denuncia_nova', 'loja_curadoria', 'saque_staypse'));

-- p_fase: 'antes' (pedido confirmado, antes de chamar a Lytex) ou 'depois' (p_ok + resultado).
-- Devolve o id do registro da fase 'antes' para ligar os dois.
create or replace function public.admin_registrar_saque(p_fase text, p_valor_centavos bigint, p_ok boolean default null, p_resultado text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if p_fase not in ('antes', 'depois') or p_valor_centavos is null or p_valor_centavos < 1 then raise exception 'saque_invalido'; end if;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values ((select auth.uid()), 'saque_staypse_' || p_fase, 'sistema', md5('conta_staypse')::uuid,
          jsonb_build_object('valor_centavos', p_valor_centavos, 'ok', p_ok, 'resultado', left(p_resultado, 200)))
  returning id into v_id;
  if p_fase = 'depois' then
    perform public.notificar_admins('saque_staypse',
      case when p_ok then 'Saque da conta Staypse solicitado' else 'Saque da conta Staypse não concluído' end,
      case when p_ok then 'O pedido de saque foi enviado à Lytex. Acompanhe a aprovação no painel da Lytex.'
           else 'A Lytex não aceitou o pedido de saque. Veja o log de auditoria.' end,
      '/admin/financeiro');
  end if;
  return v_id;
end; $$;
revoke execute on function public.admin_registrar_saque(text, bigint, boolean, text) from public, anon;
grant execute on function public.admin_registrar_saque(text, bigint, boolean, text) to authenticated;
