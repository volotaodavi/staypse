-- =========================================================================
-- Migração 20261208000001 — Etapa 6: notificações no app + preferências de e-mail
-- =========================================================================
-- Regras garantidas aqui (no banco, não só na tela):
--  * cada pessoa só LÊ e marca como lida as PRÓPRIAS notificações (RLS); ninguém cria
--    notificação pelo navegador: a inserção é só pela função notificar() (SECURITY DEFINER,
--    chamada pelos gatilhos abaixo e pelo servidor);
--  * as notificações nascem de gatilhos nos eventos que já existem (pedido pago, estorno,
--    afiliação, recebedor, denúncia, curadoria, atendimento) — nenhuma regra existente muda;
--  * notificação de afiliado/vendedor NUNCA leva contato do comprador (só o primeiro nome);
--  * e-mail só para eventos importantes e só se a pessoa não desligou (preferências);
--    o banco apenas MARCA "e-mail pendente"; quem envia é o servidor (Resend);
--  * notificações com mais de 12 meses são apagadas pela rotina diária (LGPD: minimização).

-- -------------------------------------------------------------------------
-- 1. Preferências de e-mail (uma linha por pessoa; sem linha = padrão ligado)
-- -------------------------------------------------------------------------
create table public.preferencias_notificacao (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  email_venda     boolean not null default true,   -- venda nova (loja)
  email_recebedor boolean not null default true,   -- cadastro de recebimento recusado/suspenso
  email_estorno   boolean not null default true,   -- comissão estornada (afiliado/vendedor)
  atualizado_em   timestamptz not null default now()
);
create trigger preferencias_notificacao_atualizado_em before update on public.preferencias_notificacao
  for each row execute function public.set_atualizado_em();
alter table public.preferencias_notificacao enable row level security;
revoke all on public.preferencias_notificacao from anon, authenticated;
grant select, insert, update on public.preferencias_notificacao to authenticated;
create policy "preferencias: ver as próprias" on public.preferencias_notificacao
  for select to authenticated using (user_id = (select auth.uid()));
create policy "preferencias: criar as próprias" on public.preferencias_notificacao
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "preferencias: editar as próprias" on public.preferencias_notificacao
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -------------------------------------------------------------------------
-- 2. Notificações
-- -------------------------------------------------------------------------
create table public.notificacoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  tipo            text not null check (tipo in (
                    'venda_paga', 'pedido_sem_nf', 'desistencia', 'reembolso', 'chargeback',
                    'afiliacao_pedida', 'atendimento_novo',
                    'afiliacao_aprovada', 'afiliacao_recusada', 'afiliacao_bloqueada',
                    'venda_atribuida', 'comissao_estornada',
                    'recebedor_aprovado', 'recebedor_recusado', 'recebedor_suspenso',
                    'denuncia_nova', 'loja_curadoria')),
  titulo          text not null check (char_length(titulo) between 1 and 120),
  texto           text not null check (char_length(texto) between 1 and 400),
  -- só caminho interno do app ("/painel/..."): nunca endereço externo nem "//"
  link            text check (link ~ '^/($|[^/\\])' and char_length(link) <= 200),
  lida_em         timestamptz,
  criado_em       timestamptz not null default now(),
  -- evita repetir o mesmo aviso (ex.: pedido sem nota todo dia)
  chave           text check (char_length(chave) <= 160),
  -- fila de e-mail: o servidor envia e marca; só o servidor lê/escreve estas colunas
  email_pendente  boolean not null default false,
  email_enviado_em timestamptz
);
create index notificacoes_user_idx on public.notificacoes (user_id, criado_em desc);
create index notificacoes_nao_lidas_idx on public.notificacoes (user_id) where lida_em is null;
create index notificacoes_email_idx on public.notificacoes (criado_em) where email_pendente;
create unique index notificacoes_chave_uk on public.notificacoes (user_id, chave) where chave is not null;

