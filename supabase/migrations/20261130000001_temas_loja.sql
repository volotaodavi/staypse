-- Temas da loja: 4 modelos prontos + seções, banner e destaques salvos em JSON.
-- Sem HTML/CSS livre: o banco só aceita os valores abaixo. Cores, fonte e logo
-- continuam nas colunas que já existem (loja_cor_*, loja_fonte, loja_foto_path).
--
-- Formato de producers.loja_tema:
--   {
--     "modelo":    "classico" | "vitrine" | "catalogo" | "editorial",
--     "secoes":    [ {"tipo": "banner|destaques|mais_vendidos|todos_produtos|categorias|sobre|trocas_entrega",
--                     "visivel": true|false}, ... ]      -- ordem = ordem na página, sem repetir tipo
--     "destaques": [ "<id de item da PRÓPRIA loja>", ... ]   -- até 8
--     "banner":    { "imagem": "<uid>/arquivo no bucket fotos-itens" | null,
--                    "frase": "até 80 letras" | null,
--                    "produto": "<id de item da PRÓPRIA loja>" | null }
--   }
-- Loja sem tema (null) continua valendo: o app usa o "layout" antigo como modelo.

alter table public.producers add column loja_tema jsonb;

-- ---------------------------------------------------------------- validação de formato
create or replace function public.tema_loja_valido(t jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_tipos constant text[] := array['banner', 'destaques', 'mais_vendidos', 'todos_produtos', 'categorias', 'sobre', 'trocas_entrega'];
  s jsonb; d jsonb; b jsonb; e jsonb; k text;
begin
  if t is null then return true; end if;
  if jsonb_typeof(t) <> 'object' then return false; end if;
  -- só estas chaves
  for k in select jsonb_object_keys(t) loop
    if k <> all (array['modelo', 'secoes', 'destaques', 'banner']) then return false; end if;
  end loop;

  -- modelo
  if jsonb_typeof(t -> 'modelo') is distinct from 'string'
     or (t ->> 'modelo') <> all (array['classico', 'vitrine', 'catalogo', 'editorial']) then
    return false;
  end if;

  -- secoes: lista ordenada, tipos permitidos, sem repetir
  s := t -> 'secoes';
  if jsonb_typeof(s) is distinct from 'array' or jsonb_array_length(s) not between 1 and 7 then return false; end if;
  for e in select * from jsonb_array_elements(s) loop
    if jsonb_typeof(e) <> 'object' then return false; end if;
    for k in select jsonb_object_keys(e) loop
      if k <> all (array['tipo', 'visivel']) then return false; end if;
    end loop;
    if jsonb_typeof(e -> 'tipo') is distinct from 'string' or (e ->> 'tipo') <> all (v_tipos) then return false; end if;
    if jsonb_typeof(e -> 'visivel') is distinct from 'boolean' then return false; end if;
  end loop;
  if (select count(distinct x ->> 'tipo') from jsonb_array_elements(s) x) <> jsonb_array_length(s) then return false; end if;

  -- destaques: até 8 ids, sem repetir
  d := coalesce(t -> 'destaques', '[]'::jsonb);
  if jsonb_typeof(d) <> 'array' or jsonb_array_length(d) > 8 then return false; end if;
  for e in select * from jsonb_array_elements(d) loop
    if jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ v_uuid then return false; end if;
  end loop;
  if (select count(distinct x #>> '{}') from jsonb_array_elements(d) x) <> jsonb_array_length(d) then return false; end if;

  -- banner: imagem (caminho seguro), frase (até 80) e produto (id)
  b := coalesce(t -> 'banner', '{}'::jsonb);
  if jsonb_typeof(b) <> 'object' then return false; end if;
  for k in select jsonb_object_keys(b) loop
    if k <> all (array['imagem', 'frase', 'produto']) then return false; end if;
  end loop;
  if jsonb_typeof(b -> 'imagem') not in ('null', 'string') and b ? 'imagem' then return false; end if;
  if jsonb_typeof(b -> 'imagem') = 'string' and not public.caminho_valido(b ->> 'imagem') then return false; end if;
  if jsonb_typeof(b -> 'frase') not in ('null', 'string') and b ? 'frase' then return false; end if;
  if jsonb_typeof(b -> 'frase') = 'string' and char_length(b ->> 'frase') > 80 then return false; end if;
  if jsonb_typeof(b -> 'produto') not in ('null', 'string') and b ? 'produto' then return false; end if;
  if jsonb_typeof(b -> 'produto') = 'string' and (b ->> 'produto') !~ v_uuid then return false; end if;
  return true;
end; $$;

alter table public.producers
  add constraint producers_tema_valido check (public.tema_loja_valido(loja_tema));

-- ---------------------------------------------------------------- o que um CHECK não alcança
-- destaques e produto do banner têm de ser itens DESTA loja; a imagem, da pasta do dono.
create or replace function public.producers_valida_tema()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];
begin
  if new.loja_tema is null then return new; end if;
  select coalesce(array_agg(x #>> '{}'), '{}')::text[]::uuid[] into v_ids
    from jsonb_array_elements(coalesce(new.loja_tema -> 'destaques', '[]'::jsonb)) x;
  if nullif(new.loja_tema #>> '{banner,produto}', '') is not null then
    v_ids := v_ids || (new.loja_tema #>> '{banner,produto}')::uuid;
  end if;
  if exists (
    select 1 from unnest(v_ids) i
    where not exists (select 1 from public.items it where it.id = i and it.producer_id = new.id)
  ) then
    raise exception 'destaque_de_outra_loja' using errcode = 'check_violation';
  end if;
  if nullif(new.loja_tema #>> '{banner,imagem}', '') is not null
     and not starts_with(new.loja_tema #>> '{banner,imagem}', new.user_id::text || '/') then
    raise exception 'banner_fora_da_pasta' using errcode = 'check_violation';
  end if;
  return new;
end; $$;
revoke execute on function public.producers_valida_tema() from public, anon, authenticated;
create trigger producers_b_valida_tema before insert or update of loja_tema on public.producers
  for each row execute function public.producers_valida_tema();

-- ---------------------------------------------------------------- gravação: só a dona, pela função
-- (authenticated não tem UPDATE na coluna loja_tema; só esta função grava)
create or replace function public.salvar_minha_loja(
  p_slug text, p_nome text, p_descricao text, p_foto text,
  p_cor_principal text, p_cor_destaque text, p_fonte text, p_layout text, p_tema jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  -- dados, logo, cores e fonte: a função de sempre (mesmas conferências)
  perform public.salvar_minha_loja(p_slug, p_nome, p_descricao, p_foto, p_cor_principal, p_cor_destaque, p_fonte, p_layout);
  select id into v_id from public.producers
  where user_id = (select auth.uid()) and status_verificacao <> 'suspenso';
  if v_id is null then raise exception 'cadastro_inexistente'; end if;
  update public.producers set loja_tema = p_tema where id = v_id;
end; $$;
revoke execute on function public.salvar_minha_loja(text, text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.salvar_minha_loja(text, text, text, text, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------- leitura pública (loja aprovada)
drop function if exists public.loja_publica(text);
create or replace function public.loja_publica(p_slug text)
returns table (id uuid, loja_slug text, loja_nome text, loja_descricao text, loja_foto_path text,
               cor_principal text, cor_destaque text, fonte text, layout text,
               razao_social text, cnpj text, endereco text, cidade text, uf text, email_contato text,
               loja_tema jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.loja_slug, coalesce(p.loja_nome, p.razao_social), p.loja_descricao, p.loja_foto_path,
         p.loja_cor_principal, p.loja_cor_destaque, p.loja_fonte, p.loja_layout,
         p.razao_social, p.cnpj,
         concat_ws(', ', nullif(concat_ws(', ', p.logradouro, p.numero), ''), nullif(p.complemento, ''), p.bairro,
                   case when p.cep is not null then 'CEP ' || substr(p.cep, 1, 5) || '-' || substr(p.cep, 6) end),
         p.cidade, p.uf, p.email_contato, p.loja_tema
  from public.producers p where p.loja_slug = p_slug and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.loja_publica(text) from public;
grant execute on function public.loja_publica(text) to anon, authenticated, service_role;

-- Itens aprovados da loja, agora com id e categoria (para destaques e seções) e
-- "ordem_vendidos": só a POSIÇÃO entre os mais vendidos dos últimos 30 dias
-- (1 = o que mais vendeu; nulo = sem venda no período). Nenhum número de venda sai daqui.
drop function if exists public.itens_da_loja(text);
create or replace function public.itens_da_loja(p_loja_slug text)
returns table (id uuid, slug text, nome text, fotos text[], preco_centavos integer, tipo text,
               categoria text, ordem_vendidos integer)
language sql stable security definer set search_path = '' as $$
  with vendas as (
    select oi.item_id, sum(oi.quantidade) as q
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where o.status = 'pago' and o.pago_em >= now() - interval '30 days'
      and oi.status_entrega not in ('cancelado', 'devolvido')
    group by oi.item_id
  ), base as (
    select i.id, i.slug, i.nome, i.fotos, i.preco_centavos, i.tipo, i.categoria, i.aprovado_em, v.q
    from public.items i
    join public.producers p on p.id = i.producer_id
    left join vendas v on v.item_id = i.id
    where p.loja_slug = p_loja_slug and p.status_verificacao = 'aprovado' and i.status_aprovacao = 'aprovado'
  )
  select b.id, b.slug, b.nome, b.fotos, b.preco_centavos, b.tipo, b.categoria,
         case when b.q > 0 then (row_number() over (order by b.q desc nulls last, b.aprovado_em desc nulls last))::integer end
  from base b
  order by b.aprovado_em desc nulls last;
$$;
revoke execute on function public.itens_da_loja(text) from public;
grant execute on function public.itens_da_loja(text) to anon, authenticated, service_role;
