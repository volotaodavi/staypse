-- =========================================================================
-- Migração 12 — Etapa 6: KYC SÓ PELA LYTEX + recebedores + eventos de pagamento
-- =========================================================================
-- Decisão do negócio: a Staypse NÃO faz verificação de identidade própria.
-- Quem verifica lojas, produtores, afiliados e vendedores "split_direto" é a
-- Lytex, no cadastro do RECEBEDOR. A Staypse guarda só o STATUS que a Lytex
-- informa (nunca documentos nem dados bancários) — minimização (LGPD art. 6º, III).
--
-- Regras garantidas aqui:
--  * produto só vai para análise/publicação com o recebedor da loja "aprovado";
--  * afiliado só se afilia com recebedor "aprovado";
--  * loja sem recebedor aprovado não recebe pedido novo;
--  * indicação de quem não tem recebedor aprovado não gera comissão
--    (vendedor "na folha" não tem recebedor: a parte dele vai para a loja);
--  * o CPF/CNPJ do cadastro precisa ser o mesmo do recebedor na Lytex.

-- -------------------------------------------------------------------------
-- 1. Log de auditoria: mais tipos de registro e IMUTÁVEL (ninguém altera/apaga)
-- -------------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_entidade_check;
alter table public.audit_log add constraint audit_log_entidade_check
  check (entidade in ('producer', 'item', 'sistema', 'recebedor', 'usuario', 'configuracao', 'denuncia', 'pedido'));

create or replace function public.audit_log_imutavel()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- única mudança aceita: anonimizar o autor quando a conta é excluída (LGPD),
  -- feita pela chave estrangeira (on delete set null). O registro continua.
  if tg_op = 'UPDATE' and old.ator_id is not null and new.ator_id is null
     and (new.criado_em, new.acao, new.entidade, new.entidade_id, new.detalhes)
         is not distinct from (old.criado_em, old.acao, old.entidade, old.entidade_id, old.detalhes) then
    return new;
  end if;
  raise exception 'audit_log_imutavel';
end; $$;
create trigger audit_log_sem_alteracao before update or delete on public.audit_log
  for each row execute function public.audit_log_imutavel();
create trigger audit_log_sem_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_imutavel();

-- -------------------------------------------------------------------------
-- 2. Fim do KYC próprio: sem documentos, sem bucket de documentos
-- -------------------------------------------------------------------------
drop policy if exists "documentos: dono envia" on storage.objects;
drop policy if exists "documentos: dono ou admin vê" on storage.objects;
drop policy if exists "documentos: dono atualiza" on storage.objects;
drop policy if exists "documentos: dono apaga" on storage.objects;

do $$
declare v_removidos integer := 0;
begin
  -- apaga os documentos já enviados (sem manter cópia). No Supabase hospedado,
  -- a tabela de arquivos pode bloquear DELETE direto: aí a limpeza usa a API de
  -- Storage, e este registro diz quantos saíram por aqui.
  begin
    with apagados as (delete from storage.objects where bucket_id = 'documentos-produtores' returning 1)
    select count(*) into v_removidos from apagados;
    delete from storage.buckets where id = 'documentos-produtores';
  exception when others then
    raise notice 'documentos: remoção direta indisponível (%), usar a API de Storage', sqlerrm;
  end;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'kyc_proprio_removido', 'sistema', '00000000-0000-0000-0000-000000000000',
          jsonb_build_object('documentos_apagados', v_removidos,
                             'motivo', 'Verificação de identidade passa a ser feita pela Lytex no cadastro do recebedor (LGPD: minimização)'));
end $$;

alter table public.producers drop constraint if exists producers_cadastro_completo;
alter table public.producers drop constraint if exists producers_aprovacao_exige_cnpj_ativo;
drop trigger if exists producers_valida_caminhos on public.producers;
drop function if exists public.producers_valida_caminhos();
alter table public.producers drop column documento_path, drop column documento_responsavel_path;

-- cadastro (não KYC): dados para exibir quem vende (Decreto 7.962) e para a nota fiscal
alter table public.producers add constraint producers_cadastro_completo check (
  status_verificacao in ('rascunho', 'recusado')
  or (whatsapp is not null and email_contato is not null
      and cep is not null and logradouro is not null and numero is not null
      and bairro is not null and cidade is not null and uf is not null)
);
alter table public.producers add constraint producers_aprovacao_com_data check (
  status_verificacao <> 'aprovado' or aprovado_em is not null
);

