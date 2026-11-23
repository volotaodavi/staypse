-- =========================================================================
-- Migração — Código de indicação (atribuição por código digitado no checkout)
-- =========================================================================
-- Problema: quem clica no celular e compra no computador perde o cookie de
-- atribuição. Solução: o comprador pode digitar, no checkout, o CÓDIGO de quem
-- indicou. O código NÃO é desconto: só diz "quem indicou". O preço é o mesmo.
--
-- Qual é o código? O próprio @ (slug da vitrine) de quem indica — afiliado ou
-- vendedor próprio. Sem identificador novo: storefronts.slug já é único.
-- Case-insensitive; um "@" no começo é ignorado.
--
-- Regras (todas aqui, no banco — a tela só repassa o que a pessoa digitou):
--  * vale para o item se quem indica tem afiliação APROVADA a ele e:
--      - afiliado de catálogo: recebedor "afiliado" aprovado na Lytex;
--      - vendedor próprio: vínculo ATIVO com a loja do item; se for split_direto,
--        recebedor "vendedor" aprovado ("folha" também vale, para o relatório);
--  * quem a loja bloqueou não vale; o dono da loja nunca indica a si mesmo,
--    nem o comprador a si mesmo;
--  * PRECEDÊNCIA: se há cookie de clique para o item E código digitado, o
--    CÓDIGO DIGITADO vence (é a intenção explícita do comprador). Sem código,
--    vale o cookie (último clique), como antes;
--  * a origem fica registrada no pedido (orders.atribuicao_origem: 'link' ou
--    'codigo'; nulo = venda direta) para o painel e a auditoria;
--  * código inválido NÃO cria o pedido (o comprador vê "código não vale para
--    este produto" e pode apagar o campo para seguir sem indicação). A mensagem
--    é neutra: não revela se o código existe em outro produto/loja;
--  * antifraude: no máximo 8 tentativas inválidas por hora por IP (só o hash).

-- -------------------------------------------------------------------------
-- 1. Origem da atribuição no pedido
-- -------------------------------------------------------------------------
alter table public.orders
  add column atribuicao_origem text check (atribuicao_origem in ('link', 'codigo'));
comment on column public.orders.atribuicao_origem is
  'Como a indicação chegou ao pedido: link (cookie do link curto) ou codigo (digitado no checkout). Nulo = sem indicação.';
-- pedidos anteriores a esta migração só podiam vir do link
update public.orders set atribuicao_origem = 'link' where revendedor_id is not null and atribuicao_origem is null;

-- se a indicação cai (ex.: recebedor não aprovado), a origem cai junto
create or replace function public.orders_exige_recebedores()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_forma text;
begin
  if not public.recebedor_aprovado((select p.user_id from public.producers p where p.id = new.producer_id), 'produtor') then
    raise exception 'loja_sem_recebedor';
  end if;
  if new.revendedor_id is not null then
    if new.vendedor_id is not null then
      select forma_pagamento into v_forma from public.loja_vendedores where id = new.vendedor_id;
      if v_forma = 'split_direto' and not public.recebedor_aprovado(new.revendedor_id, 'vendedor') then
        new.revendedor_id := null; new.vendedor_id := null; new.storefront_id := null;
      end if;
    elsif not public.recebedor_aprovado(new.revendedor_id, 'afiliado') then
      new.revendedor_id := null; new.storefront_id := null;
    end if;
  end if;
  if new.revendedor_id is null then new.atribuicao_origem := null; end if;
  return new;
end; $$;

-- -------------------------------------------------------------------------
-- 2. Tentativas inválidas por IP (hash) — mesmo padrão dos cliques e da lista de espera
-- -------------------------------------------------------------------------
create table public.codigo_indicacao_tentativas (
  id         bigint generated always as identity primary key,
  ip_hash    text not null check (char_length(ip_hash) <= 128),
  criado_em  timestamptz not null default now()
);
create index codigo_indicacao_tentativas_idx on public.codigo_indicacao_tentativas (ip_hash, criado_em);
alter table public.codigo_indicacao_tentativas enable row level security;
revoke all on public.codigo_indicacao_tentativas from anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. Resolver um código para um item (interna: só devolve linha se o código VALE)
-- -------------------------------------------------------------------------
create or replace function public.resolver_codigo_indicacao(p_item uuid, p_codigo text, p_comprador uuid)
returns table (afiliado_id uuid, storefront_id uuid, vendedor_id uuid, comissao numeric, vitrine_slug text)
language plpgsql stable security definer set search_path = '' as $$
declare v_slug text := ltrim(lower(trim(coalesce(p_codigo, ''))), '@'); a record;
begin
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then return; end if;

  select s.id as sf, s.slug, s.revendedor_id as quem, af.origem, af.vendedor_id as vend,
         it.comissao_percentual as comissao_item, it.producer_id, p.user_id as dono,
         v.status as vinculo, v.forma_pagamento, v.comissao_percentual as comissao_vend
  into a
  from public.storefronts s
  join public.afiliacoes af on af.afiliado_id = s.revendedor_id and af.item_id = p_item and af.status = 'aprovada'
  join public.items it on it.id = af.item_id and it.status_aprovacao = 'aprovado'
  join public.producers p on p.id = it.producer_id and p.status_verificacao = 'aprovado'
  left join public.loja_vendedores v on v.id = af.vendedor_id
  where s.slug = v_slug;
  if a.sf is null then return; end if;

  -- a loja não se indica; o comprador também não
  if a.quem = a.dono or a.quem is not distinct from p_comprador then return; end if;
  -- quem a loja bloqueou não indica
  if exists (select 1 from public.loja_afiliados_bloqueados b where b.producer_id = a.producer_id and b.afiliado_id = a.quem) then
    return;
  end if;

  if a.origem = 'vendedor_proprio' then
    if a.vinculo is distinct from 'ativo' then return; end if;
    -- split direto exige recebedor aprovado; "folha" não tem recebedor (conta no relatório)
    if a.forma_pagamento = 'split_direto' and not public.recebedor_aprovado(a.quem, 'vendedor') then return; end if;
    return query select a.quem, a.sf, a.vend, a.comissao_vend, a.slug;
  elsif a.origem = 'catalogo' then
    if not public.recebedor_aprovado(a.quem, 'afiliado') then return; end if;
    return query select a.quem, a.sf, null::uuid, a.comissao_item, a.slug;
  end if;
end; $$;
revoke execute on function public.resolver_codigo_indicacao(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.resolver_codigo_indicacao(uuid, text, uuid) to service_role;

-- -------------------------------------------------------------------------
-- 4. Conferir o código na tela (só o servidor): conta tentativas inválidas por IP.
--    Fica separada de criar_pedido porque um erro desfaria o registro da tentativa.
-- -------------------------------------------------------------------------
create or replace function public.validar_codigo_indicacao(p_item uuid, p_codigo text, p_ip_hash text, p_comprador uuid default null)
returns table (valido boolean, limitado boolean, vitrine_slug text)
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if p_ip_hash is not null and (
       select count(*) from public.codigo_indicacao_tentativas t
       where t.ip_hash = p_ip_hash and t.criado_em > now() - interval '1 hour') >= 8 then
    return query select false, true, null::text;
    return;
  end if;
  select * into r from public.resolver_codigo_indicacao(p_item, p_codigo, p_comprador);
  if r.afiliado_id is null then
    delete from public.codigo_indicacao_tentativas where criado_em < now() - interval '1 day';
    if p_ip_hash is not null then
      insert into public.codigo_indicacao_tentativas (ip_hash) values (p_ip_hash);
    end if;
    return query select false, false, null::text;
    return;
  end if;
  return query select true, false, r.vitrine_slug;
end; $$;
revoke execute on function public.validar_codigo_indicacao(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.validar_codigo_indicacao(uuid, text, text, uuid) to service_role;

-- -------------------------------------------------------------------------
-- 5. criar_pedido: igual à migração 9, mais o código digitado (que vence o cookie)
-- -------------------------------------------------------------------------
drop function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text);
create or replace function public.criar_pedido(
  p_item uuid, p_quantidade integer, p_modo text, p_afiliado uuid, p_comprador_id uuid,
  p_nome text, p_email text, p_documento text, p_telefone text, p_endereco jsonb, p_termos_versao text,
  p_codigo text default null)
returns table (id uuid, codigo text, token text)
language plpgsql security definer set search_path = '' as $$
declare
  q record; a record; c record;
  v_afiliado uuid; v_vitrine uuid; v_vendedor uuid; v_comissao numeric := 0; v_origem text;
  v_dono uuid;
  v_email text := lower(trim(p_email)); v_doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
  v_end jsonb; v_id uuid; v_codigo text; v_token text;
begin
  select * into q from public.cotar_pedido(p_item, p_quantidade, p_modo);

  -- dados do comprador (o banco confere de novo o que a tela já validou)
  if char_length(trim(coalesce(p_nome, ''))) not between 2 and 120 then raise exception 'nome_invalido'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'email_invalido'; end if;
  if char_length(v_doc) <> 11 or not public.documento_valido(v_doc) then raise exception 'cpf_invalido'; end if;
  if v_tel is not null and char_length(v_tel) not between 10 and 11 then raise exception 'telefone_invalido'; end if;
  if p_termos_versao is null or char_length(p_termos_versao) not between 1 and 40 then raise exception 'termos_invalidos'; end if;

  if p_modo = 'envio' then
    if coalesce(p_endereco ->> 'cep', '') !~ '^[0-9]{8}$'
       or char_length(coalesce(p_endereco ->> 'logradouro', '')) not between 2 and 200
       or char_length(coalesce(p_endereco ->> 'numero', '')) not between 1 and 20
       or char_length(coalesce(p_endereco ->> 'bairro', '')) not between 2 and 100
       or char_length(coalesce(p_endereco ->> 'cidade', '')) not between 2 and 120
       or coalesce(p_endereco ->> 'uf', '') !~ '^[A-Z]{2}$'
       or char_length(coalesce(p_endereco ->> 'complemento', '')) > 100 then
      raise exception 'endereco_invalido';
    end if;
    -- só as chaves conhecidas (nada de lixo extra no pedido)
    v_end := jsonb_build_object('cep', p_endereco ->> 'cep', 'logradouro', p_endereco ->> 'logradouro',
                                'numero', p_endereco ->> 'numero', 'complemento', coalesce(p_endereco ->> 'complemento', ''),
                                'bairro', p_endereco ->> 'bairro', 'cidade', p_endereco ->> 'cidade', 'uf', p_endereco ->> 'uf');
  end if;

  if nullif(trim(coalesce(p_codigo, '')), '') is not null then
    -- 1) CÓDIGO digitado: vence o cookie (intenção explícita do comprador). Inválido = erro,
    --    para o comprador corrigir ou apagar o campo (nunca atribui "em silêncio" a outra pessoa).
    select * into c from public.resolver_codigo_indicacao(p_item, p_codigo, p_comprador_id);
    if c.afiliado_id is null then raise exception 'codigo_indicacao_invalido'; end if;
    v_afiliado := c.afiliado_id; v_vitrine := c.storefront_id; v_vendedor := c.vendedor_id;
    v_comissao := c.comissao; v_origem := 'codigo';
  elsif p_afiliado is not null and p_afiliado is distinct from p_comprador_id then
    -- 2) cookie do link: só vale com afiliação APROVADA para este item; ninguém indica a si mesmo
    --    e o dono da loja não é afiliado dela
    select pr.user_id into v_dono from public.producers pr where pr.id = q.producer_id;
    select af.storefront_id, af.origem, af.vendedor_id, it.comissao_percentual, v.status as vinculo,
           v.comissao_percentual as comissao_vendedor
    into a
    from public.afiliacoes af
    join public.items it on it.id = af.item_id
    left join public.loja_vendedores v on v.id = af.vendedor_id
    where af.afiliado_id = p_afiliado and af.item_id = p_item and af.status = 'aprovada'
      and af.afiliado_id is distinct from v_dono;
    if a.storefront_id is not null then
      if a.origem = 'vendedor_proprio' and a.vinculo = 'ativo' then
        v_afiliado := p_afiliado; v_vitrine := a.storefront_id; v_vendedor := a.vendedor_id; v_comissao := a.comissao_vendedor;
        v_origem := 'link';
      elsif a.origem = 'catalogo' then
        v_afiliado := p_afiliado; v_vitrine := a.storefront_id; v_comissao := a.comissao_percentual;
        v_origem := 'link';
      end if;
    end if;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.orders (producer_id, revendedor_id, storefront_id, vendedor_id, comprador_id,
                             comprador_nome, comprador_email, comprador_documento, comprador_telefone,
                             endereco_entrega, subtotal_centavos, frete_centavos, total_centavos,
                             resumo_aceito_em, termos_versao, codigo, acesso_hash, entrega_modo, prazo_entrega_dias,
                             atribuicao_origem)
  values (q.producer_id, v_afiliado, v_vitrine, v_vendedor, p_comprador_id,
          trim(p_nome), v_email, v_doc, v_tel,
          v_end, q.subtotal_centavos, q.frete_centavos, q.total_centavos,
          now(), p_termos_versao, v_codigo, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_modo, q.prazo_entrega_dias,
          v_origem)
  returning orders.id into v_id;

  insert into public.order_items (order_id, item_id, nome_item, tipo_item, quantidade, preco_unitario_centavos, comissao_percentual)
  values (v_id, q.item_id, q.nome, q.tipo, q.quantidade, q.preco_unitario_centavos, v_comissao);

  return query select v_id, v_codigo, v_token;
