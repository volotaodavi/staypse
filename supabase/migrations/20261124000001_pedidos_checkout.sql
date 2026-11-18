-- =========================================================================
-- Migração 9 — Checkout, pedidos, frete, arrependimento, SAC, LGPD e erros
-- =========================================================================
-- Regras de negócio que esta migração garante NO BANCO (não só na tela):
--  * preço, frete e comissão são calculados aqui, nunca vêm do navegador;
--  * só o servidor (service_role) cria pedido e confirma pagamento — o
--    pagamento real virá do aviso (webhook) da Lytex na Etapa 6;
--  * a Staypse NUNCA guarda dinheiro: aqui só há status e referências;
--  * arrependimento: 7 dias a partir do recebimento (CDC art. 49);
--  * atendimento com protocolo e prazo de 5 dias (Decreto 7.962/2013);
--  * titular de dados baixa o que temos sobre ele (LGPD art. 18).

-- -------------------------------------------------------------------------
-- 1. FRETE DA LOJA (sem serviço externo: frete fixo, grátis acima de, retirada)
-- -------------------------------------------------------------------------
alter table public.producers
  add column frete_fixo_centavos          integer check (frete_fixo_centavos between 0 and 100000),
  add column frete_gratis_acima_centavos  integer check (frete_gratis_acima_centavos between 1 and 10000000),
  add column frete_prazo_dias             integer check (frete_prazo_dias between 1 and 60);