-- admin aprova a LOJA por conteúdo (curadoria), não por identidade
create or replace function public.admin_decidir_produtor(
  p_producer uuid, p_aprovar boolean, p_motivo text default null, p_cnpj_ativo_confirmado boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  select status_verificacao into v_status from public.producers where id = p_producer for update;
  if v_status is null then raise exception 'produtor_inexistente'; end if;
  if v_status <> 'em_analise' then raise exception 'produtor_nao_esta_em_analise'; end if;
  if p_aprovar then
    update public.producers
    set status_verificacao = 'aprovado', motivo_rejeicao = null, aprovado_em = now(), aprovado_por = (select auth.uid())
    where id = p_producer;
    perform public.registrar_auditoria('loja_aprovada', 'producer', p_producer,
      jsonb_build_object('antes', v_status, 'depois', 'aprovado'));
  else
    if char_length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'motivo_obrigatorio'; end if;
    update public.producers
    set status_verificacao = 'recusado', motivo_rejeicao = trim(p_motivo), aprovado_em = null, aprovado_por = null
    where id = p_producer;
    perform public.registrar_auditoria('loja_recusada', 'producer', p_producer,
      jsonb_build_object('antes', v_status, 'depois', 'recusado', 'motivo', trim(p_motivo)));
  end if;
end; $$;

-- o id do recebedor agora vem da tabela de recebedores (não é mais digitado pelo admin)
drop function if exists public.admin_definir_recebedor_lytex(uuid, text);

-- -------------------------------------------------------------------------
-- 3. Recebedores (status vindo da Lytex; nada de documento ou dado bancário)
-- -------------------------------------------------------------------------
create table public.recebedores (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  -- produtor: recebe pela empresa (CNPJ); afiliado e vendedor split_direto: CPF ou CNPJ
  papel              text not null check (papel in ('produtor', 'afiliado', 'vendedor')),
  documento          text not null check (public.documento_valido(documento)),
  provedor           text not null check (provedor in ('mock', 'lytex')),
  provedor_id        text unique,
  status_recebedor   text not null default 'nao_iniciado'
                       check (status_recebedor in ('nao_iniciado', 'em_analise', 'aprovado', 'recusado', 'suspenso')),
  -- motivo informado pela Lytex (recusa/suspensão), mostrado à pessoa
  motivo             text check (char_length(motivo) <= 500),
  -- documento que a Lytex devolveu; se divergir do cadastro, bloqueia
  documento_provedor text,
  consultado_em      timestamptz,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  unique (user_id, papel)
);
create trigger recebedores_atualizado_em before update on public.recebedores
  for each row execute function public.set_atualizado_em();
alter table public.recebedores enable row level security;
revoke all on public.recebedores from anon, authenticated;
grant select on public.recebedores to authenticated;
create policy "recebedores: o próprio ou admin" on public.recebedores
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- recebedor apto: aprovado na Lytex E com o mesmo CPF/CNPJ do cadastro
create or replace function public.recebedor_aprovado(p_user uuid, p_papel text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.recebedores r
    where r.user_id = p_user and r.papel = p_papel and r.status_recebedor = 'aprovado'
      and (r.documento_provedor is null or r.documento_provedor = r.documento)
      and (p_papel <> 'produtor' or r.documento = (select p.cnpj from public.producers p where p.user_id = p_user))
  );
$$;
revoke execute on function public.recebedor_aprovado(uuid, text) from public, anon;
grant execute on function public.recebedor_aprovado(uuid, text) to authenticated, service_role;

-- a loja pode vender? (o checkout avisa antes de a pessoa preencher tudo)
create or replace function public.loja_pode_vender(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select public.recebedor_aprovado(p.user_id, 'produtor')
                   from public.items i join public.producers p on p.id = i.producer_id where i.id = p_item), false);
$$;
revoke execute on function public.loja_pode_vender(uuid) from public;
grant execute on function public.loja_pode_vender(uuid) to anon, authenticated, service_role;

