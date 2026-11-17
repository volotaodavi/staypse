-- =========================================================================
-- Etapa 4 — complemento:
--   A. Vendedores próprios da loja (convite, comissão "conforme contrato",
--      forma de pagamento, histórico de alterações, desativação)
--   B. Identidade visual da loja (cores, fonte, layout)
--   C. Vitrine do afiliado: padrão Staypse ou cores próprias
--   + Links curtos /@afiliado/produto: slug do produto único POR LOJA e
--     abertura do link com clique + atribuição (último clique vence)
-- Nada de pagamento aqui: a Etapa 6 lê forma_pagamento e a comissão no split.
-- =========================================================================

-- 0. Papel novo: vendedor_proprio -------------------------------------------
-- Só é dado pelo aceite do convite (função abaixo); ninguém escolhe sozinho.
alter table public.user_roles drop constraint if exists user_roles_papel_check;
alter table public.user_roles
  add constraint user_roles_papel_check check (papel in ('produtor', 'revendedor', 'admin', 'vendedor_proprio'));

-- 1. Slug do produto: curto, sem acento, único DENTRO da loja ----------------
-- Gera "tenis-runner"; se a loja já usa, "tenis-runner-2", "-3"...
create or replace function public.slug_livre_na_loja(p_producer uuid, p_base text, p_item uuid)
returns text language plpgsql stable set search_path = '' as $$
declare v_base text; v_slug text; n int := 1;
begin
  v_base := trim(both '-' from left(coalesce(public.gerar_slug(p_base), ''), 50));
  if v_base = '' then v_base := 'produto'; end if;
  v_slug := v_base;
  while exists (select 1 from public.items
                where producer_id = p_producer and slug = v_slug and id is distinct from p_item) loop
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;
  return v_slug;
end; $$;
revoke execute on function public.slug_livre_na_loja(uuid, text, uuid) from public, anon, authenticated;

-- security definer: precisa ver os itens da loja toda (e chamar slug_livre_na_loja)
create or replace function public.items_gera_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slug_livre_na_loja(new.producer_id, new.nome, new.id);
  end if;
  return new;
end; $$;

alter table public.items drop constraint if exists items_slug_key;
alter table public.items drop constraint if exists items_slug_check;
-- itens que já existiam trocam o slug longo (com sufixo) pelo curto
alter table public.items alter column slug drop not null;
update public.items set slug = null;
do $$
declare r record;
begin
  for r in select id, producer_id, nome from public.items order by criado_em loop
    update public.items set slug = public.slug_livre_na_loja(r.producer_id, r.nome, r.id) where id = r.id;
  end loop;
