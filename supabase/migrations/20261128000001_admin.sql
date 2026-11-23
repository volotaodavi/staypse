-- =========================================================================
-- Migração 13 — Painel ADMIN completo
-- =========================================================================
--  1. Denúncias (público denuncia por função do servidor; só admin lê e decide);
--  2. Configurações da plataforma (só admin; cada mudança grava antes/depois no log);
--  3. Suspensão de usuários (motivo obrigatório, log antes/depois);
--  4. Contadores e filas da visão geral;
--  5. Lista de espera: resumo para o painel;
--  6. Log de auditoria: leitura filtrada.
-- O log de auditoria continua IMUTÁVEL (gatilhos da migração 12 não mudam) e a
-- restrição de entidades já aceita 'usuario', 'configuracao' e 'denuncia'.

-- -------------------------------------------------------------------------
-- 1. DENÚNCIAS
-- -------------------------------------------------------------------------
create table public.denuncias (
  id            uuid primary key default gen_random_uuid(),
  alvo_tipo     text not null check (alvo_tipo in ('item', 'loja', 'vitrine')),
  alvo_id       uuid not null,
  motivo        text not null check (motivo in ('produto_proibido', 'golpe_ou_fraude', 'conteudo_enganoso',
                                                'direito_autoral', 'conteudo_ofensivo', 'outro')),
  descricao     text not null check (char_length(descricao) between 10 and 1000),
  -- opcional: só para a Staypse poder responder a quem denunciou
  email         text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  -- IP só como hash com segredo (LGPD); serve para limitar abuso
  ip_hash       text not null check (char_length(ip_hash) <= 128),
  status        text not null default 'aberta' check (status in ('aberta', 'procedente', 'improcedente')),
  nota_decisao  text check (char_length(nota_decisao) between 5 and 1000),
  decidido_por  uuid references public.profiles (id) on delete set null,
  decidido_em   timestamptz,
  criado_em     timestamptz not null default now(),
  -- decidida = tem data e nota
  check ((status = 'aberta') = (decidido_em is null))
);
create index denuncias_status_idx on public.denuncias (status, criado_em);
create index denuncias_ip_idx on public.denuncias (ip_hash, criado_em);
create index denuncias_alvo_idx on public.denuncias (alvo_tipo, alvo_id);

alter table public.denuncias enable row level security;
revoke all on public.denuncias from anon, authenticated;
grant select on public.denuncias to authenticated;
create policy "denuncias: só admin lê" on public.denuncias
  for select to authenticated using (public.is_admin());
comment on table public.denuncias is
  'Denúncias de itens, lojas e vitrines. Entram só pela função denunciar() (chamada pelo servidor); só admin lê e decide.';

