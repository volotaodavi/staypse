-- =========================================================================
-- Entrega própria da loja (motoboy/motorista), em todo o território nacional
-- =========================================================================
-- * A loja cria ZONAS de entrega (faixa de CEP, cidade/UF ou bairros de uma cidade), com preço
--   fixo, por km ou grátis acima de X, prazo e dias/horário de entrega. Convive com o frete por
--   correio: o comprador escolhe a opção disponível para o CEP dele.
-- * Preço e zona são calculados AQUI (cotar_pedido), nunca vêm do navegador. A cidade/bairro/
--   coordenadas do CEP vêm do cache cep_geo, preenchido só pelo servidor (BrasilAPI CEP v2).
-- * Distância por km: linha reta (haversine) entre o CEP da loja e o do comprador, vezes o fator
--   de rota da zona (padrão 1,3). Sem coordenadas, usa o preço fixo da zona ou a zona não vale.
--   Nunca inventa distância. Preço = max(taxa mínima, floor(km_rota * preço_km)).
-- * Entregador e status da entrega: só a loja e o comprador do pedido veem (LGPD). Afiliado não.

-- -------------------------------------------------------------------------
-- 1. Utilitários
-- -------------------------------------------------------------------------
create or replace function public.norm_texto(t text) returns text
language sql immutable set search_path = '' as $$
  select lower(trim(regexp_replace(translate(coalesce(t, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'),
    '\s+', ' ', 'g')));
$$;

-- distância em linha reta (haversine), em km
create or replace function public.distancia_km(lat1 double precision, lon1 double precision,
                                               lat2 double precision, lon2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371.0088 * asin(sqrt(least(1,
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2))));
$$;

-- -------------------------------------------------------------------------
-- 2. Cache de geocódigo do CEP (só o servidor lê e escreve)
-- -------------------------------------------------------------------------
create table public.cep_geo (
  cep           text primary key check (cep ~ '^[0-9]{8}$'),
  cidade        text,
  uf            text check (uf ~ '^[A-Z]{2}$'),
  bairro        text,
  rua           text,
  ibge          text check (ibge ~ '^[0-9]{7}$'),
  latitude      double precision check (latitude between -90 and 90),
  longitude     double precision check (longitude between -180 and 180),
  atualizado_em timestamptz not null default now()
);
alter table public.cep_geo enable row level security;
revoke all on public.cep_geo from anon, authenticated;
grant select, insert, update on public.cep_geo to service_role;

-- -------------------------------------------------------------------------
-- 3. Zonas de entrega própria
-- -------------------------------------------------------------------------
create table public.entrega_zonas (
  id                     uuid primary key default gen_random_uuid(),
  producer_id            uuid not null references public.producers (id) on delete cascade,
  nome                   text not null check (char_length(nome) between 2 and 80),
  ativo                  boolean not null default true,
  -- cobertura: faixa de CEP, cidade inteira ou bairros de uma cidade
  cobertura              text not null check (cobertura in ('cep', 'cidade', 'bairro')),
  cep_inicio             text check (cep_inicio ~ '^[0-9]{8}$'),
  cep_fim                text check (cep_fim ~ '^[0-9]{8}$'),
  cidade                 text check (char_length(cidade) between 2 and 120),
  uf                     text check (uf ~ '^[A-Z]{2}$'),
  ibge                   text check (ibge ~ '^[0-9]{7}$'),
  bairros                text[] check (cardinality(bairros) between 1 and 100),
  -- preço
  preco_tipo             text not null check (preco_tipo in ('fixo', 'km', 'gratis_acima')),
  preco_fixo_centavos    integer check (preco_fixo_centavos between 0 and 100000),
  gratis_acima_centavos  integer check (gratis_acima_centavos between 1 and 10000000),
  preco_km_centavos      integer check (preco_km_centavos between 0 and 10000),
  taxa_minima_centavos   integer check (taxa_minima_centavos between 0 and 100000),
  km_max                 numeric(6, 1) check (km_max > 0 and km_max <= 5000),
  fator_rota             numeric(3, 2) not null default 1.30 check (fator_rota between 1 and 3),
  -- prazo e agenda
  prazo_tipo             text not null check (prazo_tipo in ('mesmo_dia', 'horas', 'dias')),
  prazo_valor            integer check (prazo_valor between 1 and 90),
  hora_limite            time,
  dias_semana            smallint[] not null default '{1,2,3,4,5,6}'
                           check (cardinality(dias_semana) between 1 and 7 and dias_semana <@ '{0,1,2,3,4,5,6}'::smallint[]),
  horario_inicio         time not null default '09:00',
  horario_fim            time not null default '18:00',
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  check (cobertura <> 'cep' or (cep_inicio is not null and cep_fim is not null and cep_inicio <= cep_fim)),
  check (cobertura = 'cep' or (cidade is not null and uf is not null)),
  check (cobertura <> 'bairro' or bairros is not null),
  check (preco_tipo <> 'fixo' or preco_fixo_centavos is not null),
  check (preco_tipo <> 'gratis_acima' or (preco_fixo_centavos is not null and gratis_acima_centavos is not null)),
  check (preco_tipo <> 'km' or (preco_km_centavos is not null and taxa_minima_centavos is not null)),
  check (prazo_tipo <> 'mesmo_dia' or hora_limite is not null),
  check (prazo_tipo = 'mesmo_dia' or prazo_valor is not null),
  check (horario_inicio < horario_fim)
);
create index entrega_zonas_loja_idx on public.entrega_zonas (producer_id) where ativo;
create trigger entrega_zonas_atualizado_em before update on public.entrega_zonas
  for each row execute function public.set_atualizado_em();

-- limite de zonas por loja (evita abuso)
create or replace function public.entrega_zonas_limite() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.entrega_zonas where producer_id = new.producer_id) >= 100 then
    raise exception 'limite_zonas';
  end if;
  return new;
end; $$;
create trigger entrega_zonas_limite before insert on public.entrega_zonas
  for each row execute function public.entrega_zonas_limite();

alter table public.entrega_zonas enable row level security;
revoke all on public.entrega_zonas from anon, authenticated;
grant select, insert, update, delete on public.entrega_zonas to authenticated;
-- só a PRÓPRIA loja (e não suspensa) lê e edita as zonas; comprador e afiliado só recebem o resultado da cotação
create policy "zonas: a loja vê as próprias" on public.entrega_zonas
  for select to authenticated using (producer_id in (select id from public.producers where user_id = (select auth.uid())));
create policy "zonas: a loja cria as próprias" on public.entrega_zonas
  for insert to authenticated with check (producer_id in
    (select id from public.producers where user_id = (select auth.uid()) and status_verificacao <> 'suspenso'));
create policy "zonas: a loja edita as próprias" on public.entrega_zonas
  for update to authenticated
  using (producer_id in (select id from public.producers where user_id = (select auth.uid()) and status_verificacao <> 'suspenso'))
  with check (producer_id in (select id from public.producers where user_id = (select auth.uid()) and status_verificacao <> 'suspenso'));
create policy "zonas: a loja apaga as próprias" on public.entrega_zonas
  for delete to authenticated using (producer_id in (select id from public.producers where user_id = (select auth.uid())));

-- texto do prazo e da agenda (usado na cotação e guardado no pedido)
create or replace function public.descrever_zona(z public.entrega_zonas) returns text
language sql immutable set search_path = '' as $$
  select case z.prazo_tipo
           when 'mesmo_dia' then 'Hoje, para pedidos pagos até ' || to_char(z.hora_limite, 'HH24:MI')
           when 'horas' then 'Em até ' || z.prazo_valor || ' hora(s)'
           else 'Em até ' || z.prazo_valor || ' dia(s)' end
         || '. Entregas ' ||
         (select string_agg((array['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'])[d + 1], ', ' order by d)
          from unnest(z.dias_semana) d)
         || ', das ' || to_char(z.horario_inicio, 'HH24:MI') || ' às ' || to_char(z.horario_fim, 'HH24:MI');
$$;

-- -------------------------------------------------------------------------
-- 4. Resolução da zona e do preço para um CEP (interno)
--    zona mais específica: bairro > faixa de CEP > cidade. Uma zona que não consegue dar preço
--    (fora do km máximo, ou por km sem coordenadas e sem preço fixo) é pulada.
-- -------------------------------------------------------------------------
create or replace function public.zona_para_cep(p_producer uuid, p_cep text, p_subtotal integer)
returns table (zona_id uuid, zona_nome text, frete_centavos integer, distancia_km numeric, prazo_texto text)
language plpgsql stable security definer set search_path = '' as $$
declare g record; l record; z public.entrega_zonas; v_km numeric; v_preco integer;
begin
  if p_cep is null or p_cep !~ '^[0-9]{8}$' then return; end if;
  select * into g from public.cep_geo where cep = p_cep;
  select cg.* into l from public.producers p join public.cep_geo cg on cg.cep = p.cep where p.id = p_producer;
  for z in
    select ez.* from public.entrega_zonas ez
    where ez.producer_id = p_producer and ez.ativo
      and ((ez.cobertura = 'cep' and p_cep between ez.cep_inicio and ez.cep_fim)
        or (ez.cobertura in ('cidade', 'bairro') and g.cep is not null
            and ((ez.ibge is not null and ez.ibge = g.ibge)
                 or (g.uf = ez.uf and public.norm_texto(g.cidade) = public.norm_texto(ez.cidade)))
            and (ez.cobertura = 'cidade'
                 or public.norm_texto(g.bairro) in (select public.norm_texto(b) from unnest(ez.bairros) b))))
    order by case ez.cobertura when 'bairro' then 3 when 'cep' then 2 else 1 end desc,
             case when ez.cobertura = 'cep' then ez.cep_fim::bigint - ez.cep_inicio::bigint end nulls last,
             ez.criado_em
  loop
    v_km := null;
    if z.preco_tipo = 'fixo' then
      v_preco := z.preco_fixo_centavos;
    elsif z.preco_tipo = 'gratis_acima' then
      v_preco := case when p_subtotal >= z.gratis_acima_centavos then 0 else z.preco_fixo_centavos end;
    elsif g.latitude is not null and l.latitude is not null then
      v_km := round((public.distancia_km(l.latitude, l.longitude, g.latitude, g.longitude) * z.fator_rota)::numeric, 2);
      if z.km_max is not null and v_km > z.km_max then continue; end if;
      v_preco := greatest(z.taxa_minima_centavos, floor(v_km * z.preco_km_centavos))::integer;
    elsif z.preco_fixo_centavos is not null then
      v_preco := z.preco_fixo_centavos;   -- sem coordenadas: cai para o preço fixo da zona
    else
      continue;                            -- sem coordenadas e sem preço fixo: não inventa distância
    end if;
    return query select z.id, z.nome, v_preco, v_km, public.descrever_zona(z);
    return;
  end loop;
end; $$;
revoke execute on function public.zona_para_cep(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.zona_para_cep(uuid, text, integer) to service_role;

-- cotação pública para a tela (frete bruto; "quem paga" entra na cotar_pedido)
create or replace function public.cotar_entrega_propria(p_item uuid, p_cep text, p_quantidade integer)
returns table (zona_nome text, frete_centavos integer, distancia_km numeric, prazo_texto text, loja_paga boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_pid uuid; v_quem text; v_sub integer;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 99 then raise exception 'quantidade_invalida'; end if;
  select p.id, it.preco_centavos * p_quantidade, p.frete_quem_paga into v_pid, v_sub, v_quem
  from public.items it join public.producers p on p.id = it.producer_id
  where it.id = p_item and it.tipo = 'fisico' and it.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if v_pid is null then return; end if;
  return query select z.zona_nome, case when v_quem = 'loja' then 0 else z.frete_centavos end,
                      z.distancia_km, z.prazo_texto, v_quem = 'loja'
               from public.zona_para_cep(v_pid, p_cep, v_sub) z;
end; $$;
revoke execute on function public.cotar_entrega_propria(uuid, text, integer) from public;
grant execute on function public.cotar_entrega_propria(uuid, text, integer) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 5. Pedido: novo modo 'propria' + cotação com CEP
-- -------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_entrega_modo_check;
alter table public.orders add constraint orders_entrega_modo_check
  check (entrega_modo in ('envio', 'retirada', 'digital', 'propria'));
alter table public.orders
  add column entrega_zona_nome   text,
  add column entrega_prazo_texto text;

drop function public.cotar_pedido(uuid, integer, text);
create or replace function public.cotar_pedido(p_item uuid, p_quantidade integer, p_modo text, p_cep text default null)
returns table (item_id uuid, nome text, tipo text, preco_unitario_centavos integer, quantidade integer,
               subtotal_centavos integer, frete_centavos integer, total_centavos integer,
               prazo_postagem_dias integer, prazo_entrega_dias integer, producer_id uuid,
               loja_slug text, loja_nome text, razao_social text, cnpj text,
               zona_nome text, prazo_texto text)
language plpgsql stable security definer set search_path = '' as $$
declare i record; z record; v_sub integer; v_frete integer := 0; v_zona text; v_prazo text;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 99 then raise exception 'quantidade_invalida'; end if;
  select it.id, it.nome, it.tipo, it.preco_centavos, it.estoque, it.retirada_local, it.prazo_postagem_dias,
         p.id as pid, p.loja_slug, coalesce(p.loja_nome, p.razao_social) as loja_nome, p.razao_social, p.cnpj,
         p.frete_fixo_centavos, p.frete_gratis_acima_centavos, p.frete_prazo_dias, p.frete_quem_paga
  into i
  from public.items it join public.producers p on p.id = it.producer_id
  where it.id = p_item and it.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
  if i.id is null then raise exception 'item_indisponivel'; end if;

  if i.tipo = 'fisico' and i.estoque is not null and i.estoque < p_quantidade then raise exception 'sem_estoque'; end if;
  v_sub := i.preco_centavos * p_quantidade;

  if i.tipo = 'digital' then
    if p_modo <> 'digital' then raise exception 'entrega_invalida'; end if;
  elsif p_modo = 'retirada' then
    if not i.retirada_local then raise exception 'entrega_invalida'; end if;
  elsif p_modo = 'envio' then
    if i.frete_fixo_centavos is null then raise exception 'frete_nao_configurado'; end if;
    v_frete := case when i.frete_quem_paga = 'loja' then 0   -- a loja assume o frete
                    when i.frete_gratis_acima_centavos is not null and v_sub >= i.frete_gratis_acima_centavos then 0
                    else i.frete_fixo_centavos end;
  elsif p_modo = 'propria' then
    select * into z from public.zona_para_cep(i.pid, p_cep, v_sub);
    if z.zona_id is null then raise exception 'entrega_propria_indisponivel'; end if;
    v_frete := case when i.frete_quem_paga = 'loja' then 0 else z.frete_centavos end;
    v_zona := z.zona_nome; v_prazo := z.prazo_texto;
  else
    raise exception 'entrega_invalida';
  end if;

  return query select i.id, i.nome, i.tipo, i.preco_centavos, p_quantidade, v_sub, v_frete, v_sub + v_frete,
                      i.prazo_postagem_dias, case when p_modo = 'envio' then i.frete_prazo_dias end,
                      i.pid, i.loja_slug, i.loja_nome, i.razao_social, i.cnpj, v_zona, v_prazo;
end; $$;
revoke execute on function public.cotar_pedido(uuid, integer, text, text) from public;
grant execute on function public.cotar_pedido(uuid, integer, text, text) to anon, authenticated, service_role;

-- criar_pedido: igual à anterior, aceitando o modo 'propria' (endereço obrigatório, CEP na cotação)
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
  select * into q from public.cotar_pedido(p_item, p_quantidade, p_modo, p_endereco ->> 'cep');

  -- dados do comprador (o banco confere de novo o que a tela já validou)
  if char_length(trim(coalesce(p_nome, ''))) not between 2 and 120 then raise exception 'nome_invalido'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'email_invalido'; end if;
  if char_length(v_doc) <> 11 or not public.documento_valido(v_doc) then raise exception 'cpf_invalido'; end if;
  if v_tel is not null and char_length(v_tel) not between 10 and 11 then raise exception 'telefone_invalido'; end if;
  if p_termos_versao is null or char_length(p_termos_versao) not between 1 and 40 then raise exception 'termos_invalidos'; end if;

  if p_modo in ('envio', 'propria') then
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
    select * into c from public.resolver_codigo_indicacao(p_item, p_codigo, p_comprador_id);
    if c.afiliado_id is null then raise exception 'codigo_indicacao_invalido'; end if;
    v_afiliado := c.afiliado_id; v_vitrine := c.storefront_id; v_vendedor := c.vendedor_id;
    v_comissao := c.comissao; v_origem := 'codigo';
  elsif p_afiliado is not null and p_afiliado is distinct from p_comprador_id then
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
                             atribuicao_origem, entrega_zona_nome, entrega_prazo_texto)
  values (q.producer_id, v_afiliado, v_vitrine, v_vendedor, p_comprador_id,
          trim(p_nome), v_email, v_doc, v_tel,
          v_end, q.subtotal_centavos, q.frete_centavos, q.total_centavos,
          now(), p_termos_versao, v_codigo, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_modo, q.prazo_entrega_dias,
          v_origem, q.zona_nome, q.prazo_texto)
  returning orders.id into v_id;

  insert into public.order_items (order_id, item_id, nome_item, tipo_item, quantidade, preco_unitario_centavos, comissao_percentual)
  values (v_id, q.item_id, q.nome, q.tipo, q.quantidade, q.preco_unitario_centavos, v_comissao);

  return query select v_id, v_codigo, v_token;
end; $$;
revoke execute on function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text, text)
  to service_role;

-- entregas_do_item: ganha "propria" (a loja tem alguma zona ativa; o CEP decide se vale)
drop function public.entregas_do_item(uuid);
create or replace function public.entregas_do_item(p_item uuid)
returns table (envio boolean, retirada boolean, digital boolean, frete_fixo_centavos integer,
               frete_gratis_acima_centavos integer, frete_prazo_dias integer, frete_quem_paga text,
               propria boolean)
language sql stable security definer set search_path = '' as $$
  select it.tipo = 'fisico' and p.frete_fixo_centavos is not null,
         it.tipo = 'fisico' and it.retirada_local,
         it.tipo = 'digital',
         case when p.frete_quem_paga = 'loja' and p.frete_fixo_centavos is not null then 0 else p.frete_fixo_centavos end,
         case when p.frete_quem_paga = 'loja' then null else p.frete_gratis_acima_centavos end,
         p.frete_prazo_dias, p.frete_quem_paga,
         it.tipo = 'fisico' and exists (select 1 from public.entrega_zonas z where z.producer_id = p.id and z.ativo)
  from public.items it join public.producers p on p.id = it.producer_id
  where it.id = p_item and it.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.entregas_do_item(uuid) from public;
grant execute on function public.entregas_do_item(uuid) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 6. Entregadores e andamento da entrega (LGPD: só a loja e o comprador do pedido)
-- -------------------------------------------------------------------------
create table public.entregadores (
  id          uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers (id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 80),
  telefone    text not null check (telefone ~ '^[0-9]{10,11}$'),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index entregadores_loja_idx on public.entregadores (producer_id);
alter table public.entregadores enable row level security;
revoke all on public.entregadores from anon, authenticated;
grant select, insert, update, delete on public.entregadores to authenticated;
create policy "entregadores: a loja vê os próprios" on public.entregadores
  for select to authenticated using (producer_id in (select id from public.producers where user_id = (select auth.uid())));
create policy "entregadores: a loja cria os próprios" on public.entregadores
  for insert to authenticated with check (producer_id in
    (select id from public.producers where user_id = (select auth.uid()) and status_verificacao <> 'suspenso'));
create policy "entregadores: a loja edita os próprios" on public.entregadores
  for update to authenticated
  using (producer_id in (select id from public.producers where user_id = (select auth.uid())))
  with check (producer_id in (select id from public.producers where user_id = (select auth.uid())));
create policy "entregadores: a loja apaga os próprios" on public.entregadores
  for delete to authenticated using (producer_id in (select id from public.producers where user_id = (select auth.uid())));

create table public.entregas_proprias (
  order_id            uuid primary key references public.orders (id) on delete cascade,
  producer_id         uuid not null references public.producers (id) on delete cascade,
  entregador_id       uuid references public.entregadores (id) on delete set null,
  entregador_nome     text not null check (char_length(entregador_nome) between 2 and 80),
  entregador_telefone text check (entregador_telefone ~ '^[0-9]{10,11}$'),
  mostrar_telefone    boolean not null default false,
  janela_inicio       timestamptz,
  janela_fim          timestamptz,
  status              text not null default 'preparando' check (status in ('preparando', 'saiu', 'entregue')),
  saiu_em             timestamptz,
  entregue_em         timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  check (janela_fim is null or janela_inicio is null or janela_fim > janela_inicio)
);
create trigger entregas_proprias_atualizado_em before update on public.entregas_proprias
  for each row execute function public.set_atualizado_em();
alter table public.entregas_proprias enable row level security;
revoke all on public.entregas_proprias from anon, authenticated;
grant select on public.entregas_proprias to authenticated;
-- leitura só pela loja do pedido; escrita só pelas funções abaixo. O comprador lê por pedido_do_comprador.
create policy "entrega própria: a loja vê as próprias" on public.entregas_proprias
  for select to authenticated using (producer_id in (select id from public.producers where user_id = (select auth.uid())));

alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'venda_paga', 'pedido_sem_nf', 'desistencia', 'reembolso', 'chargeback',
  'afiliacao_pedida', 'atendimento_novo',
  'afiliacao_aprovada', 'afiliacao_recusada', 'afiliacao_bloqueada',
  'venda_atribuida', 'comissao_estornada',
  'recebedor_aprovado', 'recebedor_recusado', 'recebedor_suspenso',
  'denuncia_nova', 'loja_curadoria', 'entrega_saiu'));

