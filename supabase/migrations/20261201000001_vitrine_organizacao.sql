-- Organização da vitrine do afiliado: destaques, coleções e ordem manual.
-- Fica em UM campo JSON (storefronts.organizacao), validado no banco.
-- Sem HTML livre: só ids de itens e nomes curtos de coleção.
--
-- Formato de storefronts.organizacao:
--   {
--     "destaques": [ "<id de item>", ... ],                 -- até 4, fixados no topo
--     "colecoes":  [ {"nome": "até 40 letras",              -- até 6 coleções
--                     "itens": ["<id de item>", ...]}, ... ],  -- ordem = ordem na coleção
--     "ordem":     [ "<id de item>", ... ]                  -- ordem manual da lista "Todos"
--   }
-- Todo id precisa ser de uma afiliação APROVADA do dono da vitrine (conferido
-- na gravação). Depois, se o item sair do ar, a vitrine pública simplesmente o
-- ignora (itens_da_vitrine só devolve item aprovado e ativo).
-- Vitrine sem organização (null) continua valendo: ordem de entrada na vitrine.

alter table public.storefronts add column organizacao jsonb;

-- ---------------------------------------------------------------- validação de formato
create or replace function public.organizacao_vitrine_valida(o jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_lista jsonb; v_col jsonb; e jsonb; k text;
begin
  if o is null then return true; end if;
  if jsonb_typeof(o) <> 'object' then return false; end if;
  for k in select jsonb_object_keys(o) loop
    if k <> all (array['destaques', 'colecoes', 'ordem']) then return false; end if;
  end loop;

  -- destaques: até 4 ids, sem repetir
  v_lista := coalesce(o -> 'destaques', '[]'::jsonb);
  if jsonb_typeof(v_lista) <> 'array' or jsonb_array_length(v_lista) > 4 then return false; end if;
  for e in select * from jsonb_array_elements(v_lista) loop
    if jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ v_uuid then return false; end if;
  end loop;
  if (select count(distinct x #>> '{}') from jsonb_array_elements(v_lista) x) <> jsonb_array_length(v_lista) then return false; end if;

  -- ordem: até 200 ids, sem repetir
  v_lista := coalesce(o -> 'ordem', '[]'::jsonb);
  if jsonb_typeof(v_lista) <> 'array' or jsonb_array_length(v_lista) > 200 then return false; end if;
  for e in select * from jsonb_array_elements(v_lista) loop
    if jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ v_uuid then return false; end if;
  end loop;
  if (select count(distinct x #>> '{}') from jsonb_array_elements(v_lista) x) <> jsonb_array_length(v_lista) then return false; end if;

  -- coleções: até 6, nome de 1 a 40 letras (sem repetir), até 200 itens cada
  v_lista := coalesce(o -> 'colecoes', '[]'::jsonb);
  if jsonb_typeof(v_lista) <> 'array' or jsonb_array_length(v_lista) > 6 then return false; end if;
  for v_col in select * from jsonb_array_elements(v_lista) loop
    if jsonb_typeof(v_col) <> 'object' then return false; end if;
    for k in select jsonb_object_keys(v_col) loop
      if k <> all (array['nome', 'itens']) then return false; end if;
    end loop;
    if jsonb_typeof(v_col -> 'nome') is distinct from 'string'
       or char_length(btrim(v_col ->> 'nome')) not between 1 and 40
       or (v_col ->> 'nome') <> btrim(v_col ->> 'nome') then
      return false;
    end if;
    if jsonb_typeof(v_col -> 'itens') is distinct from 'array' or jsonb_array_length(v_col -> 'itens') > 200 then return false; end if;
    for e in select * from jsonb_array_elements(v_col -> 'itens') loop
      if jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ v_uuid then return false; end if;
    end loop;
    if (select count(distinct x #>> '{}') from jsonb_array_elements(v_col -> 'itens') x) <> jsonb_array_length(v_col -> 'itens') then return false; end if;
  end loop;
  if (select count(distinct lower(x ->> 'nome')) from jsonb_array_elements(v_lista) x) <> jsonb_array_length(v_lista) then return false; end if;
  return true;
end; $$;

alter table public.storefronts
  add constraint storefronts_organizacao_valida check (public.organizacao_vitrine_valida(organizacao));

-- ---------------------------------------------------------------- o que um CHECK não alcança
-- todo id citado precisa ser de uma afiliação APROVADA do dono da vitrine
create or replace function public.storefronts_valida_organizacao()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ids text[];
begin
  if new.organizacao is null then return new; end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from (
    select e #>> '{}' as x from jsonb_array_elements(coalesce(new.organizacao -> 'destaques', '[]'::jsonb)) e
    union
    select e #>> '{}' from jsonb_array_elements(coalesce(new.organizacao -> 'ordem', '[]'::jsonb)) e
    union
    select i #>> '{}' from jsonb_array_elements(coalesce(new.organizacao -> 'colecoes', '[]'::jsonb)) c,
                           jsonb_array_elements(c -> 'itens') i
  ) t;
  if exists (
    select 1 from unnest(v_ids) i
    where not exists (
      select 1 from public.afiliacoes a
      where a.item_id = i::uuid and a.afiliado_id = new.revendedor_id and a.status = 'aprovada')
  ) then
    raise exception 'item_nao_afiliado' using errcode = 'check_violation';
  end if;
  return new;
end; $$;
revoke execute on function public.storefronts_valida_organizacao() from public, anon, authenticated;
create trigger storefronts_b_valida_organizacao before insert or update of organizacao on public.storefronts
  for each row execute function public.storefronts_valida_organizacao();

-- ---------------------------------------------------------------- gravação: só o dono, pela função
-- (authenticated não tem UPDATE na coluna organizacao; só esta função grava)
create or replace function public.salvar_organizacao_vitrine(p_org jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if (select auth.uid()) is null then raise exception 'nao_autenticado'; end if;
  update public.storefronts set organizacao = p_org where revendedor_id = (select auth.uid());
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'crie_sua_vitrine'; end if;
end; $$;
revoke execute on function public.salvar_organizacao_vitrine(jsonb) from public, anon;
grant execute on function public.salvar_organizacao_vitrine(jsonb) to authenticated;

-- ---------------------------------------------------------------- leitura pública
-- itens_da_vitrine agora traz o id (para casar com a organização)
drop function if exists public.itens_da_vitrine(text);
create or replace function public.itens_da_vitrine(p_slug text)
returns table (id uuid, slug text, nome text, fotos text[], preco_centavos integer, tipo text, produtor_nome text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.fotos, i.preco_centavos, i.tipo, coalesce(p.loja_nome, p.razao_social)
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