alter table public.notificacoes enable row level security;
revoke all on public.notificacoes from anon, authenticated;
-- a pessoa NÃO lê as colunas da fila de e-mail; só marca "lida"
grant select (id, user_id, tipo, titulo, texto, link, lida_em, criado_em, chave) on public.notificacoes to authenticated;
grant update (lida_em) on public.notificacoes to authenticated;
grant select, update on public.notificacoes to service_role;
create policy "notificacoes: ver as próprias" on public.notificacoes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notificacoes: marcar as próprias como lidas" on public.notificacoes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -------------------------------------------------------------------------
-- 3. notificar(): único caminho de criação (gatilhos e servidor)
-- -------------------------------------------------------------------------
create or replace function public.notificar(
  p_user uuid, p_tipo text, p_titulo text, p_texto text, p_link text default null, p_chave text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email boolean := false; v_pref record;
begin
  if p_user is null then return; end if;
  -- e-mail só nos eventos importantes e se a pessoa não desligou (sem preferência salva = ligado)
  if p_tipo in ('venda_paga', 'recebedor_recusado', 'recebedor_suspenso', 'comissao_estornada') then
    select * into v_pref from public.preferencias_notificacao where user_id = p_user;
    v_email := case p_tipo
      when 'venda_paga' then coalesce(v_pref.email_venda, true)
      when 'comissao_estornada' then coalesce(v_pref.email_estorno, true)
      else coalesce(v_pref.email_recebedor, true) end;
  end if;
  insert into public.notificacoes (user_id, tipo, titulo, texto, link, chave, email_pendente)
  values (p_user, p_tipo, left(p_titulo, 120), left(p_texto, 400), p_link, p_chave, v_email)
  on conflict (user_id, chave) where chave is not null do nothing;
end; $$;
revoke execute on function public.notificar(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.notificar(uuid, text, text, text, text, text) to service_role;

-- avisa todos os admins
create or replace function public.notificar_admins(p_tipo text, p_titulo text, p_texto text, p_link text)
returns void language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  for a in select user_id from public.user_roles where papel = 'admin' loop
    perform public.notificar(a.user_id, p_tipo, p_titulo, p_texto, p_link);
  end loop;
end; $$;
revoke execute on function public.notificar_admins(text, text, text, text) from public, anon, authenticated;

-- primeiro nome (quem indicou nunca recebe o nome completo nem contato do comprador)
create or replace function public.primeiro_nome(p_nome text)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(split_part(trim(coalesce(p_nome, '')), ' ', 1), ''), 'cliente');
$$;

-- -------------------------------------------------------------------------
-- 4. Pedido: pago (venda nova), desistência, reembolso, chargeback, comissão estornada
-- -------------------------------------------------------------------------
create or replace function public.orders_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_loja uuid; v_cod text := coalesce(new.codigo, left(new.id::text, 8));
  v_link_loja text := case when new.codigo is null then '/painel/loja/pedidos' else '/painel/loja/pedidos/' || new.codigo end;
  v_estorno text[] := array['em_reembolso', 'reembolsado', 'chargeback'];
  v_dias integer;
begin
  if new.status is not distinct from old.status then return new; end if;
  select user_id into v_loja from public.producers where id = new.producer_id;

  if new.status = 'pago' then
    select (valor #>> '{}')::integer into v_dias from public.configuracoes where chave = 'prazo_nf_dias';
    perform public.notificar(v_loja, 'venda_paga', 'Venda nova',
      'O pedido ' || v_cod || ' foi pago. Emita a nota fiscal em até ' || coalesce(v_dias, 5) || ' dias e envie o pedido.',
      v_link_loja, 'pago:' || new.id);
    -- quem indicou (afiliado ou vendedor próprio): só o primeiro nome do comprador
    if new.revendedor_id is not null then
      perform public.notificar(new.revendedor_id, 'venda_atribuida', 'Venda atribuída a você',
        'Uma compra de ' || public.primeiro_nome(new.comprador_nome) || ' feita com a sua indicação foi paga. '
        || 'A comissão fica pendente durante o prazo de desistência.',
        case when new.vendedor_id is not null then '/painel/vendedor' else '/painel/afiliado' end,
        'atribuida:' || new.id);
    end if;
  elsif new.status = 'em_reembolso' then
    perform public.notificar(v_loja, 'desistencia', 'Desistência no pedido ' || v_cod,
      'O comprador desistiu da compra dentro do prazo. O pedido está em reembolso.', v_link_loja, 'desist:' || new.id);
  elsif new.status = 'reembolsado' then
    perform public.notificar(v_loja, 'reembolso', 'Reembolso concluído',
      'O pedido ' || v_cod || ' foi reembolsado ao comprador.', v_link_loja, 'reemb:' || new.id);
  elsif new.status = 'chargeback' then
    perform public.notificar(v_loja, 'chargeback', 'Contestação de pagamento (chargeback)',
      'O pedido ' || v_cod || ' teve o pagamento contestado pelo comprador no cartão. Veja o pedido.', v_link_loja, 'chargeback:' || new.id);
  end if;

  -- a comissão de quem indicou é estornada na primeira entrada em qualquer estado de estorno
  if new.status = any (v_estorno) and old.status <> all (v_estorno) and new.revendedor_id is not null then
    perform public.notificar(new.revendedor_id, 'comissao_estornada', 'Comissão estornada',
      'A comissão do pedido ' || v_cod || ' foi estornada porque a compra foi desfeita (desistência, reembolso ou contestação).',
      case when new.vendedor_id is not null then '/painel/vendedor' else '/painel/afiliado' end,
      'estorno:' || new.id);
  end if;
  return new;
end; $$;
create trigger orders_z_notifica after update of status on public.orders
  for each row execute function public.orders_notifica();

-- -------------------------------------------------------------------------
-- 5. Afiliação: pedido novo (loja) e decisão (afiliado)
-- -------------------------------------------------------------------------
create or replace function public.afiliacoes_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_dono uuid; v_produtor uuid; v_item text; v_afiliado text; v_loja_nome text;
begin
  select i.nome, i.producer_id into v_item, v_produtor from public.items i where i.id = new.item_id;
  select p.user_id, coalesce(p.loja_nome, p.razao_social) into v_dono, v_loja_nome from public.producers p where p.id = v_produtor;

  if tg_op = 'INSERT' then
    if new.status = 'pendente' and new.origem = 'catalogo' then
      select nome into v_afiliado from public.profiles where id = new.afiliado_id;
      perform public.notificar(v_dono, 'afiliacao_pedida', 'Pedido de afiliação novo',
        coalesce(v_afiliado, 'Alguém') || ' pediu para divulgar "' || coalesce(v_item, 'um produto') || '". Aprove ou recuse.',
        '/painel/loja/afiliados', 'afil_pedida:' || new.id);
    end if;
    return new;
  end if;

  -- decisão (só afiliação de catálogo; o vínculo de vendedor próprio é da loja)
  if new.status is distinct from old.status and new.origem = 'catalogo' then
    if new.status = 'aprovada' then
      perform public.notificar(new.afiliado_id, 'afiliacao_aprovada', 'Afiliação aprovada',
        'A loja ' || coalesce(v_loja_nome, '') || ' aprovou sua afiliação a "' || coalesce(v_item, 'um produto') || '". Você já pode divulgar.',
        '/painel/revendedor/catalogo', 'afil_aprov:' || new.id || ':' || coalesce(new.decidido_em::text, ''));
    elsif new.status = 'recusada'
          and not exists (select 1 from public.loja_afiliados_bloqueados b
                          where b.producer_id = v_produtor and b.afiliado_id = new.afiliado_id) then
      perform public.notificar(new.afiliado_id, 'afiliacao_recusada', 'Afiliação recusada',
        'A loja ' || coalesce(v_loja_nome, '') || ' não aprovou sua afiliação a "' || coalesce(v_item, 'um produto') || '".',
        '/painel/revendedor/catalogo', 'afil_receb:' || new.id || ':' || coalesce(new.decidido_em::text, ''));
    end if;
  end if;
  return new;
end; $$;
create trigger afiliacoes_zz_notifica after insert or update of status on public.afiliacoes
  for each row execute function public.afiliacoes_notifica();

create or replace function public.bloqueio_afiliado_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_loja_nome text;
begin
  select coalesce(loja_nome, razao_social) into v_loja_nome from public.producers where id = new.producer_id;
  perform public.notificar(new.afiliado_id, 'afiliacao_bloqueada', 'Divulgação bloqueada',
    'A loja ' || coalesce(v_loja_nome, '') || ' bloqueou sua divulgação. Seus links dessa loja deixaram de valer.',
    '/painel/revendedor/catalogo', 'bloqueio:' || new.producer_id || ':' || new.afiliado_id || ':' || new.bloqueado_em::text);
  return new;
end; $$;
create trigger loja_afiliados_bloqueados_notifica after insert on public.loja_afiliados_bloqueados
  for each row execute function public.bloqueio_afiliado_notifica();

-- -------------------------------------------------------------------------
-- 6. Recebedor aprovado, recusado ou suspenso (com o motivo)
-- -------------------------------------------------------------------------
create or replace function public.recebedores_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_link text; v_titulo text; v_texto text;
begin
  if new.status_recebedor not in ('aprovado', 'recusado', 'suspenso') then return new; end if;
  if tg_op = 'UPDATE' and new.status_recebedor is not distinct from old.status_recebedor then return new; end if;
  v_link := case new.papel when 'produtor' then '/painel/loja/recebimentos'
                           when 'afiliado' then '/painel/afiliado/recebimentos' else '/painel/vendedor' end;
  if new.status_recebedor = 'aprovado' then
    v_titulo := 'Cadastro de recebimento aprovado';
    v_texto := 'Seu cadastro de recebimento foi aprovado. Você já pode vender e divulgar.';
  elsif new.status_recebedor = 'recusado' then
    v_titulo := 'Cadastro de recebimento recusado';
    v_texto := 'Seu cadastro de recebimento foi recusado.' || coalesce(' Motivo: ' || new.motivo, '');
  else
    v_titulo := 'Cadastro de recebimento suspenso';
    v_texto := 'Seu cadastro de recebimento foi suspenso.' || coalesce(' Motivo: ' || new.motivo, '');
  end if;
  perform public.notificar(new.user_id, 'recebedor_' || new.status_recebedor, v_titulo, v_texto, v_link,
                           'recebedor:' || new.id || ':' || new.status_recebedor || ':' || new.atualizado_em::text);
  return new;
end; $$;
create trigger recebedores_z_notifica after insert or update of status_recebedor on public.recebedores
  for each row execute function public.recebedores_notifica();

-- -------------------------------------------------------------------------
-- 7. Admin: denúncia nova e loja aguardando curadoria
-- -------------------------------------------------------------------------
create or replace function public.denuncias_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notificar_admins('denuncia_nova', 'Denúncia nova',
    'Chegou uma denúncia (' || replace(new.motivo, '_', ' ') || '). Veja e decida.', '/admin/denuncias');
  return new;
end; $$;
create trigger denuncias_z_notifica after insert on public.denuncias
  for each row execute function public.denuncias_notifica();

create or replace function public.producers_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status_verificacao = 'em_analise' and (tg_op = 'INSERT' or old.status_verificacao is distinct from 'em_analise') then
    perform public.notificar_admins('loja_curadoria', 'Loja aguardando curadoria',
      'A loja ' || coalesce(new.loja_nome, new.razao_social) || ' foi enviada para análise.', '/admin/produtores');
  end if;
  return new;
end; $$;
create trigger producers_z_notifica after insert or update of status_verificacao on public.producers
  for each row execute function public.producers_notifica();

-- -------------------------------------------------------------------------
-- 8. Atendimento novo sobre pedido da loja
-- -------------------------------------------------------------------------
create or replace function public.atendimentos_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_dono uuid;
begin
  if new.producer_id is null then return new; end if;
  select user_id into v_dono from public.producers where id = new.producer_id;
  perform public.notificar(v_dono, 'atendimento_novo', 'Atendimento novo',
    'Um comprador abriu um atendimento sobre um pedido da sua loja (protocolo ' || new.protocolo || '). Responda dentro do prazo.',
    '/painel/loja/pedidos', 'atend:' || new.id);
  return new;
end; $$;
create trigger atendimentos_z_notifica after insert on public.atendimentos
  for each row execute function public.atendimentos_notifica();

-- -------------------------------------------------------------------------
-- 9. Pedido sem nota fiscal depois do prazo (rotina diária)
-- -------------------------------------------------------------------------
create or replace function public.notificar_pedidos_sem_nf()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_dias integer; v_n integer := 0; o record;
begin
  select (valor #>> '{}')::integer into v_dias from public.configuracoes where chave = 'prazo_nf_dias';
  for o in
    select ord.id, ord.codigo, p.user_id from public.orders ord join public.producers p on p.id = ord.producer_id
    where ord.status = 'pago' and ord.pago_em < now() - make_interval(days => coalesce(v_dias, 5))
      and exists (select 1 from public.order_items oi
                  where oi.order_id = ord.id and oi.nota_fiscal_numero is null and oi.status_entrega <> 'cancelado')
  loop
    perform public.notificar(o.user_id, 'pedido_sem_nf', 'Pedido sem nota fiscal',
      'O pedido ' || coalesce(o.codigo, left(o.id::text, 8)) || ' passou do prazo de ' || coalesce(v_dias, 5)
      || ' dias sem nota fiscal. Lance a nota para liberar o envio.',
      case when o.codigo is null then '/painel/loja/pedidos' else '/painel/loja/pedidos/' || o.codigo end,
      'sem_nf:' || o.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end; $$;
revoke execute on function public.notificar_pedidos_sem_nf() from public, anon, authenticated;
grant execute on function public.notificar_pedidos_sem_nf() to service_role;

-- rotina diária: igual à anterior (migração 20261205), mais a limpeza de notificações antigas e o aviso de nota fiscal
create or replace function public.apagar_dados_vencidos()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.clicks where criado_em < now() - interval '24 months';
  delete from public.erros_app where criado_em < now() - interval '90 days';
  delete from public.registros_acesso where criado_em < now() - interval '6 months';
  -- atendimento: 5 anos (prazo do CDC para reclamar de danos, art. 27)
  delete from public.atendimentos where criado_em < now() - interval '5 years';
  delete from public.notificacoes where criado_em < now() - interval '12 months';
  perform public.expirar_pedidos();
  perform public.notificar_pedidos_sem_nf();
end; $$;
revoke execute on function public.apagar_dados_vencidos() from public, anon, authenticated;
