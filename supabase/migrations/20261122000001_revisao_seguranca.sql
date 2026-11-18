-- =========================================================================
-- Revisão de segurança, LGPD e regras de negócio (após auditoria completa)
--  1. items: conteúdo pago (link de acesso, instruções, arquivo) e dados
--     internos NÃO são mais legíveis pela API pública; dono/admin leem por
--     itens_privados().
--  2. Links externos: só hosts da Shopee, Mercado Livre e TikTok (também no banco).
--  3. Convite: exige e-mail confirmado; ver_convite não devolve o e-mail.
--  4. Link curto sem afiliação: nunca leva para a loja errada.
--  5. Loja suspensa não edita a loja; caminhos de arquivo com formato fixo.
--  6. Afiliação: recusada pode pedir de novo; afiliação de catálogo volta ao
--     normal quando o vínculo de vendedor é desativado; endereço de produto
--     não pode colidir com o de outro produto que o mesmo afiliado indica.
--  7. Relatório mensal no horário de Brasília e com a forma de pagamento
--     vigente NAQUELE mês.
--  8. Decreto 7.962/2013: loja pública traz endereço e e-mail do vendedor.
--  9. Retenção: cliques com mais de 24 meses são apagados.
-- =========================================================================

-- 1. items: colunas públicas x privadas -------------------------------------
revoke select on public.items from anon, authenticated;
grant select (id, producer_id, nome, descricao, fotos, preco_centavos, tipo, estoque, peso_gramas, altura_cm,
              largura_cm, comprimento_cm, comissao_percentual, status_aprovacao, aprovado_em, criado_em,
              atualizado_em, categoria, prazo_postagem_dias, retirada_local, tipo_digital, declaracao_nf, slug,
              aprovacao_afiliacao)
  on public.items to anon, authenticated;

-- Itens completos (com as colunas privadas) só para o dono ou o admin.
-- Permite filtros e embeds do PostgREST: rpc('itens_privados').select(...).eq(...)
create or replace function public.itens_privados()
returns setof public.items
language sql stable security definer set search_path = '' as $$
  select i.* from public.items i
  where public.eh_dono_produtor(i.producer_id) or public.is_admin();
$$;
revoke execute on function public.itens_privados() from public, anon;
grant execute on function public.itens_privados() to authenticated;

-- 2. Links externos: só as plataformas permitidas -----------------------------
-- host = o que vem depois de https:// e antes de / ? # ; sem usuário/senha/porta
create or replace function public.host_de(u text)
returns text language sql immutable set search_path = '' as $$
  select lower(substring(u from '^https://([^/?#]+)'));
$$;

create or replace function public.link_externo_permitido(u text)
returns boolean language sql immutable set search_path = '' as $$
  select h is not null and h !~ '[@:]'
     and h ~ '(^|\.)(shopee\.com\.br|shope\.ee|mercadolivre\.com\.br|mercadolivre\.com|mercadolibre\.com|meli\.la|tiktok\.com)$'
  from (select public.host_de(u) as h) x;
$$;

-- imagens só dos servidores de imagem dessas plataformas (evita "pixel" de rastreio)
create or replace function public.imagem_externa_permitida(u text)
returns boolean language sql immutable set search_path = '' as $$
  select h is not null and h !~ '[@:]'
     and h ~ '(^|\.)(susercontent\.com|shopee\.com\.br|mlstatic\.com|mercadolivre\.com\.br|tiktokcdn\.com|tiktokcdn-us\.com|ibyteimg\.com)$'
  from (select public.host_de(u) as h) x;
$$;

delete from public.external_links where not public.link_externo_permitido(url) or plataforma = 'outra';
update public.external_links set imagem_url = null where imagem_url is not null and not public.imagem_externa_permitida(imagem_url);
alter table public.external_links
  add constraint external_links_url_permitida check (public.link_externo_permitido(url)),
  add constraint external_links_imagem_permitida check (imagem_url is null or public.imagem_externa_permitida(imagem_url)),
  add constraint external_links_plataforma_conhecida check (plataforma <> 'outra');

-- 3. Convite --------------------------------------------------------------------
drop function if exists public.ver_convite(text);
create or replace function public.ver_convite(p_token text)
returns table (loja_nome text, email_mascarado text, para_mim boolean, status text, expirado boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.loja_nome, p.razao_social),
         regexp_replace(v.email, '^(.)[^@]*', '\1***'),
         exists (select 1 from auth.users u where u.id = (select auth.uid()) and lower(u.email) = v.email),
         v.status,
         v.convite_expira_em < now()
  from public.loja_vendedores v join public.producers p on p.id = v.producer_id
  where v.convite_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;