end; $$;
revoke execute on function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text, text)
  to service_role;

-- -------------------------------------------------------------------------
-- 6. "Minhas vendas" do afiliado/vendedor: agora com a origem (link ou código).
--    Continua SEM nenhum dado do comprador.
-- -------------------------------------------------------------------------
drop function public.minhas_comissoes(text, timestamptz, timestamptz);
create or replace function public.minhas_comissoes(p_papel text, p_inicio timestamptz, p_fim timestamptz)
returns table (pedido_id uuid, data timestamptz, produto text, quantidade integer, loja text,
               valor_centavos bigint, comissao_centavos bigint, status_pedido text, situacao text,
               previsao timestamptz, origem_atribuicao text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.criado_em, oi.nome_item, oi.quantidade, coalesce(p.loja_nome, p.razao_social),
         (oi.quantidade * oi.preco_unitario_centavos)::bigint,
         floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)::bigint,
         o.status, public.situacao_comissao(o.status, o.arrependimento_ate),
         case when o.status = 'pago' then o.arrependimento_ate end,
         o.atribuicao_origem
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.producers p on p.id = o.producer_id
  where o.revendedor_id = (select auth.uid())
    and ((p_papel = 'vendedor' and o.vendedor_id is not null) or (p_papel = 'afiliado' and o.vendedor_id is null))
    and o.criado_em >= p_inicio and o.criado_em < p_fim
  order by o.criado_em desc;
$$;
revoke execute on function public.minhas_comissoes(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.minhas_comissoes(text, timestamptz, timestamptz) to authenticated;
