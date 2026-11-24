-- Correções das auditorias de segurança e qualidade (fora de pagamentos e checkout):
-- índices dos painéis, link externo sem "\", suspensão aplicada no banco, reserva de estoque,
-- recuperação do link do pedido com limite, auto-indicação e recebedor_aprovado só interno.

-- 1. Índices dos painéis (qualidade #8)
create index if not exists clicks_item_idx on public.clicks (item_id, criado_em);
create index if not exists order_items_item_idx on public.order_items (item_id);
create index if not exists orders_vendedor_idx on public.orders (vendedor_id) where vendedor_id is not null;
create index if not exists orders_loja_status_pago_idx on public.orders (producer_id, status, pago_em);

-- 2. Link e imagem externos: host só com letras, números, ponto e hífen; URL sem "\", espaço ou controle (M7)
create or replace function public.link_externo_permitido(u text)
returns boolean language sql immutable set search_path = '' as $$
  select u !~ '[\\\s[:cntrl:]]' and h is not null and h ~ '^[a-z0-9.-]+$'
     and h ~ '(^|\.)(shopee\.com\.br|shope\.ee|mercadolivre\.com\.br|mercadolivre\.com|mercadolibre\.com|meli\.la|tiktok\.com)$'
  from (select public.host_de(u) as h) x;
$$;
create or replace function public.imagem_externa_permitida(u text)
returns boolean language sql immutable set search_path = '' as $$
  select u !~ '[\\\s[:cntrl:]]' and h is not null and h ~ '^[a-z0-9.-]+$'
     and h ~ '(^|\.)(susercontent\.com|shopee\.com\.br|mlstatic\.com|mercadolivre\.com\.br|tiktokcdn\.com|tiktokcdn-us\.com|ibyteimg\.com)$'
  from (select public.host_de(u) as h) x;
$$;

-- 3. Suspensão valendo no banco (M9)
create or replace function public.usuario_suspenso()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and suspenso_em is not null);
$$;
revoke execute on function public.usuario_suspenso() from public, anon;
grant execute on function public.usuario_suspenso() to authenticated, service_role;

-- Política RESTRITIVA em toda tabela que o usuário logado acessa: suspenso não lê nem escreve.
-- (profiles e user_roles ficam de fora: a tela "conta suspensa" precisa deles.)
-- Tabela nova: repetir o bloco. Funções SECURITY DEFINER próprias ignoram RLS e checam o papel por conta.
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname not in ('profiles', 'user_roles')
      and has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
  loop
    execute format('drop policy if exists "suspenso: sem acesso" on public.%I', t.relname);
    execute format('create policy "suspenso: sem acesso" on public.%I as restrictive for all to authenticated using (not (select public.usuario_suspenso()))', t.relname);
  end loop;
end $$;

-- recebedor apto: agora também não pode estar suspenso (loja suspensa não vende, afiliado suspenso não recebe indicação)
create or replace function public.recebedor_aprovado(p_user uuid, p_papel text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.recebedores r
    where r.user_id = p_user and r.papel = p_papel and r.status_recebedor = 'aprovado'
      and (r.documento_provedor is null or r.documento_provedor = r.documento)
      and (p_papel <> 'produtor' or r.documento = (select p.cnpj from public.producers p where p.user_id = p_user))
      and not exists (select 1 from public.profiles pf where pf.id = p_user and pf.suspenso_em is not null)
  );
$$;
-- só funções e gatilhos internos (SECURITY DEFINER) a usam: ninguém consulta o recebedor alheio (B6)
revoke execute on function public.recebedor_aprovado(uuid, text) from public, anon, authenticated;
grant execute on function public.recebedor_aprovado(uuid, text) to service_role;

-- 4. Auto-indicação: comprar pelo próprio link não gera comissão (M10)
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
  -- mesmo CPF ou mesmo e-mail de quem indica: sem indicação
  if new.revendedor_id is not null and (
       exists (select 1 from public.recebedores r where r.user_id = new.revendedor_id
               and regexp_replace(r.documento, '\D', '', 'g') = new.comprador_documento)
       or exists (select 1 from auth.users u where u.id = new.revendedor_id and lower(u.email) = new.comprador_email)) then
    new.revendedor_id := null; new.vendedor_id := null; new.storefront_id := null;
  end if;
  if new.revendedor_id is null then new.atribuicao_origem := null; end if;
  return new;
end; $$;

-- 5. Reserva de estoque: pedido aguardando pagamento segura a quantidade (liberada quando
--    o pedido é cancelado ou expira, pois deixa de estar "aguardando_pagamento") (qualidade #1, B5)
create or replace function public.order_items_reserva_estoque()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_estoque integer; v_reservado integer;
begin
  select it.estoque into v_estoque from public.items it
  where it.id = new.item_id and it.tipo = 'fisico' and it.estoque is not null
  for update;  -- fecha a fila: dois pedidos da última unidade não passam juntos
  if not found then return new; end if;
  select coalesce(sum(oi.quantidade), 0) into v_reservado
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.item_id = new.item_id and oi.order_id <> new.order_id and o.status = 'aguardando_pagamento';
  if v_estoque - v_reservado < new.quantidade then raise exception 'sem_estoque'; end if;
  return new;
end; $$;
revoke execute on function public.order_items_reserva_estoque() from public, anon, authenticated;
create trigger order_items_b_reserva_estoque before insert on public.order_items
  for each row execute function public.order_items_reserva_estoque();

-- 6. Recuperar o link do pedido: limite por IP (hash) e por código (M1)
create table public.recuperacao_pedido_tentativas (
  id         bigint generated always as identity primary key,
  chave      text not null check (char_length(chave) <= 128),
  criado_em  timestamptz not null default now()
);
create index recuperacao_pedido_tentativas_idx on public.recuperacao_pedido_tentativas (chave, criado_em);
alter table public.recuperacao_pedido_tentativas enable row level security;
revoke all on public.recuperacao_pedido_tentativas from anon, authenticated;

drop function public.renovar_acesso_pedido(text, text);
create or replace function public.renovar_acesso_pedido(p_codigo text, p_email text, p_ip_hash text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_codigo text := upper(p_codigo);
  v_ip text := 'ip:' || p_ip_hash;
  v_cod text := 'cod:' || v_codigo;
begin
  delete from public.recuperacao_pedido_tentativas where criado_em < now() - interval '1 day';
  -- máximo de 8 pedidos por IP e 5 por código a cada hora; passou disso, responde como se não achasse
  if (p_ip_hash is not null and (select count(*) from public.recuperacao_pedido_tentativas
        where chave = v_ip and criado_em > now() - interval '1 hour') >= 8)
     or (select count(*) from public.recuperacao_pedido_tentativas
         where chave = v_cod and criado_em > now() - interval '1 hour') >= 5 then
    return null;
  end if;
  insert into public.recuperacao_pedido_tentativas (chave) values (v_cod);
  if p_ip_hash is not null then insert into public.recuperacao_pedido_tentativas (chave) values (v_ip); end if;
  update public.orders set acesso_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  where codigo = v_codigo and comprador_email = lower(trim(p_email));
  if not found then return null; end if;
  return v_token;
end; $$;
revoke execute on function public.renovar_acesso_pedido(text, text, text) from public, anon, authenticated;
grant execute on function public.renovar_acesso_pedido(text, text, text) to service_role;
