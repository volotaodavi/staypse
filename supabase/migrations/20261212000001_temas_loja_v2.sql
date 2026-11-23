-- Temas da loja v2: 8 modelos e blocos editáveis, tudo em producers.loja_tema (JSON).
-- Compatível com as lojas que já existem: o formato antigo (4 modelos, 7 seções, "banner")
-- continua válido; as chaves novas são opcionais. Sem HTML nem CSS livre: o banco só aceita
-- os valores abaixo. Cores, fonte e logo seguem nas colunas loja_cor_*, loja_fonte, loja_foto_path.
--
-- Formato de producers.loja_tema (versão 2):
--   {
--     "versao":    2,
--     "modelo":    "classico|vitrine|catalogo|editorial|minimal|boutique|fabrica|digital",
--     "secoes":    [ {"tipo": "banner|destaques|colecoes|categorias|sobre|video|mais_vendidos|
--                              todos_produtos|faq|trocas_entrega", "visivel": bool}, ... ]  -- sem repetir tipo
--     "destaques": [ "<id de item da PRÓPRIA loja>", ... ]                    -- até 8
--     "banners":   [ {"imagem","celular": "<uid>/arquivo"|null, "frase": até 80, "alt": até 120,
--                     "produto": "<id de item da loja>"|null, "url": "https://..."|null}, ... ]  -- até 5
--     "anuncio":   {"visivel": bool, "texto": até 100, "url": "https://..."|null}
--     "cabecalho": {"busca": bool, "menu": bool, "links": [ {"rotulo": até 30, "url": "https://..."} ]}  -- até 4
--     "colecoes":  [ {"categoria": "casa", "imagem": "<uid>/arquivo"|null}, ... ]  -- até 8
--     "sobre":     {"titulo": até 60, "texto": até 800, "imagem": "<uid>/arquivo"|null}
--     "video":     {"plataforma": "youtube|vimeo", "id": "...", "titulo": até 80} | null
--     "faq":       [ {"p": até 120, "r": até 600}, ... ]                      -- até 8
--     "rodape":    {"instagram","facebook","tiktok","youtube": "usuario"|null, "whatsapp": "5511999999999"|null,
--                   "links": [ {"rotulo": até 30, "url": "https://..."} ]}    -- até 4
--     "banner":    {"imagem","frase","produto"}   -- formato antigo, ainda aceito
--   }
-- Não existe bloco de depoimentos ou avaliações: só entra prova social com dado real.

-- ---------------------------------------------------------------- auxiliares (puras)
create or replace function public.tema_loja_chaves(o jsonb, permitidas text[])
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(o) = 'object'
     and not exists (select 1 from jsonb_object_keys(o) k where k <> all (permitidas));
$$;

-- texto opcional com limite de tamanho (ausente ou null vale)
create or replace function public.tema_loja_texto(v jsonb, maximo int)
returns boolean language sql immutable set search_path = '' as $$
  select v is null or jsonb_typeof(v) = 'null'
      or (jsonb_typeof(v) = 'string' and char_length(v #>> '{}') <= maximo);
$$;

-- link opcional: só https, sem espaços nem aspas (nada de javascript: ou data:)
create or replace function public.tema_loja_url(v jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select v is null or jsonb_typeof(v) = 'null'
      or (jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^https://[^\s<>"'']{3,200}$');
$$;

-- imagem opcional: caminho "<uuid>/arquivo" já usado no bucket fotos-itens
create or replace function public.tema_loja_img(v jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select v is null or jsonb_typeof(v) = 'null'
      or (jsonb_typeof(v) = 'string' and public.caminho_valido(v #>> '{}'));
$$;

-- ---------------------------------------------------------------- validação de formato
create or replace function public.tema_loja_valido(t jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_tipos constant text[] := array['banner', 'destaques', 'mais_vendidos', 'todos_produtos', 'categorias', 'sobre',
                                   'trocas_entrega', 'colecoes', 'video', 'faq'];
  v_modelos constant text[] := array['classico', 'vitrine', 'catalogo', 'editorial', 'minimal', 'boutique', 'fabrica', 'digital'];
  v_redes constant text[] := array['instagram', 'facebook', 'tiktok', 'youtube'];
  s jsonb; d jsonb; b jsonb; e jsonb; x jsonb; k text;
begin
  if t is null then return true; end if;
  if not public.tema_loja_chaves(t, array['modelo', 'secoes', 'destaques', 'banner', 'versao', 'banners', 'anuncio',
                                          'cabecalho', 'colecoes', 'sobre', 'video', 'faq', 'rodape']) then
    return false;
  end if;
  if t ? 'versao' and (jsonb_typeof(t -> 'versao') <> 'number' or (t ->> 'versao') <> '2') then return false; end if;

  -- modelo
  if jsonb_typeof(t -> 'modelo') is distinct from 'string' or (t ->> 'modelo') <> all (v_modelos) then return false; end if;

  -- secoes: lista ordenada, tipos permitidos, sem repetir
  s := t -> 'secoes';
  if jsonb_typeof(s) is distinct from 'array' or jsonb_array_length(s) not between 1 and 10 then return false; end if;
  for e in select * from jsonb_array_elements(s) loop
    if not public.tema_loja_chaves(e, array['tipo', 'visivel']) then return false; end if;
    if jsonb_typeof(e -> 'tipo') is distinct from 'string' or (e ->> 'tipo') <> all (v_tipos) then return false; end if;
    if jsonb_typeof(e -> 'visivel') is distinct from 'boolean' then return false; end if;
  end loop;
  if (select count(distinct x2 ->> 'tipo') from jsonb_array_elements(s) x2) <> jsonb_array_length(s) then return false; end if;

  -- destaques: até 8 ids, sem repetir
  d := coalesce(t -> 'destaques', '[]'::jsonb);
  if jsonb_typeof(d) <> 'array' or jsonb_array_length(d) > 8 then return false; end if;
  for e in select * from jsonb_array_elements(d) loop
    if jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ v_uuid then return false; end if;
  end loop;
  if (select count(distinct x2 #>> '{}') from jsonb_array_elements(d) x2) <> jsonb_array_length(d) then return false; end if;

  -- banner (formato antigo): imagem (caminho seguro), frase (até 80) e produto (id)
  b := coalesce(t -> 'banner', '{}'::jsonb);
  if not public.tema_loja_chaves(b, array['imagem', 'frase', 'produto']) then return false; end if;
  if not public.tema_loja_img(b -> 'imagem') or not public.tema_loja_texto(b -> 'frase', 80) then return false; end if;
  if jsonb_typeof(b -> 'produto') not in ('null', 'string') and b ? 'produto' then return false; end if;
  if jsonb_typeof(b -> 'produto') = 'string' and (b ->> 'produto') !~ v_uuid then return false; end if;

  -- banners: até 5, imagem para computador e para celular, frase, link
  if t ? 'banners' then
    if jsonb_typeof(t -> 'banners') <> 'array' or jsonb_array_length(t -> 'banners') > 5 then return false; end if;
    for e in select * from jsonb_array_elements(t -> 'banners') loop
      if not public.tema_loja_chaves(e, array['imagem', 'celular', 'frase', 'alt', 'produto', 'url']) then return false; end if;
      if not public.tema_loja_img(e -> 'imagem') or not public.tema_loja_img(e -> 'celular') then return false; end if;
      if not public.tema_loja_texto(e -> 'frase', 80) or not public.tema_loja_texto(e -> 'alt', 120) then return false; end if;
      if not public.tema_loja_url(e -> 'url') then return false; end if;
      if jsonb_typeof(e -> 'produto') not in ('null', 'string') and e ? 'produto' then return false; end if;
      if jsonb_typeof(e -> 'produto') = 'string' and (e ->> 'produto') !~ v_uuid then return false; end if;
    end loop;
  end if;

  -- faixa de anúncio
  if t ? 'anuncio' then
    x := t -> 'anuncio';
    if not public.tema_loja_chaves(x, array['visivel', 'texto', 'url']) then return false; end if;
    if jsonb_typeof(x -> 'visivel') is distinct from 'boolean' then return false; end if;
    if not public.tema_loja_texto(x -> 'texto', 100) or not public.tema_loja_url(x -> 'url') then return false; end if;
  end if;

  -- cabeçalho: busca, menu por categorias e até 4 links
  if t ? 'cabecalho' then
    x := t -> 'cabecalho';
    if not public.tema_loja_chaves(x, array['busca', 'menu', 'links']) then return false; end if;
    if jsonb_typeof(x -> 'busca') is distinct from 'boolean' or jsonb_typeof(x -> 'menu') is distinct from 'boolean' then return false; end if;
    if x ? 'links' then
      if jsonb_typeof(x -> 'links') <> 'array' or jsonb_array_length(x -> 'links') > 4 then return false; end if;
      for e in select * from jsonb_array_elements(x -> 'links') loop
        if not public.tema_loja_chaves(e, array['rotulo', 'url']) then return false; end if;
        if jsonb_typeof(e -> 'rotulo') is distinct from 'string' or not public.tema_loja_texto(e -> 'rotulo', 30) then return false; end if;
        if jsonb_typeof(e -> 'url') is distinct from 'string' or not public.tema_loja_url(e -> 'url') then return false; end if;
      end loop;
    end if;
  end if;

  -- coleções: imagem por categoria
  if t ? 'colecoes' then
    if jsonb_typeof(t -> 'colecoes') <> 'array' or jsonb_array_length(t -> 'colecoes') > 8 then return false; end if;
    for e in select * from jsonb_array_elements(t -> 'colecoes') loop
      if not public.tema_loja_chaves(e, array['categoria', 'imagem']) then return false; end if;
      if jsonb_typeof(e -> 'categoria') is distinct from 'string' or (e ->> 'categoria') !~ '^[a-z0-9_]{1,40}$' then return false; end if;
      if not public.tema_loja_img(e -> 'imagem') then return false; end if;
    end loop;
  end if;

  -- sobre a marca
  if t ? 'sobre' then
    x := t -> 'sobre';
    if not public.tema_loja_chaves(x, array['titulo', 'texto', 'imagem']) then return false; end if;
    if not public.tema_loja_texto(x -> 'titulo', 60) or not public.tema_loja_texto(x -> 'texto', 800) or not public.tema_loja_img(x -> 'imagem') then
      return false;
    end if;
  end if;

  -- vídeo: só plataforma e código (o endereço do player é montado pelo app)
  if t ? 'video' and jsonb_typeof(t -> 'video') <> 'null' then
    x := t -> 'video';
    if not public.tema_loja_chaves(x, array['plataforma', 'id', 'titulo']) then return false; end if;
    if jsonb_typeof(x -> 'plataforma') is distinct from 'string' or (x ->> 'plataforma') <> all (array['youtube', 'vimeo']) then return false; end if;
    if jsonb_typeof(x -> 'id') is distinct from 'string' then return false; end if;
    if (x ->> 'plataforma') = 'youtube' and (x ->> 'id') !~ '^[A-Za-z0-9_-]{11}$' then return false; end if;
    if (x ->> 'plataforma') = 'vimeo' and (x ->> 'id') !~ '^[0-9]{5,12}$' then return false; end if;
    if not public.tema_loja_texto(x -> 'titulo', 80) then return false; end if;
  end if;

  -- perguntas frequentes
  if t ? 'faq' then
    if jsonb_typeof(t -> 'faq') <> 'array' or jsonb_array_length(t -> 'faq') > 8 then return false; end if;
    for e in select * from jsonb_array_elements(t -> 'faq') loop
      if not public.tema_loja_chaves(e, array['p', 'r']) then return false; end if;
      if jsonb_typeof(e -> 'p') is distinct from 'string' or jsonb_typeof(e -> 'r') is distinct from 'string' then return false; end if;
      if char_length(e ->> 'p') not between 1 and 120 or char_length(e ->> 'r') not between 1 and 600 then return false; end if;
    end loop;
  end if;

  -- rodapé: redes (só o usuário), WhatsApp (só números) e até 4 links
  if t ? 'rodape' then
    x := t -> 'rodape';
    if not public.tema_loja_chaves(x, array['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'links']) then return false; end if;
    foreach k in array v_redes loop
      if x ? k and jsonb_typeof(x -> k) <> 'null'
         and (jsonb_typeof(x -> k) <> 'string' or (x ->> k) !~ '^[A-Za-z0-9._]{1,40}$') then return false; end if;
    end loop;
    if x ? 'whatsapp' and jsonb_typeof(x -> 'whatsapp') <> 'null'
       and (jsonb_typeof(x -> 'whatsapp') <> 'string' or (x ->> 'whatsapp') !~ '^[0-9]{10,13}$') then return false; end if;
    if x ? 'links' then
      if jsonb_typeof(x -> 'links') <> 'array' or jsonb_array_length(x -> 'links') > 4 then return false; end if;
      for e in select * from jsonb_array_elements(x -> 'links') loop
        if not public.tema_loja_chaves(e, array['rotulo', 'url']) then return false; end if;
        if jsonb_typeof(e -> 'rotulo') is distinct from 'string' or not public.tema_loja_texto(e -> 'rotulo', 30) then return false; end if;
        if jsonb_typeof(e -> 'url') is distinct from 'string' or not public.tema_loja_url(e -> 'url') then return false; end if;
      end loop;
    end if;
  end if;
  return true;
end; $$;

-- o CHECK da migração anterior já chama a função pelo nome: passa a valer a versão nova.

-- ---------------------------------------------------------------- o que um CHECK não alcança
-- produtos citados (destaques, banners) têm de ser itens DESTA loja; toda imagem, da pasta do dono.
create or replace function public.producers_valida_tema()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_img text;
begin
  if new.loja_tema is null then return new; end if;
  select coalesce(array_agg(x #>> '{}'), '{}')::text[]::uuid[] into v_ids
    from (
      select * from jsonb_array_elements(coalesce(new.loja_tema -> 'destaques', '[]'::jsonb))
      union all select jsonb_path_query(new.loja_tema, '$.banner.produto')
      union all select jsonb_path_query(new.loja_tema, '$.banners[*].produto')
    ) q(x) where jsonb_typeof(x) = 'string';
  if exists (
    select 1 from unnest(v_ids) i
    where not exists (select 1 from public.items it where it.id = i and it.producer_id = new.id)
  ) then
    raise exception 'destaque_de_outra_loja' using errcode = 'check_violation';
  end if;
  for v_img in
    select x #>> '{}' from (
      select jsonb_path_query(new.loja_tema, '$.banner.imagem')
      union all select jsonb_path_query(new.loja_tema, '$.banners[*].imagem')
      union all select jsonb_path_query(new.loja_tema, '$.banners[*].celular')
      union all select jsonb_path_query(new.loja_tema, '$.colecoes[*].imagem')
      union all select jsonb_path_query(new.loja_tema, '$.sobre.imagem')
    ) q(x) where jsonb_typeof(x) = 'string'
  loop
    if not starts_with(v_img, new.user_id::text || '/') then
      raise exception 'banner_fora_da_pasta' using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end; $$;
revoke execute on function public.producers_valida_tema() from public, anon, authenticated;
