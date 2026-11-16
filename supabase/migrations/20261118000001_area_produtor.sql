-- =========================================================================
-- STAYPSE — Etapa 3: área do produtor
-- =========================================================================
-- Aplicar depois de 20261117000001_lista_espera.sql (SQL Editor ou db push).
--
-- O que muda:
--  * Produtor: cadastro completo (endereço de envio, IE, contatos, 2 documentos)
--    com status rascunho → em_analise → aprovado / recusado (com motivo).
--  * Item: categoria, campos de físico e digital, declaração de nota fiscal,
--    comissão de 10% a 70%, 1 a 6 fotos, alerta de palavras proibidas.
--  * Aprovar/recusar só pelas funções admin_decidir_*, que gravam o log de
--    auditoria (quem decidiu e quando) na mesma operação.
-- =========================================================================


-- =========================================================================
-- 0. UTILITÁRIOS
-- =========================================================================

-- Minúsculas e sem acento, para comparar textos ("Remédio" = "remedio").
create or replace function public.sem_acento(t text)
returns text
language sql immutable
set search_path = ''
as $$
  select translate(lower(t), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
$$;


-- =========================================================================
-- 1. PALAVRAS PROIBIDAS (alerta automático, não bloqueia sozinho)
-- =========================================================================
create table public.palavras_proibidas (
  id         bigint generated always as identity primary key,
  termo      text not null unique check (char_length(termo) between 2 and 60),
  categoria  text not null check (char_length(categoria) between 2 and 60),
  criado_em  timestamptz not null default now()
);
comment on table public.palavras_proibidas is
  'Termos que marcam um item para revisão manual. Editar pelo SQL Editor (só admin).';

insert into public.palavras_proibidas (termo, categoria) values
  -- medicamentos e suplementos sem registro
  ('medicamento', 'Medicamentos'), ('remedio', 'Medicamentos'), ('sibutramina', 'Medicamentos'),
  ('anabolizante', 'Medicamentos'), ('esteroide', 'Medicamentos'), ('tadalafila', 'Medicamentos'),
  ('sildenafila', 'Medicamentos'), ('viagra', 'Medicamentos'), ('emagrecedor', 'Suplementos sem registro'),
  ('sem registro', 'Suplementos sem registro'), ('cura', 'Promessa de saúde'),
  -- réplicas
  ('replica', 'Réplicas'), ('primeira linha', 'Réplicas'), ('falsificado', 'Réplicas'),
  -- armas
  ('arma', 'Armas'), ('pistola', 'Armas'), ('revolver', 'Armas'), ('municao', 'Armas'),
  ('espingarda', 'Armas'), ('soco ingles', 'Armas'),
  -- conteúdo adulto
  ('conteudo adulto', 'Conteúdo adulto'), ('pornografia', 'Conteúdo adulto'), ('erotico', 'Conteúdo adulto'),
  -- apostas
  ('aposta', 'Apostas'), ('apostas', 'Apostas'), ('cassino', 'Apostas'), ('bet', 'Apostas'),
  ('tigrinho', 'Apostas'), ('jogo do bicho', 'Apostas'),
  -- "enriquecimento rápido"
  ('enriquecimento rapido', 'Enriquecimento rápido'), ('renda garantida', 'Enriquecimento rápido'),
  ('dinheiro facil', 'Enriquecimento rápido'), ('fique rico', 'Enriquecimento rápido'),
  ('ganhe dinheiro rapido', 'Enriquecimento rápido'), ('piramide', 'Enriquecimento rápido'),
  -- itens que exigem licença
  ('receita medica', 'Exige licença'), ('controlado', 'Exige licença'), ('agrotoxico', 'Exige licença'),
  ('fogos de artificio', 'Exige licença');

-- Devolve os termos proibidos encontrados no texto (palavra inteira, sem
-- diferenciar maiúsculas e acentos). Ex.: "Remédio natural" → {remedio}.
-- "arma" encontra "arma", mas não "armário".
create or replace function public.palavras_proibidas_em(texto text)
returns text[]
language sql stable security definer
set search_path = ''
as $$
  select coalesce(array_agg(p.termo order by p.termo), '{}')
  from public.palavras_proibidas p
  where public.sem_acento(coalesce(texto, ''))
        ~ ('\m' || regexp_replace(public.sem_acento(p.termo), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M');
$$;

alter table public.palavras_proibidas enable row level security;
revoke all on public.palavras_proibidas from anon, authenticated;
grant select on public.palavras_proibidas to authenticated;
create policy "palavras_proibidas: só admin vê" on public.palavras_proibidas
  for select to authenticated using (public.is_admin());


-- =========================================================================
-- 2. LOG DE AUDITORIA (quem aprovou/recusou e quando)
-- =========================================================================
-- Imutável: ninguém edita ou apaga pelo app. Só as funções de decisão gravam.
create table public.audit_log (
  id           bigint generated always as identity primary key,
  criado_em    timestamptz not null default now(),
  ator_id      uuid references public.profiles (id) on delete set null,
  acao         text not null check (char_length(acao) between 2 and 60),
  entidade     text not null check (entidade in ('producer', 'item')),
  entidade_id  uuid not null,
  detalhes     jsonb not null default '{}'
);
create index audit_log_entidade_idx on public.audit_log (entidade, entidade_id, criado_em desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
create policy "audit_log: só admin vê" on public.audit_log
  for select to authenticated using (public.is_admin());

create or replace function public.registrar_auditoria(p_acao text, p_entidade text, p_id uuid, p_detalhes jsonb)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.audit_log (ator_id, acao, entidade, entidade_id, detalhes)
  values ((select auth.uid()), p_acao, p_entidade, p_id, coalesce(p_detalhes, '{}'));
$$;
revoke execute on function public.registrar_auditoria(text, text, uuid, jsonb) from public, anon, authenticated;


-- =========================================================================
-- 3. PRODUTOR
-- =========================================================================
alter table public.producers drop constraint producers_status_verificacao_check;
alter table public.producers drop constraint producers_aprovacao_exige_cnpj_e_documento;

-- nomes novos dos status (os antigos eram pendente/rejeitado)
update public.producers
set status_verificacao = case status_verificacao
                           when 'pendente' then 'em_analise'
                           when 'rejeitado' then 'recusado'
                           else status_verificacao end;

alter table public.producers
  alter column status_verificacao set default 'rascunho',
  add constraint producers_status_check
    check (status_verificacao in ('rascunho', 'em_analise', 'aprovado', 'recusado', 'suspenso')),
  add column inscricao_estadual          text check (inscricao_estadual ~ '^([0-9]{2,14}|ISENTO)$'),
  add column whatsapp                    text check (whatsapp ~ '^[1-9]{2}(9[0-9]{8}|[0-9]{8})$'),
  add column email_contato               text check (email_contato = lower(email_contato)
                                                     and email_contato ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                                                     and char_length(email_contato) <= 254),
  -- endereço de envio (de onde saem os pedidos)
  add column cep                         text check (cep ~ '^[0-9]{8}$'),
  add column logradouro                  text check (char_length(logradouro) between 2 and 200),
  add column numero                      text check (char_length(numero) between 1 and 20),
  add column complemento                 text check (char_length(complemento) <= 100),
  add column bairro                      text check (char_length(bairro) between 2 and 100),
  add column cidade                      text check (char_length(cidade) between 2 and 120),
  add column uf                          text check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT',
                                                            'MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO',
                                                            'RR','SC','SP','SE','TO')),
  -- documento_path (já existia) = contrato social ou cartão CNPJ
  -- documento_responsavel_path   = documento com foto do responsável
  add column documento_responsavel_path  text,
  add column enviado_para_analise_em     timestamptz;

comment on column public.producers.documento_path is 'Contrato social ou cartão CNPJ (bucket privado documentos-produtores).';
comment on column public.producers.motivo_rejeicao is 'Motivo da recusa, visível ao produtor.';

-- Para ir à análise (ou ficar aprovado), o cadastro precisa estar completo.
alter table public.producers add constraint producers_cadastro_completo check (
  status_verificacao in ('rascunho', 'recusado')
  or (whatsapp is not null and email_contato is not null
      and cep is not null and logradouro is not null and numero is not null
      and bairro is not null and cidade is not null and uf is not null
      and documento_path is not null and documento_responsavel_path is not null)
);
-- REGRA 2: aprovado só com CNPJ ativo confirmado pelo admin
alter table public.producers add constraint producers_aprovacao_exige_cnpj_ativo check (
  status_verificacao <> 'aprovado'
  or (cnpj_ativo_verificado_em is not null and aprovado_em is not null)
);
-- Recusa sempre com motivo (o produtor precisa saber o que corrigir)
alter table public.producers add constraint producers_recusa_com_motivo check (
  status_verificacao <> 'recusado' or char_length(trim(motivo_rejeicao)) >= 5
);

-- Arquivos do produtor só podem apontar para a PRÓPRIA pasta no storage
create or replace function public.producers_valida_caminhos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (new.documento_path is not null and not starts_with(new.documento_path, auth.uid()::text || '/'))
       or (new.documento_responsavel_path is not null
           and not starts_with(new.documento_responsavel_path, auth.uid()::text || '/')) then
      raise exception 'documento_fora_da_pasta';
    end if;
  end if;
  return new;
end;
$$;
create trigger producers_valida_caminhos before insert or update on public.producers
  for each row execute function public.producers_valida_caminhos();

-- Permissões: o produtor preenche o cadastro; status e decisões, nunca.
grant insert (inscricao_estadual, whatsapp, email_contato, cep, logradouro, numero, complemento,
              bairro, cidade, uf, documento_responsavel_path)
  on public.producers to authenticated;
grant update (inscricao_estadual, whatsapp, email_contato, cep, logradouro, numero, complemento,
              bairro, cidade, uf, documento_responsavel_path)
  on public.producers to authenticated;

-- Edita só em rascunho ou depois de recusado (em análise/aprovado: travado)
drop policy "producers: editar o próprio enquanto não aprovado" on public.producers;
create policy "producers: editar o próprio em rascunho ou recusado" on public.producers
  for update to authenticated
  using (user_id = (select auth.uid()) and status_verificacao in ('rascunho', 'recusado'))
  with check (user_id = (select auth.uid()));

-- ---------- produtor envia o cadastro para análise ----------
create or replace function public.enviar_produtor_para_analise()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status text;
begin
  select id, status_verificacao into v_id, v_status
  from public.producers where user_id = (select auth.uid());

  if v_id is null then raise exception 'cadastro_inexistente'; end if;
  if v_status not in ('rascunho', 'recusado') then raise exception 'status_nao_permite_envio'; end if;
  if not exists (select 1 from public.terms_acceptances
                 where user_id = (select auth.uid()) and documento = 'termos_produtor') then
    raise exception 'contrato_nao_aceito';
  end if;

  -- se faltar algum dado, a regra producers_cadastro_completo recusa aqui
  update public.producers
  set status_verificacao = 'em_analise', motivo_rejeicao = null, enviado_para_analise_em = now()
  where id = v_id;

  perform public.registrar_auditoria('enviado_para_analise', 'producer', v_id, '{}');
end;
$$;
revoke execute on function public.enviar_produtor_para_analise() from public, anon;
grant execute on function public.enviar_produtor_para_analise() to authenticated;

-- ---------- admin aprova ou recusa o produtor ----------
create or replace function public.admin_decidir_produtor(
  p_producer uuid, p_aprovar boolean, p_motivo text default null, p_cnpj_ativo_confirmado boolean default false
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;

  select status_verificacao into v_status from public.producers where id = p_producer for update;
  if v_status is null then raise exception 'produtor_inexistente'; end if;
  if v_status <> 'em_analise' then raise exception 'produtor_nao_esta_em_analise'; end if;

  if p_aprovar then
    if not coalesce(p_cnpj_ativo_confirmado, false) then raise exception 'confirme_cnpj_ativo'; end if;
    update public.producers
    set status_verificacao = 'aprovado', motivo_rejeicao = null,
        cnpj_ativo_verificado_em = now(), aprovado_em = now(), aprovado_por = (select auth.uid())
    where id = p_producer;
    perform public.registrar_auditoria('produtor_aprovado', 'producer', p_producer,
                                       jsonb_build_object('cnpj_ativo_confirmado', true));
  else
    if char_length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'motivo_obrigatorio'; end if;
    update public.producers
    set status_verificacao = 'recusado', motivo_rejeicao = trim(p_motivo),
        aprovado_em = null, aprovado_por = null
    where id = p_producer;
    perform public.registrar_auditoria('produtor_recusado', 'producer', p_producer,
                                       jsonb_build_object('motivo', trim(p_motivo)));
  end if;
end;
$$;
revoke execute on function public.admin_decidir_produtor(uuid, boolean, text, boolean) from public, anon;
grant execute on function public.admin_decidir_produtor(uuid, boolean, text, boolean) to authenticated;

-- ---------- admin informa o id do recebedor na Lytex (manual nesta fase) ----------
create or replace function public.admin_definir_recebedor_lytex(p_producer uuid, p_recebedor text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;
  update public.producers set lytex_recebedor_id = nullif(trim(p_recebedor), '') where id = p_producer;
  if not found then raise exception 'produtor_inexistente'; end if;
  perform public.registrar_auditoria('recebedor_lytex_definido', 'producer', p_producer,
                                     jsonb_build_object('lytex_recebedor_id', nullif(trim(p_recebedor), '')));
end;
$$;
revoke execute on function public.admin_definir_recebedor_lytex(uuid, text) from public, anon;
grant execute on function public.admin_definir_recebedor_lytex(uuid, text) to authenticated;


-- =========================================================================
-- 4. ITENS
-- =========================================================================
alter table public.items drop constraint items_status_aprovacao_check;
alter table public.items drop constraint items_fisico_completo;

update public.items set status_aprovacao = 'recusado' where status_aprovacao = 'rejeitado';

alter table public.items
  add constraint items_status_check
    check (status_aprovacao in ('rascunho', 'em_analise', 'aprovado', 'recusado', 'pausado')),
  add constraint items_fotos_max6 check (cardinality(fotos) <= 6),
  -- comissão do revendedor: mínimo 10%, máximo 70%
  add constraint items_comissao_faixa check (comissao_percentual between 10 and 70),
  add column categoria              text check (categoria in ('beleza','moda','casa','saude_fitness','infantil',
                                                              'pets','tecnologia','alimentos','cursos_digitais','outros')),
  -- físico
  add column prazo_postagem_dias    integer check (prazo_postagem_dias between 1 and 30),
  add column retirada_local         boolean not null default false,
  -- digital
  add column tipo_digital           text check (tipo_digital in ('curso','ebook','mentoria','planilha','servico_agendavel')),
  add column arquivo_path           text,  -- bucket PRIVADO arquivos-digitais
  add column link_acesso            text check (link_acesso ~ '^https://' and char_length(link_acesso) <= 2000),
  add column instrucoes_pos_compra  text check (char_length(instrucoes_pos_compra) <= 3000),
  -- REGRA 2: declaração "emito nota fiscal de todas as vendas"
  -- (o produtor marca declaracao_nf; a data vem do servidor)
  add column declaracao_nf          boolean not null default false,
  add column declaracao_nf_em       timestamptz,
  -- termos proibidos encontrados (preenchido automaticamente)
  add column alerta_palavras        text[] not null default '{}',
  add column enviado_para_analise_em timestamptz;

comment on column public.items.motivo_rejeicao is 'Motivo da recusa, visível ao produtor.';

-- Para ir à análise (ou ficar aprovado/pausado), o item precisa estar completo.
alter table public.items add constraint items_completo_para_analise check (
  status_aprovacao in ('rascunho', 'recusado')
  or (cardinality(fotos) >= 1
      and descricao is not null and char_length(trim(descricao)) >= 10
      and categoria is not null
      and declaracao_nf_em is not null
      and (tipo <> 'fisico'
           or (estoque is not null and peso_gramas is not null and altura_cm is not null
               and largura_cm is not null and comprimento_cm is not null and prazo_postagem_dias is not null))
      and (tipo <> 'digital'
           or (tipo_digital is not null and (arquivo_path is not null or link_acesso is not null)
               and instrucoes_pos_compra is not null and char_length(trim(instrucoes_pos_compra)) >= 5)))
);
alter table public.items add constraint items_recusa_com_motivo check (
  status_aprovacao <> 'recusado' or char_length(trim(motivo_rejeicao)) >= 5
);

-- ---------- gatilhos ----------

-- Data da declaração de NF vem do servidor; desmarcar apaga a data.
-- Também calcula o alerta de palavras proibidas a cada gravação.
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
    concat_ws(' ', new.nome, new.descricao, new.instrucoes_pos_compra));
  return new;
end;
$$;
create trigger items_a_preenche_automaticos before insert or update on public.items
  for each row execute function public.items_preenche_automaticos();

-- Mudanças feitas pelo PRÓPRIO produtor (substitui a versão da Etapa 1):
--  * cria só em rascunho ou em_analise; nunca aprova nem recusa;
--  * editar preço, comissão, descrição (e outros dados do anúncio) de um item
--    aprovado/pausado → volta para em_analise. Estoque, peso, medidas, prazo
--    e retirada podem mudar sem nova análise;
--  * pausar/despausar item já aprovado;
--  * arquivo digital só da própria pasta.
create or replace function public.items_controla_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;  -- funções de admin e servidor (service_role)
  end if;

  if new.arquivo_path is not null
     and (tg_op = 'INSERT' or new.arquivo_path is distinct from old.arquivo_path)
     and not starts_with(new.arquivo_path, auth.uid()::text || '/') then
    raise exception 'arquivo_fora_da_pasta';
  end if;

  if tg_op = 'INSERT' then
    if new.status_aprovacao not in ('rascunho', 'em_analise') then
      raise exception 'Item novo deve começar como rascunho ou em análise.';
    end if;
    new.aprovado_em := null;
    new.motivo_rejeicao := null;
    if new.status_aprovacao = 'em_analise' then new.enviado_para_analise_em := now(); end if;
    return new;
  end if;

  if (new.nome, new.descricao, new.fotos, new.preco_centavos, new.tipo, new.comissao_percentual,
      new.categoria, new.tipo_digital, new.arquivo_path, new.link_acesso, new.instrucoes_pos_compra)
     is distinct from
     (old.nome, old.descricao, old.fotos, old.preco_centavos, old.tipo, old.comissao_percentual,
      old.categoria, old.tipo_digital, old.arquivo_path, old.link_acesso, old.instrucoes_pos_compra) then
    new.aprovado_em := null;
    if new.status_aprovacao in ('aprovado', 'pausado') then
      new.status_aprovacao := 'em_analise';
    end if;
  end if;

  if new.status_aprovacao is distinct from old.status_aprovacao then
    if new.status_aprovacao = 'aprovado'
       and not (old.status_aprovacao = 'pausado' and old.aprovado_em is not null
                and new.aprovado_em is not distinct from old.aprovado_em) then
      raise exception 'Somente a equipe Staypse aprova itens.';
    end if;
    if new.status_aprovacao = 'recusado' then
      raise exception 'Somente a equipe Staypse recusa itens.';
    end if;
    if new.status_aprovacao = 'pausado' and old.status_aprovacao <> 'aprovado' then
      raise exception 'Só é possível pausar um item aprovado.';
    end if;
    if new.status_aprovacao = 'em_analise' then
      new.motivo_rejeicao := null;
      new.enviado_para_analise_em := now();
    end if;
  end if;

  return new;
end;
$$;

-- Vale para TODOS (inclusive admin): item aprovado exige produtor aprovado.
create or replace function public.items_exige_produtor_aprovado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status_aprovacao = 'aprovado' and not public.produtor_aprovado(new.producer_id) then
    raise exception 'produtor_nao_aprovado';
  end if;
  return new;
end;
$$;
create trigger items_z_exige_produtor_aprovado before insert or update on public.items
  for each row execute function public.items_exige_produtor_aprovado();

-- Permissões das colunas novas
grant insert (categoria, prazo_postagem_dias, retirada_local, tipo_digital, arquivo_path, link_acesso,
              instrucoes_pos_compra, declaracao_nf)
  on public.items to authenticated;
grant update (categoria, prazo_postagem_dias, retirada_local, tipo_digital, arquivo_path, link_acesso,
              instrucoes_pos_compra, declaracao_nf)
  on public.items to authenticated;

-- ---------- admin aprova ou recusa o item ----------
create or replace function public.admin_decidir_item(p_item uuid, p_aprovar boolean, p_motivo text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not public.is_admin() then raise exception 'apenas_admin'; end if;

  select status_aprovacao into v_status from public.items where id = p_item for update;
  if v_status is null then raise exception 'item_inexistente'; end if;
  if v_status <> 'em_analise' then raise exception 'item_nao_esta_em_analise'; end if;

  if p_aprovar then
    -- o gatilho items_z_exige_produtor_aprovado barra se o produtor não estiver aprovado
    update public.items
    set status_aprovacao = 'aprovado', aprovado_em = now(), motivo_rejeicao = null
    where id = p_item;
    perform public.registrar_auditoria('item_aprovado', 'item', p_item, '{}');
  else
    if char_length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'motivo_obrigatorio'; end if;
    update public.items
    set status_aprovacao = 'recusado', motivo_rejeicao = trim(p_motivo), aprovado_em = null
    where id = p_item;
    perform public.registrar_auditoria('item_recusado', 'item', p_item,
                                       jsonb_build_object('motivo', trim(p_motivo)));
  end if;
end;
$$;
revoke execute on function public.admin_decidir_item(uuid, boolean, text) from public, anon;
grant execute on function public.admin_decidir_item(uuid, boolean, text) to authenticated;


-- =========================================================================
-- 5. ARMAZENAMENTO
-- =========================================================================
-- Arquivos de produtos digitais: PRIVADO (entregue só ao comprador, depois).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos-digitais', 'arquivos-digitais', false, 52428800,
        array['application/pdf', 'application/zip', 'application/epub+zip', 'text/csv',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;

-- Garante que documentos e arquivos digitais NUNCA sejam públicos
update storage.buckets set public = false where id in ('documentos-produtores', 'arquivos-digitais');

create policy "arquivos-digitais: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'arquivos-digitais'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "arquivos-digitais: dono ou admin vê" on storage.objects
  for select to authenticated
  using (bucket_id = 'arquivos-digitais'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "arquivos-digitais: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'arquivos-digitais'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "arquivos-digitais: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'arquivos-digitais'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documentos: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos-produtores'
         and (storage.foldername(name))[1] = (select auth.uid())::text);


-- =========================================================================
-- 6. ROTAS NOVAS QUE NÃO PODEM VIRAR VITRINE
-- =========================================================================
create or replace function public.slug_reservado(s text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select s = any (array[
    'admin','api','auth','entrar','sair','cadastro','cadastrar','conta',
    'painel','produtor','produtores','revendedor','revendedores','vitrine',
    'vitrines','marketplace','loja','produtos','produto','itens','item',
    'carrinho','checkout','pagamento','pedido','pedidos','termos',
    'privacidade','lgpd','ajuda','suporte','contato','sobre','blog',
    'staypse','brand','static','public','_next','www','app','login',
    'lista','obrigado','indicacao','indicar','espera',
    -- Etapa 3
    'produtos-proibidos','proibidos','contrato-produtor','contrato'
  ]);
$$;