-- o servidor registra o recebedor criado na Lytex (ou no simulador)
create or replace function public.registrar_recebedor(
  p_user uuid, p_papel text, p_documento text, p_provedor text, p_provedor_id text, p_status text, p_motivo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_doc text := upper(regexp_replace(coalesce(p_documento, ''), '\W', '', 'g'));
begin
  if p_papel = 'produtor' and v_doc is distinct from (select cnpj from public.producers where user_id = p_user) then
    raise exception 'documento_diferente_do_cadastro';
  end if;
  insert into public.recebedores (user_id, papel, documento, provedor, provedor_id, status_recebedor, motivo)
  values (p_user, p_papel, v_doc, p_provedor, p_provedor_id, p_status, p_motivo)
  on conflict (user_id, papel) do update
    set documento = excluded.documento, provedor = excluded.provedor, provedor_id = excluded.provedor_id,
        status_recebedor = excluded.status_recebedor, motivo = excluded.motivo, documento_provedor = null
  returning id into v_id;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (p_user, 'recebedor_iniciado', 'recebedor', v_id,
          jsonb_build_object('papel', p_papel, 'provedor', p_provedor, 'status', p_status));
  return v_id;
end; $$;
revoke execute on function public.registrar_recebedor(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_recebedor(uuid, text, text, text, text, text, text) to service_role;

-- status que a Lytex informa (webhook ou conciliação)
create or replace function public.aplicar_status_recebedor(
  p_provedor text, p_provedor_id text, p_status text, p_motivo text, p_documento text)
returns text language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select * into r from public.recebedores where provedor = p_provedor and provedor_id = p_provedor_id for update;
  if r.id is null then raise exception 'recebedor_inexistente'; end if;
  update public.recebedores
  set status_recebedor = p_status, motivo = nullif(left(trim(coalesce(p_motivo, '')), 500), ''),
      documento_provedor = nullif(upper(regexp_replace(coalesce(p_documento, ''), '\W', '', 'g')), ''),
      consultado_em = now()
  where id = r.id;
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values (null, 'recebedor_status', 'recebedor', r.id,
          jsonb_build_object('antes', r.status_recebedor, 'depois', p_status, 'motivo', p_motivo, 'provedor', p_provedor));
  return r.status_recebedor;
end; $$;
revoke execute on function public.aplicar_status_recebedor(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.aplicar_status_recebedor(text, text, text, text, text) to service_role;

-- -------------------------------------------------------------------------
-- 4. Eventos de pagamento (webhooks): registro bruto + idempotência
-- -------------------------------------------------------------------------
create table public.eventos_pagamento (
  id            bigint generated always as identity primary key,
  provedor      text not null check (provedor in ('mock', 'lytex')),
  evento_id     text not null check (char_length(evento_id) <= 200),
  tipo          text not null check (char_length(tipo) <= 80),
  payload       jsonb not null,
  recebido_em   timestamptz not null default now(),
  processado_em timestamptz,
  erro          text check (char_length(erro) <= 500),
  -- o mesmo evento chegando duas vezes não é processado de novo
  unique (provedor, evento_id)
);
alter table public.eventos_pagamento enable row level security;
revoke all on public.eventos_pagamento from anon, authenticated;
grant select on public.eventos_pagamento to authenticated;
grant select, insert, update on public.eventos_pagamento to service_role;
create policy "eventos: só admin vê" on public.eventos_pagamento for select to authenticated using (public.is_admin());

-- -------------------------------------------------------------------------
-- 5. As regras de recebedor valendo no banco
-- -------------------------------------------------------------------------
-- produto só vai para análise / é aprovado com o recebedor da loja aprovado
create or replace function public.items_exige_recebedor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status_aprovacao in ('em_analise', 'aprovado')
     and (tg_op = 'INSERT' or old.status_aprovacao is distinct from new.status_aprovacao)
     and not public.recebedor_aprovado((select p.user_id from public.producers p where p.id = new.producer_id), 'produtor') then
    raise exception 'recebedor_pendente';
  end if;
  return new;
end; $$;
revoke execute on function public.items_exige_recebedor() from public, anon, authenticated;
create trigger items_d_exige_recebedor before insert or update of status_aprovacao on public.items
  for each row execute function public.items_exige_recebedor();

-- afiliar-se exige recebedor aprovado (antes disso, dá para navegar no catálogo)
create or replace function public.afiliacoes_exige_recebedor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.origem = 'catalogo' and new.status in ('pendente', 'aprovada')
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.origem is distinct from new.origem)
     and not public.recebedor_aprovado(new.afiliado_id, 'afiliado') then
    raise exception 'recebedor_pendente';
  end if;
  return new;
end; $$;
revoke execute on function public.afiliacoes_exige_recebedor() from public, anon, authenticated;
create trigger afiliacoes_y_recebedor before insert or update of status, origem on public.afiliacoes
  for each row execute function public.afiliacoes_exige_recebedor();

-- pedido novo: loja precisa de recebedor aprovado; quem indicou também
-- (vendedor "na folha" não tem recebedor: a parte dele vai para a loja)
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
  return new;
end; $$;
revoke execute on function public.orders_exige_recebedores() from public, anon, authenticated;
create trigger orders_a_recebedores before insert on public.orders
  for each row execute function public.orders_exige_recebedores();

-- sem quem indicar, não há comissão no item
create or replace function public.order_items_comissao_sem_indicacao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select o.revendedor_id from public.orders o where o.id = new.order_id) is null then
    new.comissao_percentual := 0;
  end if;
  return new;
end; $$;
revoke execute on function public.order_items_comissao_sem_indicacao() from public, anon, authenticated;
create trigger order_items_c_comissao before insert on public.order_items
  for each row execute function public.order_items_comissao_sem_indicacao();

-- afiliar-se: a mesma função da migração 10, agora checando o recebedor logo no início
create or replace function public.afiliar_se(p_item uuid)
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
