-- =========================================================================
-- STAYPSE — Etapa 4: vitrines e afiliação
-- =========================================================================
-- Aplicar depois de 20261119000001_endurece_funcoes.sql.
--  * Loja pública do produtor (/loja/[slug]).
--  * Item ganha slug (/p/[slug]) e a regra "aprovação automática ou manual".
--  * Afiliações com código curto (link /p/[slug]?a=[código]).
--  * Cliques só pelo servidor, IP em hash, 1 por IP/item a cada 10 min.
--  * Público = só item APROVADO de produtor APROVADO (item que sai de
--    "aprovado" some sozinho de todas as vitrines).
-- =========================================================================

-- 0. Utilitários ----------------------------------------------------------
create or replace function public.gerar_slug(texto text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(public.sem_acento(coalesce(texto, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.slug_reservado(s text)
returns boolean language sql immutable set search_path = '' as $$
  select s = any (array[
    'admin','api','auth','entrar','sair','cadastro','cadastrar','conta',
    'painel','produtor','produtores','revendedor','revendedores','vitrine',
    'vitrines','marketplace','loja','lojas','produtos','produto','itens','item',
    'carrinho','checkout','pagamento','pedido','pedidos','termos',
    'privacidade','lgpd','ajuda','suporte','contato','sobre','blog',
    'staypse','brand','static','public','_next','www','app','login',
    'lista','obrigado','indicacao','indicar','espera',
    'produtos-proibidos','proibidos','contrato-produtor','contrato',
    'v','p','afiliado','afiliados','catalogo','links','minha-loja'
  ]);
$$;

-- 1. Loja do produtor -----------------------------------------------------
alter table public.producers
  add column loja_slug      text unique
                              check (loja_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
                                     and not public.slug_reservado(loja_slug)),
  add column loja_nome      text check (char_length(loja_nome) between 2 and 80),
  add column loja_descricao text check (char_length(loja_descricao) <= 500),
  add column loja_foto_path text;

-- Edita só os 4 campos da loja, mesmo depois de aprovado
create or replace function public.salvar_minha_loja(p_slug text, p_nome text, p_descricao text, p_foto text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.producers
  where user_id = (select auth.uid()) and status_verificacao <> 'suspenso';
  if v_id is null then raise exception 'cadastro_inexistente'; end if;
  if nullif(p_foto, '') is not null and not starts_with(p_foto, (select auth.uid())::text || '/') then
    raise exception 'foto_fora_da_pasta';
  end if;
  update public.producers
  set loja_slug = nullif(lower(trim(p_slug)), ''), loja_nome = nullif(trim(p_nome), ''),
      loja_descricao = nullif(trim(p_descricao), ''), loja_foto_path = nullif(p_foto, '')
  where id = v_id;
end; $$;
revoke execute on function public.salvar_minha_loja(text, text, text, text) from public, anon;
grant execute on function public.salvar_minha_loja(text, text, text, text) to authenticated;

create or replace function public.loja_publica(p_slug text)
returns table (id uuid, loja_slug text, loja_nome text, loja_descricao text, loja_foto_path text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.loja_slug, coalesce(p.loja_nome, p.razao_social), p.loja_descricao, p.loja_foto_path
  from public.producers p where p.loja_slug = p_slug and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.loja_publica(text) from public;
grant execute on function public.loja_publica(text) to anon, authenticated, service_role;

-- 2. Itens: slug e regra de afiliação ------------------------------------
alter table public.items
  add column slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  add column aprovacao_afiliacao text not null default 'automatica'
    check (aprovacao_afiliacao in ('automatica', 'manual'));

-- slug fixo, gerado na criação (o link não quebra se o nome mudar)
create or replace function public.items_gera_slug()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.slug is null then
    new.slug := trim(both '-' from left(public.gerar_slug(new.nome), 60)) || '-' ||
                substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  return new;
end; $$;
create trigger items_0_gera_slug before insert on public.items
  for each row execute function public.items_gera_slug();

update public.items
set slug = trim(both '-' from left(public.gerar_slug(nome), 60)) || '-' || substr(replace(id::text, '-', ''), 1, 6)
where slug is null;
alter table public.items alter column slug set not null;

grant insert (aprovacao_afiliacao) on public.items to authenticated;
grant update (aprovacao_afiliacao) on public.items to authenticated;

create or replace function public.item_publico(p_slug text)
returns table (id uuid, slug text, nome text, descricao text, fotos text[], preco_centavos integer,
               tipo text, tipo_digital text, categoria text, prazo_postagem_dias integer,
               retirada_local boolean, produtor_nome text, loja_slug text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.descricao, i.fotos, i.preco_centavos, i.tipo, i.tipo_digital,
         i.categoria, i.prazo_postagem_dias, i.retirada_local, coalesce(p.loja_nome, p.razao_social), p.loja_slug
  from public.items i join public.producers p on p.id = i.producer_id
  where i.slug = p_slug and i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.item_publico(text) from public;
grant execute on function public.item_publico(text) to anon, authenticated, service_role;

create or replace function public.itens_da_loja(p_loja_slug text)
returns table (slug text, nome text, fotos text[], preco_centavos integer, tipo text)
language sql stable security definer set search_path = '' as $$
  select i.slug, i.nome, i.fotos, i.preco_centavos, i.tipo
  from public.items i join public.producers p on p.id = i.producer_id
  where p.loja_slug = p_loja_slug and p.status_verificacao = 'aprovado' and i.status_aprovacao = 'aprovado'
  order by i.aprovado_em desc nulls last;
$$;
revoke execute on function public.itens_da_loja(text) from public;
grant execute on function public.itens_da_loja(text) to anon, authenticated, service_role;

-- 3. Vitrine do afiliado: nicho e modelo visual fechados -------------------
alter table public.storefronts drop constraint if exists storefronts_nicho_check;
alter table public.storefronts drop constraint if exists storefronts_modelo_visual_check;
update public.storefronts set nicho = null where nicho not in ('moda','beleza','casa','fitness','cursos','ingressos','outro');
update public.storefronts set modelo_visual = 'petroleo' where modelo_visual not in ('petroleo','gelo','ciano');
alter table public.storefronts
  alter column modelo_visual set default 'petroleo',
  add constraint storefronts_nicho_check check (nicho in ('moda','beleza','casa','fitness','cursos','ingressos','outro')),
  add constraint storefronts_modelo_visual_check check (modelo_visual in ('petroleo','gelo','ciano'));

-- 4. Afiliações -----------------------------------------------------------
create table public.afiliacoes (
  id             uuid primary key default gen_random_uuid(),
  afiliado_id    uuid not null references public.profiles (id) on delete cascade,
  storefront_id  uuid not null references public.storefronts (id) on delete cascade,
  item_id        uuid not null references public.items (id) on delete cascade,
  codigo         text not null unique default public.gerar_codigo_indicacao(),
  status         text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  criado_em      timestamptz not null default now(),
  decidido_em    timestamptz,
  unique (afiliado_id, item_id)
);
create index afiliacoes_item_idx on public.afiliacoes (item_id);
create index afiliacoes_storefront_idx on public.afiliacoes (storefront_id);

alter table public.afiliacoes enable row level security;
revoke all on public.afiliacoes from anon, authenticated;
grant select, delete on public.afiliacoes to authenticated;

create or replace function public.eh_dono_do_item(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.items i join public.producers p on p.id = i.producer_id
                 where i.id = p_item and p.user_id = (select auth.uid()));
$$;
revoke execute on function public.eh_dono_do_item(uuid) from public, anon;
grant execute on function public.eh_dono_do_item(uuid) to authenticated;

-- Produtor vê só ids e status (o nome que ele vê é o da vitrine pública)
create policy "afiliacoes: afiliado, produtor do item ou admin" on public.afiliacoes
  for select to authenticated
  using (afiliado_id = (select auth.uid()) or public.eh_dono_do_item(item_id) or public.is_admin());
create policy "afiliacoes: afiliado cancela a sua" on public.afiliacoes
  for delete to authenticated using (afiliado_id = (select auth.uid()));

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
  insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status, decidido_em)
  values ((select auth.uid()), v_sf, p_item,
          case v_regra when 'automatica' then 'aprovada' else 'pendente' end,
          case v_regra when 'automatica' then now() end)
  on conflict (afiliado_id, item_id) do nothing;
  return query select a.codigo, a.status from public.afiliacoes a
               where a.afiliado_id = (select auth.uid()) and a.item_id = p_item;
end; $$;
revoke execute on function public.afiliar_se(uuid) from public, anon;
grant execute on function public.afiliar_se(uuid) to authenticated;

create or replace function public.decidir_afiliacao(p_afiliacao uuid, p_aprovar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_item uuid;
begin
  select item_id into v_item from public.afiliacoes where id = p_afiliacao and status = 'pendente';
  if v_item is null then raise exception 'afiliacao_nao_pendente'; end if;
  if not (public.eh_dono_do_item(v_item) or public.is_admin()) then raise exception 'apenas_produtor_do_item'; end if;
  update public.afiliacoes set status = case when p_aprovar then 'aprovada' else 'recusada' end, decidido_em = now()
  where id = p_afiliacao;
end; $$;
revoke execute on function public.decidir_afiliacao(uuid, boolean) from public, anon;
grant execute on function public.decidir_afiliacao(uuid, boolean) to authenticated;

create or replace function public.catalogo_afiliados()
returns table (id uuid, slug text, nome text, fotos text[], preco_centavos integer, comissao_percentual numeric,
               tipo text, categoria text, aprovacao_afiliacao text, produtor_nome text,
               minha_afiliacao_status text, meu_codigo text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.fotos, i.preco_centavos, i.comissao_percentual, i.tipo, i.categoria,
         i.aprovacao_afiliacao, coalesce(p.loja_nome, p.razao_social), a.status, a.codigo
  from public.items i
  join public.producers p on p.id = i.producer_id
  left join public.afiliacoes a on a.item_id = i.id and a.afiliado_id = (select auth.uid())
  where i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado'
  order by i.aprovado_em desc nulls last;
$$;
revoke execute on function public.catalogo_afiliados() from public, anon;
grant execute on function public.catalogo_afiliados() to authenticated;

create or replace function public.itens_da_vitrine(p_slug text)
returns table (slug text, nome text, fotos text[], preco_centavos integer, tipo text, produtor_nome text, codigo text)
language sql stable security definer set search_path = '' as $$
  select i.slug, i.nome, i.fotos, i.preco_centavos, i.tipo, coalesce(p.loja_nome, p.razao_social), a.codigo
  from public.storefronts s
  join public.afiliacoes a on a.storefront_id = s.id and a.status = 'aprovada'
  join public.items i on i.id = a.item_id and i.status_aprovacao = 'aprovado'
  join public.producers p on p.id = i.producer_id and p.status_verificacao = 'aprovado'
  where s.slug = p_slug and s.publicada
  order by a.criado_em;
$$;
revoke execute on function public.itens_da_vitrine(text) from public;
grant execute on function public.itens_da_vitrine(text) to anon, authenticated, service_role;

-- 5. Cliques ---------------------------------------------------------------
alter table public.clicks
  add column codigo_afiliado text check (char_length(codigo_afiliado) <= 16),
  add column ip_hash text check (char_length(ip_hash) <= 128);
create index clicks_limite_idx on public.clicks (ip_hash, criado_em);

create or replace function public.registrar_clique(
  p_vitrine text, p_item_slug text, p_link uuid, p_codigo text, p_ip_hash text, p_origem text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_sf uuid; v_item uuid; v_link uuid; v_codigo text;
begin
  if nullif(p_codigo, '') is not null then
    select a.storefront_id, a.codigo into v_sf, v_codigo
    from public.afiliacoes a where a.codigo = p_codigo and a.status = 'aprovada';
  end if;
  if v_sf is null and nullif(p_vitrine, '') is not null then
    select id into v_sf from public.storefronts where slug = p_vitrine and publicada;
  end if;
  if v_sf is null then return false; end if;
  if nullif(p_item_slug, '') is not null then
    select id into v_item from public.items where slug = p_item_slug and status_aprovacao = 'aprovado';
  elsif p_link is not null then
    select id into v_link from public.external_links where id = p_link and storefront_id = v_sf;
  end if;
  if v_item is null and v_link is null then return false; end if;
  if exists (select 1 from public.clicks
             where ip_hash = p_ip_hash and criado_em > now() - interval '10 minutes'
               and item_id is not distinct from v_item and external_link_id is not distinct from v_link) then
    return false;
  end if;
  insert into public.clicks (storefront_id, item_id, external_link_id, codigo_afiliado, ip_hash, origem)
  values (v_sf, v_item, v_link, v_codigo, p_ip_hash, left(nullif(p_origem, ''), 255));
  return true;
end; $$;
revoke execute on function public.registrar_clique(text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_clique(text, text, uuid, text, text, text) to service_role;

create or replace function public.meus_cliques()
returns table (titulo text, tipo text, cliques_7d bigint, cliques_30d bigint)
language sql stable security definer set search_path = '' as $$
  select coalesce(i.nome, l.titulo, 'Item removido'),
         case when c.item_id is not null then 'staypse' else 'externo' end,
         count(*) filter (where c.criado_em > now() - interval '7 days'), count(*)
  from public.clicks c
  join public.storefronts s on s.id = c.storefront_id and s.revendedor_id = (select auth.uid())
  left join public.items i on i.id = c.item_id
  left join public.external_links l on l.id = c.external_link_id
  where c.criado_em > now() - interval '30 days'
  group by 1, 2 order by 4 desc;
$$;
revoke execute on function public.meus_cliques() from public, anon;
grant execute on function public.meus_cliques() to authenticated;