-- a loja define o próprio frete (só a dela, e não suspensa)
create or replace function public.salvar_frete(p_fixo integer, p_gratis_acima integer, p_prazo integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.producers
  set frete_fixo_centavos = p_fixo, frete_gratis_acima_centavos = p_gratis_acima, frete_prazo_dias = p_prazo
  where user_id = (select auth.uid()) and status_verificacao <> 'suspenso';
  if not found then raise exception 'loja_indisponivel'; end if;
end; $$;
revoke execute on function public.salvar_frete(integer, integer, integer) from public, anon;
grant execute on function public.salvar_frete(integer, integer, integer) to authenticated;

-- -------------------------------------------------------------------------
-- 2. PEDIDOS: código público, acesso do comprador sem conta, entrega
-- -------------------------------------------------------------------------
alter table public.orders
  add column codigo                       text unique check (codigo ~ '^[A-Z0-9]{10}$'),
  -- hash do link secreto do comprador (o token puro nunca fica no banco)
  add column acesso_hash                  text,
  add column entrega_modo                 text check (entrega_modo in ('envio', 'retirada', 'digital')),
  add column prazo_entrega_dias           integer,
  -- vendedor próprio da loja (quando a venda veio do link dele)
  add column vendedor_id                  uuid references public.loja_vendedores (id) on delete set null,
  add column cancelado_em                 timestamptz,
  add column arrependimento_solicitado_em timestamptz,
  add column arrependimento_motivo        text check (char_length(arrependimento_motivo) <= 1000),
  add column reembolsado_em               timestamptz;
create index orders_status_idx on public.orders (status, criado_em);

-- data da nota preenchida sozinha quando a loja lança o número
create or replace function public.order_items_nota_e_entrega()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.nota_fiscal_numero is not null and new.nota_fiscal_emitida_em is null then
    new.nota_fiscal_emitida_em := now();
  end if;
  return new;
end; $$;
revoke execute on function public.order_items_nota_e_entrega() from public, anon, authenticated;
create trigger order_items_a_nota before insert or update on public.order_items
  for each row execute function public.order_items_nota_e_entrega();

-- item entregue => o pedido registra o recebimento e o fim do prazo de 7 dias
create or replace function public.order_items_marca_recebimento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status_entrega = 'entregue' and old.status_entrega is distinct from 'entregue' then
    update public.orders
    set entregue_em = coalesce(entregue_em, now()),
        arrependimento_ate = coalesce(arrependimento_ate, coalesce(entregue_em, now()) + interval '7 days')
    where id = new.order_id;
  end if;
  return new;
end; $$;
revoke execute on function public.order_items_marca_recebimento() from public, anon, authenticated;
create trigger order_items_b_recebimento after update of status_entrega on public.order_items
  for each row execute function public.order_items_marca_recebimento();

-- -------------------------------------------------------------------------
-- 3. COTAÇÃO (pública): preço, frete e total calculados pelo banco
-- -------------------------------------------------------------------------
create or replace function public.cotar_pedido(p_item uuid, p_quantidade integer, p_modo text)
returns table (item_id uuid, nome text, tipo text, preco_unitario_centavos integer, quantidade integer,
               subtotal_centavos integer, frete_centavos integer, total_centavos integer,
               prazo_postagem_dias integer, prazo_entrega_dias integer, producer_id uuid,
               loja_slug text, loja_nome text, razao_social text, cnpj text)
language plpgsql stable security definer set search_path = '' as $$
declare i record; v_sub integer; v_frete integer := 0;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 99 then raise exception 'quantidade_invalida'; end if;
  select it.id, it.nome, it.tipo, it.preco_centavos, it.estoque, it.retirada_local, it.prazo_postagem_dias,
         p.id as pid, p.loja_slug, coalesce(p.loja_nome, p.razao_social) as loja_nome, p.razao_social, p.cnpj,
         p.frete_fixo_centavos, p.frete_gratis_acima_centavos, p.frete_prazo_dias
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
    v_frete := case when i.frete_gratis_acima_centavos is not null and v_sub >= i.frete_gratis_acima_centavos
                    then 0 else i.frete_fixo_centavos end;
  else
    raise exception 'entrega_invalida';
  end if;

  return query select i.id, i.nome, i.tipo, i.preco_centavos, p_quantidade, v_sub, v_frete, v_sub + v_frete,
                      i.prazo_postagem_dias, case when p_modo = 'envio' then i.frete_prazo_dias end,
                      i.pid, i.loja_slug, i.loja_nome, i.razao_social, i.cnpj;
end; $$;
revoke execute on function public.cotar_pedido(uuid, integer, text) from public;
grant execute on function public.cotar_pedido(uuid, integer, text) to anon, authenticated, service_role;

-- opções de entrega de um item (para a tela mostrar só o que existe)
create or replace function public.entregas_do_item(p_item uuid)
returns table (envio boolean, retirada boolean, digital boolean, frete_fixo_centavos integer,
               frete_gratis_acima_centavos integer, frete_prazo_dias integer)
language sql stable security definer set search_path = '' as $$
  select it.tipo = 'fisico' and p.frete_fixo_centavos is not null,
         it.tipo = 'fisico' and it.retirada_local,
         it.tipo = 'digital',
         p.frete_fixo_centavos, p.frete_gratis_acima_centavos, p.frete_prazo_dias
  from public.items it join public.producers p on p.id = it.producer_id
  where it.id = p_item and it.status_aprovacao = 'aprovado' and p.status_verificacao = 'aprovado';
$$;
revoke execute on function public.entregas_do_item(uuid) from public;
grant execute on function public.entregas_do_item(uuid) to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 4. CRIAR PEDIDO (só o servidor, depois de validar o cookie de indicação)
-- -------------------------------------------------------------------------
create or replace function public.criar_pedido(
  p_item uuid, p_quantidade integer, p_modo text, p_afiliado uuid, p_comprador_id uuid,
  p_nome text, p_email text, p_documento text, p_telefone text, p_endereco jsonb, p_termos_versao text)
returns table (id uuid, codigo text, token text)
language plpgsql security definer set search_path = '' as $$
declare
  q record; a record;
  v_afiliado uuid; v_vitrine uuid; v_vendedor uuid; v_comissao numeric := 0;
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

  -- indicação: só vale com afiliação APROVADA para este item; ninguém indica a si mesmo
  if p_afiliado is not null and p_afiliado is distinct from p_comprador_id then
    select af.storefront_id, af.origem, af.vendedor_id, it.comissao_percentual, v.status as vinculo,
           v.comissao_percentual as comissao_vendedor
    into a
    from public.afiliacoes af
    join public.items it on it.id = af.item_id
    left join public.loja_vendedores v on v.id = af.vendedor_id
    where af.afiliado_id = p_afiliado and af.item_id = p_item and af.status = 'aprovada';
    if a.storefront_id is not null then
      if a.origem = 'vendedor_proprio' and a.vinculo = 'ativo' then
        v_afiliado := p_afiliado; v_vitrine := a.storefront_id; v_vendedor := a.vendedor_id; v_comissao := a.comissao_vendedor;
      elsif a.origem = 'catalogo' then
        v_afiliado := p_afiliado; v_vitrine := a.storefront_id; v_comissao := a.comissao_percentual;
      end if;
    end if;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.orders (producer_id, revendedor_id, storefront_id, vendedor_id, comprador_id,
                             comprador_nome, comprador_email, comprador_documento, comprador_telefone,
                             endereco_entrega, subtotal_centavos, frete_centavos, total_centavos,
                             resumo_aceito_em, termos_versao, codigo, acesso_hash, entrega_modo, prazo_entrega_dias)
  values (q.producer_id, v_afiliado, v_vitrine, v_vendedor, p_comprador_id,
          trim(p_nome), v_email, v_doc, v_tel,
          v_end, q.subtotal_centavos, q.frete_centavos, q.total_centavos,
          now(), p_termos_versao, v_codigo, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_modo, q.prazo_entrega_dias)
  returning orders.id into v_id;

  insert into public.order_items (order_id, item_id, nome_item, tipo_item, quantidade, preco_unitario_centavos, comissao_percentual)
  values (v_id, q.item_id, q.nome, q.tipo, q.quantidade, q.preco_unitario_centavos, v_comissao);

  return query select v_id, v_codigo, v_token;
end; $$;
revoke execute on function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.criar_pedido(uuid, integer, text, uuid, uuid, text, text, text, text, jsonb, text)
  to service_role;

-- -------------------------------------------------------------------------
-- 5. PAGAMENTO CONFIRMADO (Etapa 6: chamado pelo aviso da Lytex)
-- -------------------------------------------------------------------------
create or replace function public.confirmar_pagamento(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_digital boolean;
begin
  update public.orders set status = 'pago', pago_em = now()
  where id = p_order and status = 'aguardando_pagamento';
  if not found then raise exception 'pedido_nao_aguarda_pagamento'; end if;
  -- baixa do estoque (nunca negativo)
  update public.items it set estoque = greatest(it.estoque - oi.quantidade, 0)
  from public.order_items oi
  where oi.order_id = p_order and oi.item_id = it.id and it.tipo = 'fisico' and it.estoque is not null;
  -- produto digital: o acesso é liberado agora; o prazo de 7 dias começa agora
  select bool_and(oi.tipo_item = 'digital') into v_digital from public.order_items oi where oi.order_id = p_order;
  if v_digital then
    update public.orders set entregue_em = now(), arrependimento_ate = now() + interval '7 days' where id = p_order;
  end if;
end; $$;
revoke execute on function public.confirmar_pagamento(uuid) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento(uuid) to service_role;

-- -------------------------------------------------------------------------
-- 6. COMPRADOR (sem conta): ver o pedido pelo link secreto
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
  where o.codigo = upper(p_codigo) and o.acesso_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;
revoke execute on function public.pedido_do_comprador(text, text) from public, anon, authenticated;
grant execute on function public.pedido_do_comprador(text, text) to service_role;

-- perdeu o link: código + e-mail geram um link novo (o antigo deixa de valer)
create or replace function public.renovar_acesso_pedido(p_codigo text, p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  update public.orders set acesso_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  where codigo = upper(p_codigo) and comprador_email = lower(trim(p_email));
  if not found then return null; end if;
  return v_token;
end; $$;
revoke execute on function public.renovar_acesso_pedido(text, text) from public, anon, authenticated;
grant execute on function public.renovar_acesso_pedido(text, text) to service_role;

-- comprador confirma que recebeu (começa o prazo de 7 dias, se ainda não começou)
create or replace function public.confirmar_recebimento(p_codigo text, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select o.id into v_id from public.orders o
  where o.codigo = upper(p_codigo) and o.acesso_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    and o.status = 'pago' and o.entregue_em is null;
  if v_id is null then raise exception 'pedido_indisponivel'; end if;
  update public.order_items set status_entrega = 'entregue' where order_id = v_id and status_entrega = 'enviado';
  if not found then raise exception 'nada_enviado'; end if;
end; $$;
revoke execute on function public.confirmar_recebimento(text, text) from public, anon, authenticated;
grant execute on function public.confirmar_recebimento(text, text) to service_role;

-- -------------------------------------------------------------------------
-- 7. DIREITO DE ARREPENDIMENTO (CDC art. 49) e cancelamento antes de pagar
-- -------------------------------------------------------------------------
create or replace function public.desistir_do_pedido(p_codigo text, p_token text, p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  select * into o from public.orders x
  where x.codigo = upper(p_codigo) and x.acesso_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  for update;
  if o.id is null then raise exception 'pedido_indisponivel'; end if;

  if o.status = 'aguardando_pagamento' then
    update public.orders set status = 'cancelado', cancelado_em = now() where id = o.id;
    update public.order_items set status_entrega = 'cancelado' where order_id = o.id;
    return 'cancelado';
  end if;
  if o.status = 'pago' and (o.entregue_em is null or now() <= o.arrependimento_ate) then
    -- o motivo é opcional: desistir é um direito, não precisa de justificativa
    update public.orders set status = 'em_reembolso', arrependimento_solicitado_em = now(),
           arrependimento_motivo = nullif(left(trim(coalesce(p_motivo, '')), 1000), '')
    where id = o.id;
    -- o que ainda não saiu da loja não sai mais
    update public.order_items set status_entrega = 'cancelado' where order_id = o.id and status_entrega = 'aguardando';
    return 'em_reembolso';
  end if;
  raise exception 'prazo_encerrado';
end; $$;
revoke execute on function public.desistir_do_pedido(text, text, text) from public, anon, authenticated;
grant execute on function public.desistir_do_pedido(text, text, text) to service_role;

-- reembolso concluído (Etapa 6: confirmado pela Lytex; até lá, o admin registra)
create or replace function public.concluir_reembolso(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  update public.orders set status = 'reembolsado', reembolsado_em = now()
  where id = p_order and status = 'em_reembolso';
  if not found then raise exception 'pedido_nao_esta_em_reembolso'; end if;
  -- itens que já tinham saído voltam como devolvidos; o estoque do que não saiu volta
  update public.order_items set status_entrega = 'devolvido'
  where order_id = p_order and status_entrega in ('enviado', 'entregue');
  update public.items it set estoque = it.estoque + oi.quantidade
  from public.order_items oi
  where oi.order_id = p_order and oi.item_id = it.id and oi.status_entrega = 'cancelado'
    and it.tipo = 'fisico' and it.estoque is not null;
end; $$;
revoke execute on function public.concluir_reembolso(uuid) from public, anon;
grant execute on function public.concluir_reembolso(uuid) to authenticated;

-- pedido não pago em 3 dias é cancelado sozinho (não prende o estoque de ninguém)
create or replace function public.expirar_pedidos()
returns void language sql security definer set search_path = '' as $$
  with vencidos as (
    update public.orders set status = 'cancelado', cancelado_em = now()
    where status = 'aguardando_pagamento' and criado_em < now() - interval '3 days'
    returning id)
  update public.order_items set status_entrega = 'cancelado' where order_id in (select id from vencidos);
$$;
revoke execute on function public.expirar_pedidos() from public, anon, authenticated;

-- -------------------------------------------------------------------------
-- 8. ATENDIMENTO (SAC) — protocolo, prazo de 5 dias (Decreto 7.962, art. 4º)
-- -------------------------------------------------------------------------
create table public.atendimentos (
  id            uuid primary key default gen_random_uuid(),
  protocolo     text not null unique check (protocolo ~ '^[0-9]{8}-[A-Z0-9]{6}$'),
  acesso_hash   text not null,
  user_id       uuid references public.profiles (id) on delete set null,
  pedido_id     uuid references public.orders (id) on delete set null,
  -- loja envolvida (vê e responde o que é sobre os pedidos dela)
  producer_id   uuid references public.producers (id) on delete set null,
  nome          text not null check (char_length(nome) between 2 and 120),
  email         text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  assunto       text not null check (assunto in ('pedido', 'arrependimento', 'lgpd_acesso', 'lgpd_correcao',
                                                 'lgpd_exclusao', 'lgpd_outros', 'denuncia', 'outro')),
  mensagem      text not null check (char_length(mensagem) between 10 and 4000),
  status        text not null default 'aberto' check (status in ('aberto', 'respondido', 'encerrado')),
  resposta      text check (char_length(resposta) between 2 and 4000),
  respondido_em timestamptz,
  respondido_por uuid references public.profiles (id) on delete set null,
  prazo_ate     timestamptz not null default now() + interval '5 days',
  criado_em     timestamptz not null default now()
);
create index atendimentos_status_idx on public.atendimentos (status, prazo_ate);
create index atendimentos_producer_idx on public.atendimentos (producer_id);
alter table public.atendimentos enable row level security;
revoke all on public.atendimentos from anon, authenticated;
grant select (id, protocolo, user_id, pedido_id, producer_id, nome, email, assunto, mensagem, status, resposta,
              respondido_em, prazo_ate, criado_em)
  on public.atendimentos to authenticated;
-- LGPD e denúncias só a Staypse (controladora) vê; pedidos: também a loja
create policy "atendimentos: autor, loja do pedido ou admin" on public.atendimentos
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin()
         or (assunto in ('pedido', 'arrependimento') and public.eh_dono_produtor(producer_id)));

create or replace function public.abrir_atendimento(p_user uuid, p_nome text, p_email text, p_assunto text,
                                                    p_mensagem text, p_pedido_codigo text)
returns table (protocolo text, token text, prazo_ate timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_pedido uuid; v_loja uuid; v_token text; v_proto text; v_prazo timestamptz;
begin
  if p_pedido_codigo is not null and p_pedido_codigo <> '' then
    -- o pedido só é ligado se o e-mail bater (ninguém consulta pedido alheio por aqui)
    select o.id, o.producer_id into v_pedido, v_loja from public.orders o
    where o.codigo = upper(trim(p_pedido_codigo)) and o.comprador_email = lower(trim(p_email));
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_proto := to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDD') || '-'
             || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.atendimentos (protocolo, acesso_hash, user_id, pedido_id, producer_id, nome, email, assunto, mensagem)
  values (v_proto, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_user, v_pedido, v_loja,
          trim(p_nome), lower(trim(p_email)), p_assunto, trim(p_mensagem))
  returning atendimentos.prazo_ate into v_prazo;
  return query select v_proto, v_token, v_prazo;
end; $$;
revoke execute on function public.abrir_atendimento(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.abrir_atendimento(uuid, text, text, text, text, text) to service_role;

create or replace function public.ver_atendimento(p_protocolo text, p_token text)
returns table (protocolo text, assunto text, mensagem text, status text, resposta text,
               respondido_em timestamptz, prazo_ate timestamptz, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.protocolo, a.assunto, a.mensagem, a.status, a.resposta, a.respondido_em, a.prazo_ate, a.criado_em
  from public.atendimentos a
  where a.protocolo = upper(p_protocolo) and a.acesso_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;
revoke execute on function public.ver_atendimento(text, text) from public, anon, authenticated;
grant execute on function public.ver_atendimento(text, text) to service_role;

create or replace function public.responder_atendimento(p_id uuid, p_resposta text, p_encerrar boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.atendimentos a
  set resposta = trim(p_resposta), respondido_em = now(), respondido_por = (select auth.uid()),
      status = case when p_encerrar then 'encerrado' else 'respondido' end
  where a.id = p_id
    and (public.is_admin()
         or (a.assunto in ('pedido', 'arrependimento') and public.eh_dono_produtor(a.producer_id)));
  if not found then raise exception 'atendimento_indisponivel'; end if;
end; $$;
revoke execute on function public.responder_atendimento(uuid, text, boolean) from public, anon;
grant execute on function public.responder_atendimento(uuid, text, boolean) to authenticated;

-- -------------------------------------------------------------------------
-- 9. LGPD art. 18: "baixar meus dados" (tudo o que temos sobre a pessoa)
-- -------------------------------------------------------------------------
create or replace function public.meus_dados()
returns jsonb language sql stable security definer set search_path = '' as $$
  with eu as (select (select auth.uid()) as id)
  select jsonb_build_object(
    'gerado_em', now(),
    'conta', (select jsonb_build_object('email', u.email, 'criada_em', u.created_at, 'ultimo_acesso', u.last_sign_in_at)
              from auth.users u, eu where u.id = eu.id),
    'perfil', (select to_jsonb(p) from public.profiles p, eu where p.id = eu.id),
    'papeis', (select jsonb_agg(r.papel) from public.user_roles r, eu where r.user_id = eu.id),
    'aceites_de_termos', (select jsonb_agg(jsonb_build_object('documento', t.documento, 'versao', t.versao, 'aceito_em', t.aceito_em))
                          from public.terms_acceptances t, eu where t.user_id = eu.id),
    'empresa', (select to_jsonb(p) - 'lytex_recebedor_id' - 'aprovado_por' from public.producers p, eu where p.user_id = eu.id),
    'vitrine', (select to_jsonb(s) from public.storefronts s, eu where s.revendedor_id = eu.id),
    'links_externos', (select jsonb_agg(to_jsonb(l)) from public.external_links l join public.storefronts s on s.id = l.storefront_id, eu
                       where s.revendedor_id = eu.id),
    'afiliacoes', (select jsonb_agg(jsonb_build_object('item', a.item_id, 'status', a.status, 'origem', a.origem, 'criado_em', a.criado_em))
                   from public.afiliacoes a, eu where a.afiliado_id = eu.id),
    'vinculos_de_vendedor', (select jsonb_agg(jsonb_build_object('loja', v.producer_id, 'comissao_percentual', v.comissao_percentual,
                                                                 'forma_pagamento', v.forma_pagamento, 'status', v.status))
                             from public.loja_vendedores v, eu where v.user_id = eu.id),
    'compras', (select jsonb_agg(jsonb_build_object('codigo', o.codigo, 'status', o.status, 'total_centavos', o.total_centavos,
                                                    'criado_em', o.criado_em, 'nome', o.comprador_nome, 'email', o.comprador_email,
                                                    'cpf', o.comprador_documento, 'telefone', o.comprador_telefone,
                                                    'endereco', o.endereco_entrega))
                from public.orders o, eu where o.comprador_id = eu.id),
    -- cliques são anônimos (sem IP puro): mostramos só a contagem da sua vitrine
    'cliques_na_sua_vitrine', (select count(*) from public.clicks c join public.storefronts s on s.id = c.storefront_id, eu
                               where s.revendedor_id = eu.id),
    'atendimentos', (select jsonb_agg(jsonb_build_object('protocolo', a.protocolo, 'assunto', a.assunto, 'status', a.status,
                                                         'criado_em', a.criado_em))
                     from public.atendimentos a, eu where a.user_id = eu.id)
  );
$$;
revoke execute on function public.meus_dados() from public, anon;
grant execute on function public.meus_dados() to authenticated;

-- -------------------------------------------------------------------------
-- 10. MONITORAMENTO: erros do servidor (sem dados pessoais) e checagem de saúde
-- -------------------------------------------------------------------------
create table public.erros_app (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  mensagem   text not null check (char_length(mensagem) <= 1000),
  digest     text check (char_length(digest) <= 100),
  caminho    text check (char_length(caminho) <= 300),
  metodo     text check (char_length(metodo) <= 10),
  rota       text check (char_length(rota) <= 200),
  tipo       text check (char_length(tipo) <= 40)
);
create index erros_app_criado_idx on public.erros_app (criado_em desc);
alter table public.erros_app enable row level security;
revoke all on public.erros_app from anon, authenticated;
grant select on public.erros_app to authenticated;
grant insert on public.erros_app to service_role;
create policy "erros_app: só admin vê" on public.erros_app for select to authenticated using (public.is_admin());

create or replace function public.saude()
returns integer language sql stable set search_path = '' as $$ select 1; $$;
grant execute on function public.saude() to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 11. RETENÇÃO e tarefas diárias
-- -------------------------------------------------------------------------
create or replace function public.apagar_dados_vencidos()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.clicks where criado_em < now() - interval '24 months';
  delete from public.erros_app where criado_em < now() - interval '90 days';
  -- atendimento: 5 anos (prazo do CDC para reclamar de danos, art. 27)
  delete from public.atendimentos where criado_em < now() - interval '5 years';
  perform public.expirar_pedidos();
end; $$;
revoke execute on function public.apagar_dados_vencidos() from public, anon, authenticated;