revoke execute on function public.ver_convite(text) from public;
grant execute on function public.ver_convite(text) to anon, authenticated;

create or replace function public.aceitar_convite(p_token text, p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
declare v record; v_email text; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'precisa_entrar'; end if;
  select * into v from public.loja_vendedores
  where convite_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if v.id is null then raise exception 'convite_invalido'; end if;
  if v.convite_expira_em < now() then raise exception 'convite_expirado'; end if;
  -- só e-mail CONFIRMADO comprova que a pessoa é dona do endereço convidado
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
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
        -- sem declaração, sem data de declaração
        declaracao_em = case when excluded.declaracao_nao_empregado
                             then coalesce(public.loja_vendedores.declaracao_em, excluded.declaracao_em) end;
  return v_token;
end; $$;

-- 4. Link curto -------------------------------------------------------------------
-- Sem afiliação válida: leva ao produto SEM atribuir — mas só quando não há
-- ambiguidade (um único produto com esse endereço) ou quando o afiliado tem/teve
-- vínculo com a loja. Assim um endereço repetido em outra loja nunca "rouba" o link.
create or replace function public.abrir_link_afiliado(
  p_afiliado text, p_produto text, p_ip_hash text, p_origem text, p_registrar boolean)
returns table (loja_slug text, produto_slug text, item_id uuid, afiliado_id uuid, afiliado_slug text,
               atribuido boolean, clique_registrado boolean)
language plpgsql security definer set search_path = '' as $$
declare r record; v_novo boolean := false; v_sf uuid; v_dono uuid;
begin
  select s.id, s.revendedor_id into v_sf, v_dono from public.storefronts s where s.slug = lower(p_afiliado);

  select p.loja_slug as loja, i.slug as produto, i.id as item, a.afiliado_id as afiliado,
         lower(p_afiliado) as arroba, a.codigo
  into r
  from public.afiliacoes a
  join public.items i on i.id = a.item_id and i.slug = p_produto and i.status_aprovacao = 'aprovado'
  join public.producers p on p.id = i.producer_id and p.status_verificacao = 'aprovado' and p.loja_slug is not null
  left join public.loja_vendedores v on v.id = a.vendedor_id
  where a.afiliado_id = v_dono and a.status = 'aprovada' and (a.vendedor_id is null or v.status = 'ativo')
  order by a.criado_em desc
  limit 1;

  if r.item is not null then
    if p_registrar and not exists (
        select 1 from public.clicks c
        where c.ip_hash = p_ip_hash and c.item_id = r.item and c.criado_em > now() - interval '10 minutes') then
      insert into public.clicks (storefront_id, item_id, codigo_afiliado, ip_hash, origem)
      values (v_sf, r.item, r.codigo, p_ip_hash, left(nullif(p_origem, ''), 255));
      v_novo := true;
    end if;
    return query select r.loja, r.produto, r.item, r.afiliado, r.arroba, true, v_novo;
    return;
  end if;

  return query
    with candidatos as (
      select p.loja_slug as c_loja, i.slug as c_slug, i.id as c_id, i.aprovado_em as c_aprovado,
             exists (select 1 from public.afiliacoes a2 join public.items i2 on i2.id = a2.item_id
                     where a2.afiliado_id = v_dono and i2.producer_id = i.producer_id) as c_vinculo
      from public.items i join public.producers p on p.id = i.producer_id
      where i.slug = p_produto and i.status_aprovacao = 'aprovado'
        and p.status_verificacao = 'aprovado' and p.loja_slug is not null
    )
    select c.c_loja, c.c_slug, c.c_id, null::uuid, null::text, false, false
    from candidatos c
    where c.c_vinculo or (select count(*) from candidatos) = 1
    order by c.c_vinculo desc, c.c_aprovado desc nulls last
    limit 1;
end; $$;
revoke execute on function public.abrir_link_afiliado(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.abrir_link_afiliado(text, text, text, text, boolean) to service_role;

-- 5. Loja suspensa + caminhos de arquivo -------------------------------------------
create or replace function public.salvar_minha_loja(
  p_slug text, p_nome text, p_descricao text, p_foto text,
  p_cor_principal text, p_cor_destaque text, p_fonte text, p_layout text)
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
      loja_descricao = nullif(trim(p_descricao), ''), loja_foto_path = nullif(p_foto, ''),
      loja_cor_principal = nullif(lower(p_cor_principal), ''), loja_cor_destaque = nullif(lower(p_cor_destaque), ''),
      loja_fonte = nullif(p_fonte, ''), loja_layout = nullif(p_layout, '')
  where id = v_id;
end; $$;

-- "<uuid do dono>/<nome-do-arquivo>": sem subpastas, sem "..", só caracteres seguros
create or replace function public.caminho_valido(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$'
     and p !~ '\.\.';
$$;

alter table public.producers
  add constraint producers_caminhos_validos check (
    (documento_path is null or public.caminho_valido(documento_path))
    and (documento_responsavel_path is null or public.caminho_valido(documento_responsavel_path))
    and (loja_foto_path is null or public.caminho_valido(loja_foto_path))) not valid;
alter table public.storefronts
  add constraint storefronts_foto_da_pasta check (
    foto_path is null or (public.caminho_valido(foto_path) and starts_with(foto_path, revendedor_id::text || '/'))) not valid;

-- fotos e arquivo do item sempre na pasta do dono da loja
create or replace function public.items_valida_caminhos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pasta text;
begin
  select user_id::text || '/' into v_pasta from public.producers where id = new.producer_id;
  if exists (select 1 from unnest(coalesce(new.fotos, '{}')) f
             where not public.caminho_valido(f) or not starts_with(f, v_pasta)) then
    raise exception 'foto_fora_da_pasta';
  end if;
  if new.arquivo_path is not null
     and (not public.caminho_valido(new.arquivo_path) or not starts_with(new.arquivo_path, v_pasta)) then
    raise exception 'arquivo_fora_da_pasta';
  end if;
  return new;
end; $$;
revoke execute on function public.items_valida_caminhos() from public, anon, authenticated;
create trigger items_b_valida_caminhos before insert or update of fotos, arquivo_path on public.items
  for each row execute function public.items_valida_caminhos();

-- 6. Afiliações ------------------------------------------------------------------
-- era_catalogo: a afiliação existia pelo catálogo antes de virar "vendedor da loja"
alter table public.afiliacoes add column era_catalogo boolean not null default false;

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
    set era_catalogo = public.afiliacoes.era_catalogo or public.afiliacoes.origem = 'catalogo',
        status = 'aprovada', origem = 'vendedor_proprio', vendedor_id = excluded.vendedor_id,
        decidido_em = now();
end; $$;
revoke execute on function public.sincronizar_vendedor(uuid, uuid) from public, anon, authenticated;

create or replace function public.definir_status_vendedor(p_vendedor uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.loja_vendedores
  set status = case when p_ativo then 'ativo' else 'desativado' end,
      desativado_em = case when p_ativo then null else now() end
  where id = p_vendedor and producer_id = public.minha_loja_id() and user_id is not null
    and status <> case when p_ativo then 'ativo' else 'desativado' end;
  if not found then raise exception 'vendedor_nao_encontrado'; end if;
  if p_ativo then
    perform public.sincronizar_vendedor(p_vendedor);
  else
    -- o que era afiliação de catálogo volta a ser do catálogo (com a comissão pública)
    update public.afiliacoes set origem = 'catalogo', vendedor_id = null, era_catalogo = false
    where vendedor_id = p_vendedor and era_catalogo;
  end if;
end; $$;

-- afiliar-se: recusada pode pedir de novo; vínculo de vendedor inativo vira catálogo
create or replace function public.afiliar_se(p_item uuid)
returns table (codigo text, status text)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_sf uuid; v_regra text; v_produtor uuid; v_atual record; v_novo text;
begin
  if not public.tem_papel('revendedor') then raise exception 'apenas_revendedor'; end if;
  select id into v_sf from public.storefronts where revendedor_id = v_uid;
  if v_sf is null then raise exception 'crie_sua_vitrine'; end if;
  select i.aprovacao_afiliacao, i.producer_id into v_regra, v_produtor
  from public.items i join public.producers p on p.id = i.producer_id
  where i.id = p_item and i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if v_regra is null then raise exception 'item_indisponivel'; end if;
  if public.eh_dono_produtor(v_produtor) then raise exception 'afiliacao_propria'; end if;
  if public.endereco_repetido(v_uid, p_item) then raise exception 'endereco_repetido'; end if;
  v_novo := case v_regra when 'automatica' then 'aprovada' else 'pendente' end;

  select a.id, a.status, a.vendedor_id, coalesce(v.status, 'ativo') as vinculo
  into v_atual
  from public.afiliacoes a left join public.loja_vendedores v on v.id = a.vendedor_id
  where a.afiliado_id = v_uid and a.item_id = p_item;

  if v_atual.id is null then
    insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status, decidido_em)
    values (v_uid, v_sf, p_item, v_novo, case when v_novo = 'aprovada' then now() end);
  elsif v_atual.status = 'recusada' or (v_atual.vendedor_id is not null and v_atual.vinculo <> 'ativo') then
    update public.afiliacoes
    set status = v_novo, decidido_em = case when v_novo = 'aprovada' then now() end,
        origem = 'catalogo', vendedor_id = null, era_catalogo = false, criado_em = now()
    where id = v_atual.id;
  end if;
  return query select a.codigo, a.status from public.afiliacoes a where a.afiliado_id = v_uid and a.item_id = p_item;
end; $$;

-- trocar o endereço do produto não pode deixar um afiliado com dois links iguais
create or replace function public.items_slug_sem_conflito()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.slug is distinct from old.slug and exists (
      select 1 from public.afiliacoes a
      join public.afiliacoes b on b.afiliado_id = a.afiliado_id and b.status <> 'recusada'
      join public.items i2 on i2.id = b.item_id and i2.id <> new.id and i2.slug = new.slug
      where a.item_id = new.id and a.status <> 'recusada') then
    raise exception 'slug_conflita_afiliado';
  end if;
  return new;
end; $$;
revoke execute on function public.items_slug_sem_conflito() from public, anon, authenticated;
create trigger items_c_slug_sem_conflito before update of slug on public.items
  for each row execute function public.items_slug_sem_conflito();

-- 7. Relatório mensal no horário de Brasília, com os valores vigentes no mês ---------
create or replace function public.relatorio_comissoes(p_mes date)
returns table (nome text, email text, arroba text, forma_pagamento text, comissao_percentual numeric,
               status text, cliques bigint, pedidos bigint, vendido_centavos bigint, comissao_centavos bigint)
language sql stable security definer set search_path = '' as $$
  with periodo as (
    select (date_trunc('month', p_mes::timestamp) at time zone 'America/Sao_Paulo') as ini,
           ((date_trunc('month', p_mes::timestamp) + interval '1 month') at time zone 'America/Sao_Paulo') as fim
  )
  select pr.nome, v.email, s.slug,
         -- valores que valiam no fim do mês (pelo histórico), não os de hoje
         coalesce((select h.valor_novo from public.loja_vendedores_historico h, periodo
                   where h.vendedor_id = v.id and h.campo = 'forma_pagamento' and h.alterado_em < periodo.fim
                   order by h.alterado_em desc limit 1), v.forma_pagamento),
         coalesce((select h.valor_novo::numeric from public.loja_vendedores_historico h, periodo
                   where h.vendedor_id = v.id and h.campo = 'comissao_percentual' and h.alterado_em < periodo.fim
                   order by h.alterado_em desc limit 1), v.comissao_percentual),
         coalesce((select h.valor_novo from public.loja_vendedores_historico h, periodo
                   where h.vendedor_id = v.id and h.campo = 'status' and h.alterado_em < periodo.fim
                   order by h.alterado_em desc limit 1), v.status),
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

-- 8. Decreto 7.962/2013: identificação completa de quem vende ------------------------
drop function if exists public.loja_publica(text);
create or replace function public.loja_publica(p_slug text)
returns table (id uuid, loja_slug text, loja_nome text, loja_descricao text, loja_foto_path text,
               cor_principal text, cor_destaque text, fonte text, layout text,
               razao_social text, cnpj text, endereco text, cidade text, uf text, email_contato text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.loja_slug, coalesce(p.loja_nome, p.razao_social), p.loja_descricao, p.loja_foto_path,
         p.loja_cor_principal, p.loja_cor_destaque, p.loja_fonte, p.loja_layout,
         p.razao_social, p.cnpj,
         concat_ws(', ', nullif(concat_ws(', ', p.logradouro, p.numero), ''), nullif(p.complemento, ''), p.bairro,
                   case when p.cep is not null then 'CEP ' || substr(p.cep, 1, 5) || '-' || substr(p.cep, 6) end),
         p.cidade, p.uf, p.email_contato
  from public.producers p where p.loja_slug = p_slug and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.loja_publica(text) from public;
grant execute on function public.loja_publica(text) to anon, authenticated, service_role;

-- 9. Retenção (Política de Privacidade): cliques com mais de 24 meses ----------------
create or replace function public.apagar_dados_vencidos()
returns void language sql security definer set search_path = '' as $$
  delete from public.clicks where criado_em < now() - interval '24 months';
$$;
revoke execute on function public.apagar_dados_vencidos() from public, anon, authenticated;

-- agenda diária com pg_cron, quando a extensão existir (no Supabase existe)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('staypse-apagar-dados-vencidos', '17 6 * * *', 'select public.apagar_dados_vencidos()');
  end if;
exception when others then
  raise notice 'pg_cron indisponível: agende public.apagar_dados_vencidos() manualmente (%).', sqlerrm;
end $$;
