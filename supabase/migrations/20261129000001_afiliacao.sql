-- =========================================================================
-- Afiliação (item 2 da estratégia): convite por produto, materiais de
-- divulgação e ordenação do catálogo por mais vendidos.
--
--  1. Afiliação automática ou manual por produto: JÁ existe em
--     items.aprovacao_afiliacao ('automatica' | 'manual'). Esta migração
--     não cria uma coluna duplicada; só passa a compartilhar as checagens
--     de afiliar_se com o convite (função interna afiliar_interno).
--  2. Convite por produto: a loja gera um link; no banco fica só o hash
--     sha256 do código (como no convite de vendedor). Vale por 30 dias,
--     é de uso único e pode ser revogado.
--  3. Texto de divulgação e regras de divulgação no item (≤ 1000 caracteres).
--  4. Catálogo do afiliado: ordem "mais vendidos (7 dias)" sem expor números.
-- =========================================================================

-- 1. Materiais de divulgação no item --------------------------------------
-- Colunas privadas (fora do select público de items): o afiliado as lê pelo
-- catálogo (função abaixo) e a loja pelo itens_privados().
alter table public.items
  add column texto_divulgacao  text check (char_length(texto_divulgacao) <= 1000),
  add column regras_divulgacao text check (char_length(regras_divulgacao) <= 1000);
grant insert (texto_divulgacao, regras_divulgacao) on public.items to authenticated;
grant update (texto_divulgacao, regras_divulgacao) on public.items to authenticated;

-- o alerta de palavras proibidas também olha os textos de divulgação
-- (mesma lógica da migração 18_area_produtor, com os dois campos a mais)
create or replace function public.items_preenche_automaticos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.declaracao_nf and (tg_op = 'INSERT' or not old.declaracao_nf) then
    new.declaracao_nf_em := now();
  elsif not new.declaracao_nf then
    new.declaracao_nf_em := null;
  end if;

  new.alerta_palavras := public.palavras_proibidas_em(
    concat_ws(' ', new.nome, new.descricao, new.instrucoes_pos_compra, new.texto_divulgacao, new.regras_divulgacao));
  return new;
end;
$$;

-- 2. Convites de afiliação por produto ------------------------------------
create table public.convites_afiliacao (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items (id) on delete cascade,
  producer_id  uuid not null references public.producers (id) on delete cascade,
  -- só o HASH do código fica guardado; o link em si a loja vê uma vez
  token_hash   text not null unique,
  expira_em    timestamptz not null,
  revogado_em  timestamptz,
  usado_por    uuid references public.profiles (id) on delete set null,
  usado_em     timestamptz,
  criado_em    timestamptz not null default now()
);
create index convites_afiliacao_item_idx on public.convites_afiliacao (item_id);
create index convites_afiliacao_loja_idx on public.convites_afiliacao (producer_id);

-- tudo passa pelas funções abaixo (o hash nunca sai pelo PostgREST)
alter table public.convites_afiliacao enable row level security;
revoke all on public.convites_afiliacao from anon, authenticated;

-- Gera o convite. Devolve o código UMA vez. Só a dona do item.
create or replace function public.criar_convite_afiliacao(p_item uuid, p_dias integer default 30)
returns text language plpgsql security definer set search_path = '' as $$
declare v_loja uuid; v_token text;
begin
  select i.producer_id into v_loja from public.items i
  where i.id = p_item and i.status_aprovacao = 'aprovado' and public.eh_dono_produtor(i.producer_id);
  if v_loja is null then raise exception 'item_indisponivel'; end if;
  if p_dias is null or p_dias < 1 or p_dias > 90 then raise exception 'validade_invalida'; end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.convites_afiliacao (item_id, producer_id, token_hash, expira_em)
  values (p_item, v_loja, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + make_interval(days => p_dias));
  return v_token;
end; $$;
revoke execute on function public.criar_convite_afiliacao(uuid, integer) from public, anon;
grant execute on function public.criar_convite_afiliacao(uuid, integer) to authenticated;