-- Quem denuncia: o SERVIDOR do site chama (com o hash do IP já calculado). Se
-- anon/authenticated pudessem chamar direto, escolheriam o hash e escapariam
-- do limite. Limite: 5 denúncias por hora por IP; a mesma denúncia do mesmo
-- IP no mesmo alvo em 24 h não duplica.
create or replace function public.denunciar(
  p_alvo_tipo text, p_alvo_id uuid, p_motivo text, p_descricao text, p_email text, p_ip_hash text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_existe boolean;
begin
  if char_length(coalesce(p_ip_hash, '')) = 0 then raise exception 'ip_obrigatorio'; end if;
  if char_length(trim(coalesce(p_descricao, ''))) < 10 then raise exception 'descricao_curta'; end if;

  v_existe := case p_alvo_tipo
    when 'item'    then exists (select 1 from public.items where id = p_alvo_id)
    when 'loja'    then exists (select 1 from public.producers where id = p_alvo_id)
    when 'vitrine' then exists (select 1 from public.storefronts where id = p_alvo_id)
    else false end;
  if not v_existe then raise exception 'alvo_inexistente'; end if;

  -- repetida (mesmo IP, mesmo alvo, 24 h): devolve a anterior
  select id into v_id from public.denuncias
  where ip_hash = p_ip_hash and alvo_tipo = p_alvo_tipo and alvo_id = p_alvo_id
    and criado_em > now() - interval '24 hours'
  limit 1;
  if v_id is not null then return v_id; end if;

  if (select count(*) from public.denuncias
      where ip_hash = p_ip_hash and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'limite_denuncias';
  end if;

  insert into public.denuncias (alvo_tipo, alvo_id, motivo, descricao, email, ip_hash)
  values (p_alvo_tipo, p_alvo_id, p_motivo, trim(p_descricao), nullif(lower(trim(coalesce(p_email, ''))), ''), p_ip_hash)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.denunciar(text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.denunciar(text, uuid, text, text, text, text) to service_role;

create or replace function public.admin_decidir_denuncia(p_id uuid, p_status text, p_nota text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_atual text;
  v_alvo_tipo text;
  v_alvo_id uuid;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if p_status not in ('procedente', 'improcedente') then raise exception 'status_invalido'; end if;
  if char_length(trim(coalesce(p_nota, ''))) < 5 then raise exception 'nota_obrigatoria'; end if;

  select status, alvo_tipo, alvo_id into v_atual, v_alvo_tipo, v_alvo_id
  from public.denuncias where id = p_id for update;
  if v_atual is null then raise exception 'denuncia_inexistente'; end if;
  if v_atual <> 'aberta' then raise exception 'denuncia_ja_decidida'; end if;

  update public.denuncias
  set status = p_status, nota_decisao = trim(p_nota), decidido_por = (select auth.uid()), decidido_em = now()
  where id = p_id;

  perform public.registrar_auditoria('denuncia_decidida', 'denuncia', p_id,
    jsonb_build_object('antes', jsonb_build_object('status', v_atual),
                       'depois', jsonb_build_object('status', p_status),
                       'alvo_tipo', v_alvo_tipo, 'alvo_id', v_alvo_id, 'nota', trim(p_nota)));
end;
$$;
revoke execute on function public.admin_decidir_denuncia(uuid, text, text) from public, anon;
grant execute on function public.admin_decidir_denuncia(uuid, text, text) to authenticated;

-- -------------------------------------------------------------------------
-- 2. CONFIGURAÇÕES
-- -------------------------------------------------------------------------
-- Validação por chave (também vira restrição da tabela: nem o servidor grava valor inválido).
create or replace function public.configuracao_valida(p_chave text, p_valor jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select case
    when p_chave in ('taxa_staypse_percentual', 'comissao_min_percentual', 'comissao_max_percentual') then
      case when jsonb_typeof(p_valor) = 'number' then (p_valor #>> '{}')::numeric between 0 and 100 else false end
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

create table public.configuracoes (
  chave           text primary key,
  valor           jsonb not null,
  atualizado_por  uuid references public.profiles (id) on delete set null,
  atualizado_em   timestamptz not null default now(),
  constraint configuracoes_valor_valido check (public.configuracao_valida(chave, valor))
);
alter table public.configuracoes enable row level security;
revoke all on public.configuracoes from anon, authenticated;
grant select on public.configuracoes to authenticated;
create policy "configuracoes: só admin lê" on public.configuracoes
  for select to authenticated using (public.is_admin());
comment on table public.configuracoes is
  'Regras da plataforma (taxa, faixa de comissão, palavras proibidas, prazo de NF, meios de pagamento). Só admin lê; grava só por admin_salvar_configuracoes().';

-- Valores iniciais. A taxa é um valor de partida a conferir com o contrato da Lytex.
insert into public.configuracoes (chave, valor) values
  ('taxa_staypse_percentual', '5'),
  ('comissao_min_percentual', '10'),
  ('comissao_max_percentual', '70'),
  ('prazo_nf_dias', '5'),
  ('meios_pagamento', '{"pix": true, "cartao": true, "boleto": false}');
insert into public.configuracoes (chave, valor)
select 'palavras_proibidas', coalesce(jsonb_agg(termo order by termo), '[]'::jsonb) from public.palavras_proibidas;

create or replace function public.admin_salvar_configuracoes(p_valores jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_chave text;
  v_valor jsonb;
  v_antes jsonb;
  v_min numeric;
  v_max numeric;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if jsonb_typeof(p_valores) <> 'object' then raise exception 'configuracao_invalida'; end if;

  for v_chave, v_valor in select key, value from jsonb_each(p_valores) loop
    if not public.configuracao_valida(v_chave, v_valor) then
      raise exception 'configuracao_invalida: %', v_chave;
    end if;
  end loop;

  -- faixa coerente: mínimo não pode passar do máximo (usa o valor novo ou o já salvo)
  select coalesce(p_valores -> 'comissao_min_percentual', (select valor from public.configuracoes where chave = 'comissao_min_percentual')),
         coalesce(p_valores -> 'comissao_max_percentual', (select valor from public.configuracoes where chave = 'comissao_max_percentual'))
  into v_antes, v_valor;
  v_min := (v_antes #>> '{}')::numeric;
  v_max := (v_valor #>> '{}')::numeric;
  if v_min > v_max then raise exception 'comissao_min_maior_que_max'; end if;

  for v_chave, v_valor in select key, value from jsonb_each(p_valores) loop
    select valor into v_antes from public.configuracoes where chave = v_chave;
    if v_antes is not distinct from v_valor then continue; end if;

    insert into public.configuracoes (chave, valor, atualizado_por, atualizado_em)
    values (v_chave, v_valor, (select auth.uid()), now())
    on conflict (chave) do update
      set valor = excluded.valor, atualizado_por = excluded.atualizado_por, atualizado_em = excluded.atualizado_em;

    -- a lista de palavras que marca itens para revisão é a tabela palavras_proibidas
    if v_chave = 'palavras_proibidas' then
      delete from public.palavras_proibidas
      where termo <> all (select lower(trim(t)) from jsonb_array_elements_text(v_valor) t);
      insert into public.palavras_proibidas (termo, categoria)
      select distinct lower(trim(t)), 'Definida no admin' from jsonb_array_elements_text(v_valor) t
      on conflict (termo) do nothing;
    end if;

    -- uma entrada no log por chave alterada (id estável por chave)
    perform public.registrar_auditoria('configuracao_alterada', 'configuracao', md5('configuracao:' || v_chave)::uuid,
      jsonb_build_object('chave', v_chave, 'antes', v_antes, 'depois', v_valor));
  end loop;
end;
$$;
revoke execute on function public.admin_salvar_configuracoes(jsonb) from public, anon;
grant execute on function public.admin_salvar_configuracoes(jsonb) to authenticated;

-- Só o que NÃO é sensível pode ser lido por qualquer pessoa (ex.: checkout mostrar meios de pagamento).
-- Taxa da Staypse e palavras proibidas ficam só com o admin.
create or replace function public.configuracoes_publicas()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(chave, valor), '{}'::jsonb)
  from public.configuracoes
  where chave in ('comissao_min_percentual', 'comissao_max_percentual', 'meios_pagamento');
$$;
revoke execute on function public.configuracoes_publicas() from public;
grant execute on function public.configuracoes_publicas() to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 3. USUÁRIOS: suspensão
-- -------------------------------------------------------------------------
-- O usuário NÃO edita estas colunas (a concessão de UPDATE em profiles é por coluna).
alter table public.profiles
  add column suspenso_em      timestamptz,
  add column suspenso_motivo  text check (char_length(suspenso_motivo) between 5 and 500),
  add column suspenso_por     uuid references public.profiles (id) on delete set null,
  add constraint profiles_suspensao_coerente check ((suspenso_em is null) = (suspenso_motivo is null));

create or replace function public.admin_suspender_usuario(p_user uuid, p_suspender boolean, p_motivo text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_suspenso timestamptz;
  v_existe boolean;
  v_motivo text := trim(coalesce(p_motivo, ''));
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  if char_length(v_motivo) < 5 or char_length(v_motivo) > 500 then raise exception 'motivo_obrigatorio'; end if;
  if p_user = (select auth.uid()) then raise exception 'nao_suspende_a_si'; end if;
  if exists (select 1 from public.user_roles where user_id = p_user and papel = 'admin') then
    raise exception 'nao_suspende_admin';
  end if;

  select true, suspenso_em into v_existe, v_suspenso from public.profiles where id = p_user for update;
  if v_existe is null then raise exception 'usuario_inexistente'; end if;
  if p_suspender and v_suspenso is not null then raise exception 'ja_suspenso'; end if;
  if not p_suspender and v_suspenso is null then raise exception 'nao_suspenso'; end if;

  if p_suspender then
    update public.profiles
    set suspenso_em = now(), suspenso_motivo = v_motivo, suspenso_por = (select auth.uid())
    where id = p_user;
  else
    update public.profiles set suspenso_em = null, suspenso_motivo = null, suspenso_por = null where id = p_user;
  end if;

  perform public.registrar_auditoria(case when p_suspender then 'usuario_suspenso' else 'usuario_reativado' end,
    'usuario', p_user,
    jsonb_build_object('antes', jsonb_build_object('suspenso', not p_suspender),
                       'depois', jsonb_build_object('suspenso', p_suspender),
                       'motivo', v_motivo));
end;
$$;
revoke execute on function public.admin_suspender_usuario(uuid, boolean, text) from public, anon;
grant execute on function public.admin_suspender_usuario(uuid, boolean, text) to authenticated;

-- Lista paginada com busca por nome ou e-mail (o e-mail fica em auth.users, que o app não lê direto).
create or replace function public.admin_listar_usuarios(p_busca text default null, p_limite integer default 20, p_offset integer default 0)
returns table (
  id uuid, nome text, email text, papeis text[], criado_em timestamptz,
  suspenso_em timestamptz, suspenso_motivo text, total bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_busca text := '%' || regexp_replace(trim(coalesce(p_busca, '')), '([%_\\])', '\\\1', 'g') || '%';
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return query
  select p.id, p.nome, u.email::text,
         coalesce((select array_agg(r.papel order by r.papel) from public.user_roles r where r.user_id = p.id), '{}'),
         p.criado_em, p.suspenso_em, p.suspenso_motivo,
         count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  where trim(coalesce(p_busca, '')) = '' or p.nome ilike v_busca or u.email ilike v_busca
  order by p.criado_em desc, p.id
  limit least(greatest(p_limite, 1), 100) offset greatest(p_offset, 0);
end;
$$;
revoke execute on function public.admin_listar_usuarios(text, integer, integer) from public, anon;
grant execute on function public.admin_listar_usuarios(text, integer, integer) to authenticated;

-- -------------------------------------------------------------------------
-- 4. FILAS E CONTADORES DA VISÃO GERAL
-- -------------------------------------------------------------------------
-- Pedidos pagos há mais de X dias (configuração prazo_nf_dias) com item sem nota fiscal.
create or replace function public.admin_pedidos_sem_nf()
returns setof uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_dias integer;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  select (valor #>> '{}')::integer into v_dias from public.configuracoes where chave = 'prazo_nf_dias';
  return query
  select o.id from public.orders o
  where o.status = 'pago'
    and o.pago_em < now() - make_interval(days => coalesce(v_dias, 5))
    and exists (select 1 from public.order_items oi
                where oi.order_id = o.id and oi.nota_fiscal_numero is null and oi.status_entrega <> 'cancelado');
end;
$$;
revoke execute on function public.admin_pedidos_sem_nf() from public, anon;
grant execute on function public.admin_pedidos_sem_nf() to authenticated;

create or replace function public.admin_contadores()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return jsonb_build_object(
    'lojas_curadoria',        (select count(*) from public.producers where status_verificacao = 'em_analise'),
    'itens_analise',          (select count(*) from public.items where status_aprovacao = 'em_analise'),
    'recebedores_pendentes',  (select count(*) from public.recebedores where status_recebedor in ('nao_iniciado', 'em_analise')),
    'recebedores_recusados',  (select count(*) from public.recebedores where status_recebedor in ('recusado', 'suspenso')),
    'denuncias_abertas',      (select count(*) from public.denuncias where status = 'aberta'),
    'pedidos_sem_nf',         (select count(*) from public.admin_pedidos_sem_nf()),
    'atendimentos_vencidos',  (select count(*) from public.atendimentos where status = 'aberto' and prazo_ate < now()),
    'erros_24h',              (select count(*) from public.erros_app where criado_em >= now() - interval '24 hours'),
    'prazo_nf_dias',          coalesce((select (valor #>> '{}')::integer from public.configuracoes where chave = 'prazo_nf_dias'), 5)
  );
end;
$$;
revoke execute on function public.admin_contadores() from public, anon;
grant execute on function public.admin_contadores() to authenticated;

-- -------------------------------------------------------------------------
-- 5. LISTA DE ESPERA: resumo
-- -------------------------------------------------------------------------
create or replace function public.admin_lista_espera_resumo(p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return jsonb_build_object(
    'total', (select count(*) from public.waitlist),
    'no_periodo', (select count(*) from public.waitlist where criado_em >= p_inicio and criado_em < p_fim),
    -- por perfil (interesse), desde o começo
    'por_perfil', coalesce((select jsonb_agg(jsonb_build_object('perfil', interesse, 'total', n) order by n desc)
                            from (select interesse, count(*) n from public.waitlist group by interesse) x), '[]'),
    -- crescimento por dia (dia de Brasília), com dias sem inscrição zerados
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object(
               'dia', to_char(d.dia, 'YYYY-MM-DD'),
               'revendedor', coalesce(c.revendedor, 0), 'produtor', coalesce(c.produtor, 0),
               'comprador', coalesce(c.comprador, 0), 'total', coalesce(c.total, 0)) order by d.dia)
      from generate_series((p_inicio at time zone 'America/Sao_Paulo')::date,
                           ((p_fim - interval '1 second') at time zone 'America/Sao_Paulo')::date, interval '1 day') as d(dia)
      left join (
        select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
               count(*) filter (where interesse = 'revendedor') as revendedor,
               count(*) filter (where interesse = 'produtor') as produtor,
               count(*) filter (where interesse = 'comprador') as comprador,
               count(*) as total
        from public.waitlist where criado_em >= p_inicio and criado_em < p_fim group by 1
      ) c on c.dia = d.dia::date), '[]'),
    -- quem mais indicou (código ?ref=), só indicações válidas (outro IP)
    'top_indicadores', coalesce((
      select jsonb_agg(jsonb_build_object('nome', nome, 'codigo', codigo_indicacao, 'perfil', interesse, 'indicacoes', indicacoes)
                       order by indicacoes desc, criado_em)
      from (select nome, codigo_indicacao, interesse, indicacoes, criado_em
            from public.waitlist_com_indicacoes where indicacoes > 0
            order by indicacoes desc, criado_em limit 10) t), '[]')
  );
end;
$$;
revoke execute on function public.admin_lista_espera_resumo(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_lista_espera_resumo(timestamptz, timestamptz) to authenticated;

-- -------------------------------------------------------------------------
-- 6. LOG DE AUDITORIA: ações existentes (para o filtro)
-- -------------------------------------------------------------------------
create or replace function public.admin_acoes_auditoria()
returns setof text
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  return query select distinct a.acao from public.audit_log a order by 1;
end;
$$;
revoke execute on function public.admin_acoes_auditoria() from public, anon;
grant execute on function public.admin_acoes_auditoria() to authenticated;