-- a loja atribui (ou troca) o entregador e a janela de um pedido pago de entrega própria
create or replace function public.atribuir_entrega_propria(
  p_order uuid, p_entregador uuid, p_nome text, p_telefone text, p_mostrar_telefone boolean,
  p_inicio timestamptz, p_fim timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_prod uuid; v_nome text := trim(coalesce(p_nome, '')); v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
  v_status text;
begin
  select o.producer_id into v_prod from public.orders o
  join public.producers p on p.id = o.producer_id
  where o.id = p_order and p.user_id = (select auth.uid()) and p.status_verificacao <> 'suspenso'
    and o.entrega_modo = 'propria' and o.status = 'pago';
  if v_prod is null then raise exception 'pedido_indisponivel'; end if;
  select status into v_status from public.entregas_proprias where order_id = p_order;
  if v_status = 'entregue' then raise exception 'entrega_ja_concluida'; end if;
  if p_entregador is not null then
    select e.nome, e.telefone into v_nome, v_tel from public.entregadores e
    where e.id = p_entregador and e.producer_id = v_prod and e.ativo;
    if v_nome is null then raise exception 'entregador_invalido'; end if;
  end if;
  if char_length(v_nome) not between 2 and 80 then raise exception 'entregador_invalido'; end if;
  if v_tel is not null and v_tel !~ '^[0-9]{10,11}$' then raise exception 'telefone_invalido'; end if;
  if p_fim is not null and p_inicio is not null and p_fim <= p_inicio then raise exception 'janela_invalida'; end if;
  insert into public.entregas_proprias (order_id, producer_id, entregador_id, entregador_nome, entregador_telefone,
                                        mostrar_telefone, janela_inicio, janela_fim)
  values (p_order, v_prod, p_entregador, v_nome, v_tel, coalesce(p_mostrar_telefone, false), p_inicio, p_fim)
  on conflict (order_id) do update
    set entregador_id = excluded.entregador_id, entregador_nome = excluded.entregador_nome,
        entregador_telefone = excluded.entregador_telefone, mostrar_telefone = excluded.mostrar_telefone,
        janela_inicio = excluded.janela_inicio, janela_fim = excluded.janela_fim;
end; $$;
revoke execute on function public.atribuir_entrega_propria(uuid, uuid, text, text, boolean, timestamptz, timestamptz) from public, anon;
grant execute on function public.atribuir_entrega_propria(uuid, uuid, text, text, boolean, timestamptz, timestamptz) to authenticated;

-- andamento: preparando -> saiu -> entregue (com a hora); "saiu" avisa o comprador (se tiver conta)
create or replace function public.atualizar_entrega_propria(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.entregas_proprias; v_comprador uuid; v_loja text;
begin
  if p_status not in ('saiu', 'entregue') then raise exception 'status_invalido'; end if;
  select ep.* into e from public.entregas_proprias ep
  join public.producers p on p.id = ep.producer_id
  where ep.order_id = p_order and p.user_id = (select auth.uid()) and p.status_verificacao <> 'suspenso';
  if e.order_id is null then raise exception 'entrega_sem_entregador'; end if;
  if p_status = 'saiu' and e.status <> 'preparando' then raise exception 'status_invalido'; end if;
  if p_status = 'entregue' and e.status <> 'saiu' then raise exception 'status_invalido'; end if;
  update public.entregas_proprias
  set status = p_status,
      saiu_em = case when p_status = 'saiu' then now() else saiu_em end,
      entregue_em = case when p_status = 'entregue' then now() else entregue_em end
  where order_id = p_order;
  if p_status = 'saiu' then
    select o.comprador_id, coalesce(p.loja_nome, p.razao_social) into v_comprador, v_loja
    from public.orders o join public.producers p on p.id = o.producer_id where o.id = p_order;
    perform public.notificar(v_comprador, 'entrega_saiu', 'Seu pedido saiu para entrega',
      'Entregador: ' || e.entregador_nome || '. Loja: ' || v_loja || '.', null, 'entrega_saiu:' || p_order);
  end if;
end; $$;
revoke execute on function public.atualizar_entrega_propria(uuid, text) from public, anon;
grant execute on function public.atualizar_entrega_propria(uuid, text) to authenticated;

-- -------------------------------------------------------------------------
-- 7. Comprador (link secreto): a página do pedido ganha o andamento da entrega própria
--    (telefone do entregador só se a loja marcou "mostrar telefone")
-- -------------------------------------------------------------------------
create or replace function public.pedido_do_comprador(p_codigo text, p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'codigo', o.codigo, 'status', o.status, 'criado_em', o.criado_em, 'pago_em', o.pago_em,
    'entregue_em', o.entregue_em, 'arrependimento_ate', o.arrependimento_ate,
    'arrependimento_solicitado_em', o.arrependimento_solicitado_em, 'cancelado_em', o.cancelado_em,
    'reembolsado_em', o.reembolsado_em,
    'comprador_nome', o.comprador_nome, 'comprador_email', o.comprador_email,
    'entrega_modo', o.entrega_modo, 'prazo_entrega_dias', o.prazo_entrega_dias, 'endereco', o.endereco_entrega,
    'subtotal_centavos', o.subtotal_centavos, 'frete_centavos', o.frete_centavos, 'total_centavos', o.total_centavos,
    'indicado', o.revendedor_id is not null,
    'loja', jsonb_build_object('slug', p.loja_slug, 'nome', coalesce(p.loja_nome, p.razao_social),
                               'razao_social', p.razao_social, 'cnpj', p.cnpj, 'email', p.email_contato,
                               'whatsapp', p.whatsapp),
    'entrega_propria', case when o.entrega_modo = 'propria' then jsonb_build_object(
        'zona', o.entrega_zona_nome, 'prazo_texto', o.entrega_prazo_texto,
        'status', coalesce(ep.status, 'preparando'),
        'entregador_nome', ep.entregador_nome,
        'entregador_telefone', case when ep.mostrar_telefone then ep.entregador_telefone end,
        'janela_inicio', ep.janela_inicio, 'janela_fim', ep.janela_fim,
        'saiu_em', ep.saiu_em, 'entregue_em', ep.entregue_em) end,
    'pode_desistir', o.status = 'aguardando_pagamento'
                     or (o.status = 'pago' and (o.entregue_em is null or now() <= o.arrependimento_ate)),
    'pode_confirmar_recebimento', o.status = 'pago' and o.entregue_em is null
                     and exists (select 1 from public.order_items x where x.order_id = o.id and x.status_entrega = 'enviado'),
    'itens', (select jsonb_agg(jsonb_build_object(
                'id', oi.id, 'nome', oi.nome_item, 'tipo', oi.tipo_item, 'quantidade', oi.quantidade,
                'preco_unitario_centavos', oi.preco_unitario_centavos, 'status_entrega', oi.status_entrega,
                'codigo_rastreio', oi.codigo_rastreio, 'nota_fiscal_numero', oi.nota_fiscal_numero,
                'nota_fiscal_chave', oi.nota_fiscal_chave, 'nota_fiscal_url', oi.nota_fiscal_url,
                -- conteúdo digital SÓ depois do pagamento e fora de reembolso
                'acesso', case when o.status = 'pago' and oi.tipo_item = 'digital' then
                  jsonb_build_object('link', it.link_acesso, 'instrucoes', it.instrucoes_pos_compra,
                                     'arquivo_path', it.arquivo_path) end)
              order by oi.criado_em)
              from public.order_items oi join public.items it on it.id = oi.item_id where oi.order_id = o.id))
  from public.orders o join public.producers p on p.id = o.producer_id
  left join public.entregas_proprias ep on ep.order_id = o.id
  where o.codigo = upper(p_codigo) and o.acesso_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;
revoke execute on function public.pedido_do_comprador(text, text) from public, anon, authenticated;
grant execute on function public.pedido_do_comprador(text, text) to service_role;