end $$;
alter table public.items
  alter column slug set not null,
  add constraint items_slug_check check (slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'),
  add constraint items_slug_por_loja unique (producer_id, slug);

-- a loja pode editar o endereço do produto
grant insert (slug) on public.items to authenticated;
grant update (slug) on public.items to authenticated;

-- 2. Loja: endereço automático + identidade visual -----------------------------
alter table public.producers
  add column loja_cor_principal text check (loja_cor_principal ~ '^#[0-9a-f]{6}$'),
  add column loja_cor_destaque  text check (loja_cor_destaque ~ '^#[0-9a-f]{6}$'),
  add column loja_fonte         text check (loja_fonte in ('inter', 'outfit', 'dm_sans', 'playfair', 'space_grotesk')),
  add column loja_layout        text check (loja_layout in ('grade', 'destaque', 'lista'));

-- Ao aprovar o produtor, se ele ainda não escolheu, a loja ganha um endereço
-- (os links curtos sempre levam para dentro do site da loja).
create or replace function public.producers_gera_loja_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_base text; v_slug text; n int := 1;
begin
  if new.status_verificacao = 'aprovado' and new.loja_slug is null then
    v_base := trim(both '-' from left(coalesce(public.gerar_slug(new.razao_social), ''), 36));
    if char_length(v_base) < 3 then v_base := 'loja-' || substr(replace(new.id::text, '-', ''), 1, 6); end if;
    v_slug := v_base;
    while public.slug_reservado(v_slug)
          or exists (select 1 from public.producers where loja_slug = v_slug and id <> new.id) loop
      n := n + 1;
      v_slug := v_base || '-' || n;
    end loop;
    new.loja_slug := v_slug;
  end if;
  return new;
end; $$;
revoke execute on function public.items_gera_slug() from public, anon, authenticated;
revoke execute on function public.producers_gera_loja_slug() from public, anon, authenticated;
create trigger producers_gera_loja_slug before insert or update of status_verificacao on public.producers
  for each row execute function public.producers_gera_loja_slug();
update public.producers set status_verificacao = status_verificacao where status_verificacao = 'aprovado';

drop function if exists public.salvar_minha_loja(text, text, text, text);
create or replace function public.salvar_minha_loja(
  p_slug text, p_nome text, p_descricao text, p_foto text,
  p_cor_principal text, p_cor_destaque text, p_fonte text, p_layout text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.producers where user_id = (select auth.uid());
  if v_id is null then raise exception 'cadastro_inexistente'; end if;
  if nullif(p_foto, '') is not null and not starts_with(p_foto, (select auth.uid())::text || '/') then
    raise exception 'foto_fora_da_pasta';
  end if;
  update public.producers
  set loja_slug = nullif(lower(trim(p_slug)), ''), loja_nome = nullif(trim(p_nome), ''),
      loja_descricao = nullif(trim(p_descricao), ''), loja_foto_path = nullif(p_foto, ''),
      loja_cor_principal = nullif(lower(p_cor_principal), ''), loja_cor_destaque = nullif(lower(p_cor_destaque), ''),
      loja_fonte = nullif(p_fonte, ''), loja_layout = nullif(p_layout, '')
  where id = v_id;
end; $$;
revoke execute on function public.salvar_minha_loja(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.salvar_minha_loja(text, text, text, text, text, text, text, text) to authenticated;

-- Dados públicos da loja: identidade visual + dados do vendedor exigidos no
-- comércio eletrônico (razão social, CNPJ, cidade/UF).
drop function if exists public.loja_publica(text);
create or replace function public.loja_publica(p_slug text)
returns table (id uuid, loja_slug text, loja_nome text, loja_descricao text, loja_foto_path text,
               cor_principal text, cor_destaque text, fonte text, layout text,
               razao_social text, cnpj text, cidade text, uf text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.loja_slug, coalesce(p.loja_nome, p.razao_social), p.loja_descricao, p.loja_foto_path,
         p.loja_cor_principal, p.loja_cor_destaque, p.loja_fonte, p.loja_layout,
         p.razao_social, p.cnpj, p.cidade, p.uf
  from public.producers p where p.loja_slug = p_slug and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.loja_publica(text) from public;
grant execute on function public.loja_publica(text) to anon, authenticated, service_role;

-- Página do produto dentro do site da loja: /loja/[loja]/[produto]
drop function if exists public.item_publico(text);
create or replace function public.produto_da_loja(p_loja text, p_produto text)
returns table (id uuid, slug text, nome text, descricao text, fotos text[], preco_centavos integer,
               tipo text, tipo_digital text, categoria text, prazo_postagem_dias integer, retirada_local boolean)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.descricao, i.fotos, i.preco_centavos, i.tipo, i.tipo_digital,
         i.categoria, i.prazo_postagem_dias, i.retirada_local
  from public.items i join public.producers p on p.id = i.producer_id
  where p.loja_slug = p_loja and i.slug = p_produto
    and i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.produto_da_loja(text, text) from public;
grant execute on function public.produto_da_loja(text, text) to anon, authenticated, service_role;

-- 3. Vitrine do afiliado: padrão Staypse ou "minhas cores" ----------------------
alter table public.storefronts drop constraint if exists storefronts_modelo_visual_check;
update public.storefronts set modelo_visual = 'staypse';
alter table public.storefronts
  alter column modelo_visual set default 'staypse',
  add constraint storefronts_modelo_visual_check check (modelo_visual in ('staypse', 'proprio')),
  add column cor_principal text check (cor_principal ~ '^#[0-9a-f]{6}$'),
  add column foto_path     text check (char_length(foto_path) <= 300);
grant insert (cor_principal, foto_path) on public.storefronts to authenticated;
grant update (cor_principal, foto_path) on public.storefronts to authenticated;

-- vendedor próprio também pode ter vitrine (ou só usar os links)
drop policy if exists "storefronts: revendedor cria a sua" on public.storefronts;
create policy "storefronts: revendedor cria a sua" on public.storefronts
  for insert to authenticated
  with check (revendedor_id = (select auth.uid())
              and (public.tem_papel('revendedor') or public.tem_papel('vendedor_proprio')));

-- 4. Vendedores próprios -----------------------------------------------------
create table public.loja_vendedores (
  id                        uuid primary key default gen_random_uuid(),
  producer_id               uuid not null references public.producers (id) on delete cascade,
  email                     text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and email = lower(email)),
  user_id                   uuid references public.profiles (id) on delete set null,
  -- só o HASH do convite fica guardado; o link em si só a loja vê, uma vez
  convite_token_hash        text unique,
  convite_expira_em         timestamptz,
  -- comissão "conforme contrato" (não usa a comissão pública do item)
  comissao_percentual       numeric(5,2) not null check (comissao_percentual > 0 and comissao_percentual <= 90),
  -- folha: no split a parte do vendedor fica com a loja (a loja paga no salário);
  -- split_direto: só para quem NÃO é empregado (autônomo/MEI com contrato)
  forma_pagamento           text not null default 'folha' check (forma_pagamento in ('folha', 'split_direto')),
  declaracao_nao_empregado  boolean not null default false,
  declaracao_em             timestamptz,
  status                    text not null default 'convidado' check (status in ('convidado', 'ativo', 'desativado')),
  criado_em                 timestamptz not null default now(),
  aceito_em                 timestamptz,
  desativado_em             timestamptz,
  constraint loja_vendedores_split_exige_declaracao
    check (forma_pagamento = 'folha' or declaracao_nao_empregado),
  unique (producer_id, email),
  unique (producer_id, user_id)
);
create index loja_vendedores_user_idx on public.loja_vendedores (user_id);
comment on table public.loja_vendedores is
  'Vendedores da própria loja. A Etapa 6 lê forma_pagamento/comissao_percentual para montar o split.';

alter table public.loja_vendedores enable row level security;
revoke all on public.loja_vendedores from anon, authenticated;
-- leitura: a loja vê os seus; o vendedor vê SÓ o próprio vínculo (nunca os colegas)
grant select (id, producer_id, email, user_id, convite_expira_em, comissao_percentual, forma_pagamento,
              declaracao_nao_empregado, declaracao_em, status, criado_em, aceito_em, desativado_em)
  on public.loja_vendedores to authenticated;
create policy "loja_vendedores: loja, o próprio vendedor ou admin" on public.loja_vendedores
  for select to authenticated
  using (public.eh_dono_produtor(producer_id) or user_id = (select auth.uid()) or public.is_admin());

-- Histórico: quem mudou, quando, valor antigo e novo
create table public.loja_vendedores_historico (
  id            bigint generated always as identity primary key,
  vendedor_id   uuid not null references public.loja_vendedores (id) on delete cascade,
  alterado_por  uuid references public.profiles (id) on delete set null,
  alterado_em   timestamptz not null default now(),
  campo         text not null,
  valor_antigo  text,
  valor_novo    text
);
create index loja_vendedores_historico_idx on public.loja_vendedores_historico (vendedor_id, alterado_em);
alter table public.loja_vendedores_historico enable row level security;
revoke all on public.loja_vendedores_historico from anon, authenticated;
grant select on public.loja_vendedores_historico to authenticated;
create policy "historico: loja ou admin" on public.loja_vendedores_historico
  for select to authenticated
  using (exists (select 1 from public.loja_vendedores v
                 where v.id = vendedor_id and (public.eh_dono_produtor(v.producer_id) or public.is_admin())));

create or replace function public.loja_vendedores_registra_historico()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_quem uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.loja_vendedores_historico (vendedor_id, alterado_por, campo, valor_novo) values
      (new.id, v_quem, 'comissao_percentual', new.comissao_percentual::text),
      (new.id, v_quem, 'forma_pagamento', new.forma_pagamento),
      (new.id, v_quem, 'status', new.status);
    if new.declaracao_nao_empregado then
      insert into public.loja_vendedores_historico (vendedor_id, alterado_por, campo, valor_novo)
      values (new.id, v_quem, 'declaracao_nao_empregado', 'true');
    end if;
    return new;
  end if;
  if new.comissao_percentual is distinct from old.comissao_percentual then
    insert into public.loja_vendedores_historico (vendedor_id, alterado_por, campo, valor_antigo, valor_novo)
    values (new.id, v_quem, 'comissao_percentual', old.comissao_percentual::text, new.comissao_percentual::text);
  end if;
  if new.forma_pagamento is distinct from old.forma_pagamento then
    insert into public.loja_vendedores_historico (vendedor_id, alterado_por, campo, valor_antigo, valor_novo)
    values (new.id, v_quem, 'forma_pagamento', old.forma_pagamento, new.forma_pagamento);
  end if;
  if new.declaracao_nao_empregado is distinct from old.declaracao_nao_empregado then
    insert into public.loja_vendedores_historico (vendedor_id, alterado_por, campo, valor_antigo, valor_novo)
    values (new.id, v_quem, 'declaracao_nao_empregado', old.declaracao_nao_empregado::text, new.declaracao_nao_empregado::text);
  end if;
  if new.status is distinct from old.status then
    insert into public.loja_vendedores_historico (vendedor_id, alterado_por, campo, valor_antigo, valor_novo)
    values (new.id, v_quem, 'status', old.status, new.status);
  end if;
  return new;
end; $$;
revoke execute on function public.loja_vendedores_registra_historico() from public, anon, authenticated;
create trigger loja_vendedores_historico after insert or update on public.loja_vendedores
  for each row execute function public.loja_vendedores_registra_historico();

-- 5. Afiliações: origem (catálogo ou vendedor próprio) ------------------------
alter table public.afiliacoes
  add column origem text not null default 'catalogo' check (origem in ('catalogo', 'vendedor_proprio')),
  add column vendedor_id uuid references public.loja_vendedores (id) on delete set null;
create index afiliacoes_vendedor_idx on public.afiliacoes (vendedor_id);

-- o vínculo de vendedor próprio é da LOJA: o vendedor não apaga (histórico fica)
drop policy if exists "afiliacoes: afiliado cancela a sua" on public.afiliacoes;
create policy "afiliacoes: afiliado cancela a sua" on public.afiliacoes
  for delete to authenticated using (afiliado_id = (select auth.uid()) and origem = 'catalogo');

-- O link curto é /@afiliado/produto: o mesmo afiliado não pode ter dois
-- produtos (de lojas diferentes) com o mesmo endereço.
create or replace function public.endereco_repetido(p_afiliado uuid, p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.afiliacoes a
    join public.items i2 on i2.id = a.item_id
    join public.items i on i.id = p_item
    where a.afiliado_id = p_afiliado and a.status <> 'recusada'
      and i2.slug = i.slug and i2.id <> i.id);
$$;
revoke execute on function public.endereco_repetido(uuid, uuid) from public, anon, authenticated;

create or replace function public.afiliar_se(p_item uuid)
returns table (codigo text, status text)
language plpgsql security definer set search_path = '' as $$
declare v_sf uuid; v_regra text; v_produtor uuid;
begin
  if not public.tem_papel('revendedor') then raise exception 'apenas_revendedor'; end if;
  select id into v_sf from public.storefronts where revendedor_id = (select auth.uid());
  if v_sf is null then raise exception 'crie_sua_vitrine'; end if;
  select i.aprovacao_afiliacao, i.producer_id into v_regra, v_produtor
  from public.items i join public.producers p on p.id = i.producer_id
  where i.id = p_item and i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if v_regra is null then raise exception 'item_indisponivel'; end if;
  if public.eh_dono_produtor(v_produtor) then raise exception 'afiliacao_propria'; end if;
  if public.endereco_repetido((select auth.uid()), p_item) then raise exception 'endereco_repetido'; end if;
  insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status, decidido_em)
  values ((select auth.uid()), v_sf, p_item,
          case v_regra when 'automatica' then 'aprovada' else 'pendente' end,
          case v_regra when 'automatica' then now() end)
  on conflict (afiliado_id, item_id) do nothing;
  return query select a.codigo, a.status from public.afiliacoes a
               where a.afiliado_id = (select auth.uid()) and a.item_id = p_item;
end; $$;

-- Afilia o vendedor próprio (ativo) a TODOS os itens aprovados da loja.
-- p_item: só aquele item (usado quando um item novo é aprovado).
create or replace function public.sincronizar_vendedor(p_vendedor uuid, p_item uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status, decidido_em, origem, vendedor_id)
  select v.user_id, s.id, i.id, 'aprovada', now(), 'vendedor_proprio', v.id
  from public.loja_vendedores v
  join public.storefronts s on s.revendedor_id = v.user_id
  join public.items i on i.producer_id = v.producer_id and i.status_aprovacao = 'aprovado'
  where v.id = p_vendedor and v.status = 'ativo'
    and (p_item is null or i.id = p_item)
    and not public.endereco_repetido(v.user_id, i.id)
  on conflict (afiliado_id, item_id) do update
    set status = 'aprovada', origem = 'vendedor_proprio', vendedor_id = excluded.vendedor_id,
        decidido_em = now();
end; $$;
revoke execute on function public.sincronizar_vendedor(uuid, uuid) from public, anon, authenticated;

-- item aprovado → entra para todos os vendedores próprios ativos da loja
create or replace function public.items_afilia_vendedores()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.status_aprovacao = 'aprovado' and (tg_op = 'INSERT' or old.status_aprovacao is distinct from 'aprovado') then
    for r in select id from public.loja_vendedores where producer_id = new.producer_id and status = 'ativo' loop
      perform public.sincronizar_vendedor(r.id, new.id);
    end loop;
  end if;
  return new;
end; $$;
revoke execute on function public.items_afilia_vendedores() from public, anon, authenticated;
create trigger items_afilia_vendedores after insert or update of status_aprovacao on public.items
  for each row execute function public.items_afilia_vendedores();

-- ---------- funções da LOJA para gerenciar vendedores ----------
create or replace function public.minha_loja_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.producers where user_id = (select auth.uid());
$$;
revoke execute on function public.minha_loja_id() from public, anon;
grant execute on function public.minha_loja_id() to authenticated;

-- Convida (ou gera um link novo para quem ainda não aceitou). Devolve o token
-- UMA vez; no banco fica só o hash. Validade: 14 dias.
create or replace function public.convidar_vendedor(
  p_email text, p_comissao numeric, p_forma text, p_declaracao boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_loja uuid := public.minha_loja_id(); v_token text; v_email text := lower(trim(p_email)); v_status text;
begin
  if v_loja is null then raise exception 'cadastro_inexistente'; end if;
  if p_forma = 'split_direto' and not coalesce(p_declaracao, false) then raise exception 'declaracao_obrigatoria'; end if;
  select status into v_status from public.loja_vendedores where producer_id = v_loja and email = v_email;
  if v_status in ('ativo', 'desativado') then raise exception 'ja_vinculado'; end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.loja_vendedores (producer_id, email, comissao_percentual, forma_pagamento,
                                      declaracao_nao_empregado, declaracao_em, convite_token_hash, convite_expira_em)
  values (v_loja, v_email, p_comissao, p_forma, coalesce(p_declaracao, false),
          case when p_declaracao then now() end,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '14 days')
  on conflict (producer_id, email) do update
    set convite_token_hash = excluded.convite_token_hash, convite_expira_em = excluded.convite_expira_em,
        comissao_percentual = excluded.comissao_percentual, forma_pagamento = excluded.forma_pagamento,
        declaracao_nao_empregado = excluded.declaracao_nao_empregado,
        declaracao_em = coalesce(public.loja_vendedores.declaracao_em, excluded.declaracao_em);
  return v_token;
end; $$;
revoke execute on function public.convidar_vendedor(text, numeric, text, boolean) from public, anon;
grant execute on function public.convidar_vendedor(text, numeric, text, boolean) to authenticated;

create or replace function public.atualizar_vendedor(
  p_vendedor uuid, p_comissao numeric, p_forma text, p_declaracao boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_forma = 'split_direto' and not coalesce(p_declaracao, false) then raise exception 'declaracao_obrigatoria'; end if;
  update public.loja_vendedores
  set comissao_percentual = p_comissao, forma_pagamento = p_forma,
      declaracao_nao_empregado = coalesce(p_declaracao, false),
      declaracao_em = case when p_declaracao and not declaracao_nao_empregado then now()
                           when not coalesce(p_declaracao, false) then null else declaracao_em end
  where id = p_vendedor and producer_id = public.minha_loja_id();
  if not found then raise exception 'vendedor_nao_encontrado'; end if;
end; $$;
revoke execute on function public.atualizar_vendedor(uuid, numeric, text, boolean) from public, anon;
grant execute on function public.atualizar_vendedor(uuid, numeric, text, boolean) to authenticated;

-- Desativar: os links param de atribuir vendas NOVAS; o histórico continua.
create or replace function public.definir_status_vendedor(p_vendedor uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.loja_vendedores
  set status = case when p_ativo then 'ativo' else 'desativado' end,
      desativado_em = case when p_ativo then null else now() end
  where id = p_vendedor and producer_id = public.minha_loja_id() and user_id is not null
    and status <> case when p_ativo then 'ativo' else 'desativado' end;
  if not found then raise exception 'vendedor_nao_encontrado'; end if;
  if p_ativo then perform public.sincronizar_vendedor(p_vendedor); end if;
end; $$;
revoke execute on function public.definir_status_vendedor(uuid, boolean) from public, anon;
grant execute on function public.definir_status_vendedor(uuid, boolean) to authenticated;

-- Lista para a loja (nome e @ do vendedor vêm do perfil/vitrine dele; sem telefone)
create or replace function public.meus_vendedores()
returns table (id uuid, email text, nome text, arroba text, comissao_percentual numeric, forma_pagamento text,
               declaracao_nao_empregado boolean, status text, convite_expira_em timestamptz,
               aceito_em timestamptz, cliques_30d bigint)
language sql stable security definer set search_path = '' as $$
  select v.id, v.email, pr.nome, s.slug, v.comissao_percentual, v.forma_pagamento,
         v.declaracao_nao_empregado, v.status, v.convite_expira_em, v.aceito_em,
         (select count(*) from public.clicks c join public.items i on i.id = c.item_id
          where c.storefront_id = s.id and i.producer_id = v.producer_id
            and c.criado_em > now() - interval '30 days')
  from public.loja_vendedores v
  left join public.profiles pr on pr.id = v.user_id
  left join public.storefronts s on s.revendedor_id = v.user_id
  where v.producer_id = public.minha_loja_id()
  order by v.criado_em;
$$;
revoke execute on function public.meus_vendedores() from public, anon;
grant execute on function public.meus_vendedores() to authenticated;

-- ---------- convite: ver e aceitar ----------
create or replace function public.ver_convite(p_token text)
returns table (loja_nome text, email text, status text, expirado boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.loja_nome, p.razao_social), v.email, v.status, v.convite_expira_em < now()
  from public.loja_vendedores v join public.producers p on p.id = v.producer_id
  where v.convite_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;
revoke execute on function public.ver_convite(text) from public;
grant execute on function public.ver_convite(text) to anon, authenticated;

-- Aceite: só a pessoa logada com O MESMO e-mail do convite.
-- p_slug: o @ dela, se ainda não tiver vitrine (os links precisam dele).
create or replace function public.aceitar_convite(p_token text, p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
declare v record; v_email text; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'precisa_entrar'; end if;
  select * into v from public.loja_vendedores
  where convite_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if v.id is null then raise exception 'convite_invalido'; end if;
  if v.convite_expira_em < now() then raise exception 'convite_expirado'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is distinct from v.email then raise exception 'email_diferente'; end if;
  if public.eh_dono_produtor(v.producer_id) then raise exception 'convite_propria_loja'; end if;

  update public.loja_vendedores
  set user_id = v_uid, status = 'ativo', aceito_em = now(), convite_token_hash = null
  where id = v.id;
  insert into public.user_roles (user_id, papel) values (v_uid, 'vendedor_proprio') on conflict do nothing;
  if not exists (select 1 from public.storefronts where revendedor_id = v_uid) then
    insert into public.storefronts (revendedor_id, slug, nome_exibicao, publicada)
    select v_uid, lower(trim(p_slug)), left(pr.nome, 80), false from public.profiles pr where pr.id = v_uid;
  end if;
  perform public.sincronizar_vendedor(v.id);
end; $$;
revoke execute on function public.aceitar_convite(text, text) from public, anon;
grant execute on function public.aceitar_convite(text, text) to authenticated;

-- O vendedor vê só os PRÓPRIOS vínculos (loja, comissão, forma) — nada dos colegas
-- nem do faturamento da loja.
create or replace function public.meus_vinculos_de_vendedor()
returns table (loja_nome text, loja_slug text, comissao_percentual numeric, forma_pagamento text, status text)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.loja_nome, p.razao_social), p.loja_slug, v.comissao_percentual, v.forma_pagamento, v.status
  from public.loja_vendedores v join public.producers p on p.id = v.producer_id
  where v.user_id = (select auth.uid()) and v.status <> 'convidado';
$$;
revoke execute on function public.meus_vinculos_de_vendedor() from public, anon;
grant execute on function public.meus_vinculos_de_vendedor() to authenticated;

-- 6. Vitrine e catálogo com o novo formato de link ------------------------------
drop function if exists public.itens_da_vitrine(text);
create or replace function public.itens_da_vitrine(p_slug text)
returns table (slug text, nome text, fotos text[], preco_centavos integer, tipo text, produtor_nome text)
language sql stable security definer set search_path = '' as $$
  select i.slug, i.nome, i.fotos, i.preco_centavos, i.tipo, coalesce(p.loja_nome, p.razao_social)
  from public.storefronts s
  join public.afiliacoes a on a.storefront_id = s.id and a.status = 'aprovada'
  join public.items i on i.id = a.item_id and i.status_aprovacao = 'aprovado'
  join public.producers p on p.id = i.producer_id and p.status_verificacao = 'aprovado'
  left join public.loja_vendedores v on v.id = a.vendedor_id
  where s.slug = p_slug and s.publicada and (a.vendedor_id is null or v.status = 'ativo')
  order by a.criado_em;
$$;
revoke execute on function public.itens_da_vitrine(text) from public;
grant execute on function public.itens_da_vitrine(text) to anon, authenticated, service_role;

drop function if exists public.catalogo_afiliados();
create or replace function public.catalogo_afiliados()
returns table (id uuid, slug text, nome text, fotos text[], preco_centavos integer, comissao_percentual numeric,
               tipo text, categoria text, aprovacao_afiliacao text, produtor_nome text, loja_slug text,
               minha_afiliacao_status text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.fotos, i.preco_centavos, i.comissao_percentual, i.tipo, i.categoria,
         i.aprovacao_afiliacao, coalesce(p.loja_nome, p.razao_social), p.loja_slug, a.status
  from public.items i
  join public.producers p on p.id = i.producer_id
  left join public.afiliacoes a on a.item_id = i.id and a.afiliado_id = (select auth.uid())
  where i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado'
  order by i.aprovado_em desc nulls last;
$$;
revoke execute on function public.catalogo_afiliados() from public, anon;
grant execute on function public.catalogo_afiliados() to authenticated;

-- 7. Abrir o link curto /@afiliado/produto ---------------------------------------
-- Chamado pelo servidor (service_role). Devolve para onde redirecionar e se
-- há atribuição. Com atribuição, registra o clique (1 por IP/item a cada 10 min).
-- Sem afiliação aprovada (ou vendedor desativado): leva ao produto SEM atribuir.
create or replace function public.abrir_link_afiliado(
  p_afiliado text, p_produto text, p_ip_hash text, p_origem text, p_registrar boolean)
returns table (loja_slug text, produto_slug text, item_id uuid, afiliado_id uuid, afiliado_slug text,
               atribuido boolean, clique_registrado boolean)
language plpgsql security definer set search_path = '' as $$
declare r record; v_novo boolean := false;
begin
  select p.loja_slug as loja, i.slug as produto, i.id as item, a.afiliado_id as afiliado,
         s.slug as arroba, s.id as sf, a.codigo
  into r
  from public.storefronts s
  join public.afiliacoes a on a.afiliado_id = s.revendedor_id and a.status = 'aprovada'
  join public.items i on i.id = a.item_id and i.slug = p_produto and i.status_aprovacao = 'aprovado'
  join public.producers p on p.id = i.producer_id and p.status_verificacao = 'aprovado' and p.loja_slug is not null
  left join public.loja_vendedores v on v.id = a.vendedor_id
  where s.slug = lower(p_afiliado) and (a.vendedor_id is null or v.status = 'ativo')
  order by a.criado_em desc
  limit 1;

  if r.item is not null then
    if p_registrar and not exists (
        select 1 from public.clicks c
        where c.ip_hash = p_ip_hash and c.item_id = r.item and c.criado_em > now() - interval '10 minutes') then
      insert into public.clicks (storefront_id, item_id, codigo_afiliado, ip_hash, origem)
      values (r.sf, r.item, r.codigo, p_ip_hash, left(nullif(p_origem, ''), 255));
      v_novo := true;
    end if;
    return query select r.loja, r.produto, r.item, r.afiliado, r.arroba, true, v_novo;
    return;
  end if;

  -- sem atribuição: o produto com esse endereço (o mais recente aprovado)
  return query
    select p.loja_slug, i.slug, i.id, null::uuid, null::text, false, false
    from public.items i join public.producers p on p.id = i.producer_id
    where i.slug = p_produto and i.status_aprovacao = 'aprovado'
      and p.status_verificacao = 'aprovado' and p.loja_slug is not null
    order by i.aprovado_em desc nulls last
    limit 1;
end; $$;
revoke execute on function public.abrir_link_afiliado(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.abrir_link_afiliado(text, text, text, text, boolean) to service_role;

-- registrar_clique agora só cuida dos links EXTERNOS da vitrine
drop function if exists public.registrar_clique(text, text, uuid, text, text, text);
create or replace function public.registrar_clique_externo(p_vitrine text, p_link uuid, p_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_sf uuid;
begin
  select l.storefront_id into v_sf
  from public.external_links l join public.storefronts s on s.id = l.storefront_id
  where l.id = p_link and s.slug = p_vitrine and s.publicada;
  if v_sf is null then return false; end if;
  if exists (select 1 from public.clicks
             where ip_hash = p_ip_hash and external_link_id = p_link and criado_em > now() - interval '10 minutes') then
    return false;
  end if;
  insert into public.clicks (storefront_id, external_link_id, ip_hash, origem) values (v_sf, p_link, p_ip_hash, 'vitrine');
  return true;
end; $$;
revoke execute on function public.registrar_clique_externo(text, uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_clique_externo(text, uuid, text) to service_role;

-- 8. Relatório mensal de comissões (para o RH da loja) -----------------------------
-- Uma linha por vendedor próprio. Vendas = pedidos PAGOS no mês feitos pelo
-- vendedor nesta loja; comissão = a gravada em cada item do pedido (a do
-- contrato, na Etapa 6). Antes da Etapa 6 os valores saem zerados.
create or replace function public.relatorio_comissoes(p_mes date)
returns table (nome text, email text, arroba text, forma_pagamento text, comissao_percentual numeric,
               status text, cliques bigint, pedidos bigint, vendido_centavos bigint, comissao_centavos bigint)
language sql stable security definer set search_path = '' as $$
  with periodo as (
    select date_trunc('month', p_mes)::timestamptz as ini,
           (date_trunc('month', p_mes) + interval '1 month')::timestamptz as fim
  )
  select pr.nome, v.email, s.slug, v.forma_pagamento, v.comissao_percentual, v.status,
         (select count(*) from public.clicks c join public.items i on i.id = c.item_id, periodo
          where c.storefront_id = s.id and i.producer_id = v.producer_id
            and c.criado_em >= periodo.ini and c.criado_em < periodo.fim),
         coalesce(vd.pedidos, 0), coalesce(vd.vendido, 0), coalesce(vd.comissao, 0)
  from public.loja_vendedores v
  left join public.profiles pr on pr.id = v.user_id
  left join public.storefronts s on s.revendedor_id = v.user_id
  left join lateral (
    select count(distinct o.id) as pedidos,
           sum(oi.preco_unitario_centavos * oi.quantidade)::bigint as vendido,
           sum(round(oi.preco_unitario_centavos * oi.quantidade * oi.comissao_percentual / 100))::bigint as comissao
    from public.orders o join public.order_items oi on oi.order_id = o.id, periodo
    where o.producer_id = v.producer_id and o.revendedor_id = v.user_id and o.status = 'pago'
      and o.pago_em >= periodo.ini and o.pago_em < periodo.fim
  ) vd on true
  where v.producer_id = public.minha_loja_id() and v.status <> 'convidado'
  order by pr.nome;
$$;
revoke execute on function public.relatorio_comissoes(date) from public, anon;
grant execute on function public.relatorio_comissoes(date) to authenticated;