create or replace function public.revogar_convite_afiliacao(p_convite uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.convites_afiliacao
  set revogado_em = now()
  where id = p_convite and public.eh_dono_produtor(producer_id) and revogado_em is null and usado_em is null;
  if not found then raise exception 'convite_nao_encontrado'; end if;
end; $$;
revoke execute on function public.revogar_convite_afiliacao(uuid) from public, anon;
grant execute on function public.revogar_convite_afiliacao(uuid) to authenticated;

-- Lista da loja (sem o código: ele não é guardado). situacao: ativo, usado, revogado ou expirado.
create or replace function public.meus_convites_afiliacao()
returns table (id uuid, item_id uuid, item_nome text, criado_em timestamptz, expira_em timestamptz, situacao text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.item_id, i.nome, c.criado_em, c.expira_em,
         case when c.revogado_em is not null then 'revogado'
              when c.usado_em is not null then 'usado'
              when c.expira_em < now() then 'expirado'
              else 'ativo' end
  from public.convites_afiliacao c
  join public.items i on i.id = c.item_id
  where public.eh_dono_produtor(c.producer_id)
  order by c.criado_em desc;
$$;
revoke execute on function public.meus_convites_afiliacao() from public, anon;
grant execute on function public.meus_convites_afiliacao() to authenticated;

-- Quem abre o link vê o produto antes de aceitar (página pública /afiliar/[token]).
create or replace function public.ver_convite_afiliacao(p_token text)
returns table (loja_nome text, item_nome text, preco_centavos integer, comissao_percentual numeric, situacao text)
language sql stable security definer set search_path = '' as $$
  select coalesce(p.loja_nome, p.razao_social), i.nome, i.preco_centavos, i.comissao_percentual,
         case when c.revogado_em is not null then 'revogado'
              when c.usado_em is not null then 'usado'
              when c.expira_em < now() then 'expirado'
              when i.status_aprovacao <> 'aprovado' or p.status_verificacao <> 'aprovado' then 'indisponivel'
              else 'ativo' end
  from public.convites_afiliacao c
  join public.items i on i.id = c.item_id
  join public.producers p on p.id = c.producer_id
  where c.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;
revoke execute on function public.ver_convite_afiliacao(text) from public;
grant execute on function public.ver_convite_afiliacao(text) to anon, authenticated;

-- 3. Afiliar-se: checagens compartilhadas ---------------------------------
-- É a lógica de afiliar_se (migração 20261127000001) sem mudança; a única
-- diferença é p_forcar_aprovada, usado pelo convite (a loja já escolheu a pessoa).
create or replace function public.afiliar_interno(p_item uuid, p_forcar_aprovada boolean)
returns table (codigo text, status text)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_sf uuid; v_regra text; v_produtor uuid; v_atual record; v_novo text;
begin
  if not public.tem_papel('revendedor') then raise exception 'apenas_revendedor'; end if;
  -- KYC é da Lytex: sem recebedor aprovado, só navega no catálogo
  if not public.recebedor_aprovado(v_uid, 'afiliado') then raise exception 'recebedor_pendente'; end if;
  select id into v_sf from public.storefronts where revendedor_id = v_uid;
  if v_sf is null then raise exception 'crie_sua_vitrine'; end if;
  select i.aprovacao_afiliacao, i.producer_id into v_regra, v_produtor
  from public.items i join public.producers p on p.id = i.producer_id
  where i.id = p_item and i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if v_regra is null then raise exception 'item_indisponivel'; end if;
  if public.eh_dono_produtor(v_produtor) then raise exception 'afiliacao_propria'; end if;
  if exists (select 1 from public.loja_afiliados_bloqueados b where b.producer_id = v_produtor and b.afiliado_id = v_uid) then
    raise exception 'afiliado_bloqueado';
  end if;
  if public.endereco_repetido(v_uid, p_item) then raise exception 'endereco_repetido'; end if;
  v_novo := case when p_forcar_aprovada or v_regra = 'automatica' then 'aprovada' else 'pendente' end;

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
  elsif p_forcar_aprovada and v_atual.status = 'pendente' then
    -- convite: quem já pediu e estava esperando passa a aprovado
    update public.afiliacoes set status = 'aprovada', decidido_em = now() where id = v_atual.id;
  end if;
  return query select a.codigo, a.status from public.afiliacoes a where a.afiliado_id = v_uid and a.item_id = p_item;
end; $$;
revoke execute on function public.afiliar_interno(uuid, boolean) from public, anon, authenticated;

create or replace function public.afiliar_se(p_item uuid)
returns table (codigo text, status text)
language plpgsql security definer set search_path = '' as $$
begin
  return query select * from public.afiliar_interno(p_item, false);
end; $$;

-- Aceite do convite: as mesmas checagens de afiliar_se, e a afiliação já sai aprovada.
create or replace function public.afiliar_por_convite(p_token text)
returns table (codigo text, status text, item_nome text)
language plpgsql security definer set search_path = '' as $$
declare v record; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'apenas_revendedor'; end if;
  select c.id, c.item_id, c.expira_em, c.revogado_em, c.usado_por, c.usado_em into v
  from public.convites_afiliacao c
  where c.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if v.id is null then raise exception 'convite_invalido'; end if;
  if v.revogado_em is not null then raise exception 'convite_revogado'; end if;
  if v.usado_em is not null and v.usado_por is distinct from v_uid then raise exception 'convite_usado'; end if;
  if v.expira_em < now() then raise exception 'convite_expirado'; end if;

  -- as checagens (recebedor aprovado, vitrine, bloqueio da loja, item aprovado...) vêm de afiliar_interno
  perform 1 from public.afiliar_interno(v.item_id, true);
  update public.convites_afiliacao set usado_por = v_uid, usado_em = coalesce(usado_em, now()) where id = v.id;
  return query
    select a.codigo, a.status, i.nome
    from public.afiliacoes a join public.items i on i.id = a.item_id
    where a.afiliado_id = v_uid and a.item_id = v.item_id;
end; $$;
revoke execute on function public.afiliar_por_convite(text) from public, anon;
grant execute on function public.afiliar_por_convite(text) to authenticated;

-- 4. Catálogo do afiliado -----------------------------------------------------
-- p_ordem 'vendidos': mais vendidos nos últimos 7 dias (pedidos pagos, itens não
-- cancelados). Só a ORDEM sai daqui: nenhum número de venda é devolvido.
drop function if exists public.catalogo_afiliados();
create or replace function public.catalogo_afiliados(p_ordem text default 'recentes')
returns table (id uuid, slug text, nome text, fotos text[], preco_centavos integer, comissao_percentual numeric,
               tipo text, categoria text, aprovacao_afiliacao text, produtor_nome text, loja_slug text,
               minha_afiliacao_status text, texto_divulgacao text, regras_divulgacao text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.slug, i.nome, i.fotos, i.preco_centavos, i.comissao_percentual, i.tipo, i.categoria,
         i.aprovacao_afiliacao, coalesce(p.loja_nome, p.razao_social), p.loja_slug, a.status,
         i.texto_divulgacao, i.regras_divulgacao
  from public.items i
  join public.producers p on p.id = i.producer_id
  left join public.afiliacoes a on a.item_id = i.id and a.afiliado_id = (select auth.uid())
  left join (
    select oi.item_id, sum(oi.quantidade) as qtd
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where p_ordem = 'vendidos' and o.status = 'pago' and o.pago_em > now() - interval '7 days'
      and oi.status_entrega not in ('cancelado', 'devolvido')
    group by oi.item_id
  ) v on v.item_id = i.id
  where i.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado'
  order by coalesce(v.qtd, 0) desc, i.aprovado_em desc nulls last;
$$;
revoke execute on function public.catalogo_afiliados(text) from public, anon;
grant execute on function public.catalogo_afiliados(text) to authenticated;
