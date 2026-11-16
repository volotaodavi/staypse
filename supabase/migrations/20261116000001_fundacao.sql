-- =========================================================================
-- STAYPSE — Etapa 1: fundação do banco
-- =========================================================================
-- Como aplicar: Supabase > SQL Editor > cole este arquivo > Run.
-- (ou, com a CLI: supabase db push)
--
-- Princípios que este arquivo garante:
--  * A Staypse NUNCA guarda dinheiro: não existe saldo, carteira nem
--    "valor a repassar". Só guardamos REFERÊNCIAS do pagamento na Lytex
--    (id da cobrança, status e percentuais do split) — tabela payment_refs.
--  * Revendedor ganha só sobre as próprias vendas: a comissão sai apenas de
--    orders.revendedor_id. Não há tabela de indicação/recrutamento nem taxa
--    de adesão.
--  * Toda tabela tem RLS ligado. Usuário comum vê/edita só o que é dele;
--    admin vê tudo. Mudanças sensíveis (aprovar produtor, aprovar item,
--    criar pedido, registrar pagamento) só o servidor faz, com a chave
--    service_role, depois de checar quem está pedindo.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 0. Funções utilitárias (sem acesso a tabelas)
-- -------------------------------------------------------------------------

-- Atualiza a coluna atualizado_em em todo UPDATE.
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Valida CPF (11 dígitos) ou CNPJ (14 caracteres) pelos dígitos verificadores.
-- Já aceita o CNPJ ALFANUMÉRICO da Receita (vigente desde jul/2026): as 12
-- primeiras posições podem ter letras A-Z; cada caractere vale ascii - 48.
-- Espera o documento SEM pontuação e em maiúsculas.
-- "strict": se o documento for nulo devolve nulo, e o CHECK aceita
-- (campo opcional). Para exigir o documento, use NOT NULL na coluna.
create or replace function public.documento_valido(doc text)
returns boolean
language plpgsql
immutable strict
set search_path = ''
as $$
declare
  soma int;
  resto int;
  dv1 int;
  dv2 int;
  i int;
  pesos1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  pesos2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
begin
  -- ---------- CPF ----------
  if doc ~ '^[0-9]{11}$' then
    if doc ~ '^(.)\1{10}$' then  -- 000.000.000-00, 111... etc.
      return false;
    end if;
    soma := 0;
    for i in 1..9 loop
      soma := soma + substr(doc, i, 1)::int * (11 - i);
    end loop;
    dv1 := (soma * 10) % 11;
    if dv1 = 10 then dv1 := 0; end if;
    soma := 0;
    for i in 1..10 loop
      soma := soma + substr(doc, i, 1)::int * (12 - i);
    end loop;
    dv2 := (soma * 10) % 11;
    if dv2 = 10 then dv2 := 0; end if;
    return dv1 = substr(doc, 10, 1)::int and dv2 = substr(doc, 11, 1)::int;
  end if;

  -- ---------- CNPJ (numérico ou alfanumérico) ----------
  if doc ~ '^[0-9A-Z]{12}[0-9]{2}$' then
    if doc ~ '^(.)\1{13}$' then
      return false;
    end if;
    soma := 0;
    for i in 1..12 loop
      soma := soma + (ascii(substr(doc, i, 1)) - 48) * pesos1[i];
    end loop;
    resto := soma % 11;
    dv1 := case when resto < 2 then 0 else 11 - resto end;
    soma := 0;
    for i in 1..13 loop
      soma := soma + (ascii(substr(doc, i, 1)) - 48) * pesos2[i];
    end loop;
    resto := soma % 11;
    dv2 := case when resto < 2 then 0 else 11 - resto end;
    return dv1 = substr(doc, 13, 1)::int and dv2 = substr(doc, 14, 1)::int;
  end if;

  return false;
end;
$$;

-- Endereços que não podem virar slug de vitrine, porque são rotas do site
-- (staypse.com.br/<slug>). Ao criar uma rota nova no app, inclua aqui.
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
    'staypse','brand','static','public','_next','www','app','login'
  ]);
$$;


-- -------------------------------------------------------------------------
-- 1. PROFILES — dados básicos de todo usuário
-- -------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  nome           text not null check (char_length(nome) between 2 and 120),
  -- pf = pessoa física (CPF), pj = pessoa jurídica (CNPJ)
  tipo_pessoa    text check (tipo_pessoa in ('pf', 'pj')),
  documento      text check (public.documento_valido(documento)),
  telefone       text check (telefone ~ '^[1-9]{2}9?[0-9]{8}$'),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  -- CPF combina com pf, CNPJ com pj
  check (
    documento is null
    or (tipo_pessoa = 'pf' and char_length(documento) = 11)
    or (tipo_pessoa = 'pj' and char_length(documento) = 14)
  )
);
comment on table public.profiles is 'Dados básicos de cada usuário. Criado automaticamente no cadastro.';

create trigger profiles_atualizado_em before update on public.profiles
  for each row execute function public.set_atualizado_em();


-- -------------------------------------------------------------------------
-- 2. USER_ROLES — papéis (uma pessoa pode ter vários)
-- -------------------------------------------------------------------------
create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  papel      text not null check (papel in ('produtor', 'revendedor', 'admin')),
  criado_em  timestamptz not null default now(),
  primary key (user_id, papel)
);
comment on table public.user_roles is
  'Papéis do usuário. produtor e revendedor o próprio usuário escolhe; admin só via servidor/SQL.';


-- -------------------------------------------------------------------------
-- 3. PRODUCERS — dados empresariais do produtor
-- -------------------------------------------------------------------------
create table public.producers (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references public.profiles (id) on delete restrict,
  razao_social              text not null check (char_length(razao_social) between 2 and 200),
  cnpj                      text not null unique
                              check (char_length(cnpj) = 14 and public.documento_valido(cnpj)),
  -- caminho do documento no bucket privado "documentos-produtores"
  -- (cartão CNPJ / contrato social)
  documento_path            text,
  status_verificacao        text not null default 'pendente'
                              check (status_verificacao in ('pendente', 'aprovado', 'rejeitado', 'suspenso')),
  motivo_rejeicao           text,
  -- quando o admin confirmou na Receita que o CNPJ está ATIVO
  cnpj_ativo_verificado_em  timestamptz,
  -- id do recebedor na Lytex (preenchido na etapa de pagamentos)
  lytex_recebedor_id        text unique,
  aprovado_em               timestamptz,
  aprovado_por              uuid references public.profiles (id),
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  -- REGRA 2: só aprova com CNPJ ativo verificado + documento enviado
  constraint producers_aprovacao_exige_cnpj_e_documento check (
    status_verificacao <> 'aprovado'
    or (documento_path is not null
        and cnpj_ativo_verificado_em is not null
        and aprovado_em is not null)
  )
);

create trigger producers_atualizado_em before update on public.producers
  for each row execute function public.set_atualizado_em();


-- -------------------------------------------------------------------------
-- 4. ITEMS — tudo que tem preço + comissão
-- -------------------------------------------------------------------------
-- O modelo é genérico de propósito ("item com preço + comissão").
-- Hoje: fisico | digital. Futuro: ingresso | reserva | saas — para liberar,
-- basta trocar o check de "tipo" numa migração nova.
create table public.items (
  id                   uuid primary key default gen_random_uuid(),
  producer_id          uuid not null references public.producers (id) on delete restrict,
  nome                 text not null check (char_length(nome) between 2 and 140),
  descricao            text check (char_length(descricao) <= 5000),
  -- caminhos no bucket público "fotos-itens"
  fotos                text[] not null default '{}' check (cardinality(fotos) <= 10),
  preco_centavos       integer not null check (preco_centavos > 0),
  tipo                 text not null check (tipo in ('fisico', 'digital')),
  -- null = ilimitado (comum em digital)
  estoque              integer check (estoque is null or estoque >= 0),
  peso_gramas          integer check (peso_gramas > 0),
  altura_cm            numeric(6,1) check (altura_cm > 0),
  largura_cm           numeric(6,1) check (largura_cm > 0),
  comprimento_cm       numeric(6,1) check (comprimento_cm > 0),
  -- % do preço que vai para o revendedor
  comissao_percentual  numeric(5,2) not null check (comissao_percentual > 0 and comissao_percentual < 100),
  status_aprovacao     text not null default 'rascunho'
                         check (status_aprovacao in ('rascunho', 'em_analise', 'aprovado', 'rejeitado', 'pausado')),
  motivo_rejeicao      text,
  aprovado_em          timestamptz,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  -- Item físico só vai para análise com peso, medidas e estoque (frete).
  constraint items_fisico_completo check (
    tipo <> 'fisico'
    or status_aprovacao in ('rascunho', 'rejeitado')
    or (peso_gramas is not null and altura_cm is not null and largura_cm is not null
        and comprimento_cm is not null and estoque is not null)
  )
);
create index items_producer_idx on public.items (producer_id);
create index items_aprovados_idx on public.items (status_aprovacao) where status_aprovacao = 'aprovado';

create trigger items_atualizado_em before update on public.items
  for each row execute function public.set_atualizado_em();

-- Controla as mudanças de status feitas pelo PRÓPRIO produtor.
-- (o servidor com service_role não passa por estas regras)
--  * produtor só cria em rascunho ou em_analise;
--  * produtor nunca aprova nem rejeita;
--  * se mexer no conteúdo de um item aprovado/pausado, ele volta para análise;
--  * pode pausar e despausar um item já aprovado sem mexer no conteúdo.
create or replace function public.items_controla_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;  -- servidor/admin via service_role
  end if;

  if tg_op = 'INSERT' then
    if new.status_aprovacao not in ('rascunho', 'em_analise') then
      raise exception 'Item novo deve começar como rascunho ou em análise.';
    end if;
    new.aprovado_em := null;
    new.motivo_rejeicao := null;
    return new;
  end if;

  -- UPDATE: mudou o conteúdo? perde a aprovação anterior.
  if (new.nome, new.descricao, new.fotos, new.preco_centavos, new.tipo, new.peso_gramas,
      new.altura_cm, new.largura_cm, new.comprimento_cm, new.comissao_percentual)
     is distinct from
     (old.nome, old.descricao, old.fotos, old.preco_centavos, old.tipo, old.peso_gramas,
      old.altura_cm, old.largura_cm, old.comprimento_cm, old.comissao_percentual) then
    new.aprovado_em := null;
    if new.status_aprovacao in ('aprovado', 'pausado') then
      new.status_aprovacao := 'em_analise';
    end if;
  end if;

  if new.status_aprovacao is distinct from old.status_aprovacao then
    -- único caminho do produtor até "aprovado": despausar item já aprovado
    if new.status_aprovacao = 'aprovado'
       and not (old.status_aprovacao = 'pausado' and old.aprovado_em is not null
                and new.aprovado_em is not distinct from old.aprovado_em) then
      raise exception 'Somente a equipe Staypse aprova itens.';
    end if;
    if new.status_aprovacao = 'rejeitado' then
      raise exception 'Somente a equipe Staypse rejeita itens.';
    end if;
    if new.status_aprovacao = 'pausado' and old.status_aprovacao <> 'aprovado' then
      raise exception 'Só é possível pausar um item aprovado.';
    end if;
  end if;

  return new;
end;
$$;

create trigger items_controla_status before insert or update on public.items
  for each row execute function public.items_controla_status();


-- -------------------------------------------------------------------------
-- 5. STOREFRONTS — vitrine do revendedor (staypse.com.br/<slug>)
-- -------------------------------------------------------------------------
create table public.storefronts (
  id             uuid primary key default gen_random_uuid(),
  revendedor_id  uuid not null unique references public.profiles (id) on delete cascade,
  -- 3 a 40 caracteres: letras minúsculas, números e hífen (sem começar/terminar com hífen)
  slug           text not null unique
                   check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' and not public.slug_reservado(slug)),
  nome_exibicao  text check (char_length(nome_exibicao) <= 80),
  nicho          text check (char_length(nicho) <= 60),
  modelo_visual  text not null default 'padrao' check (char_length(modelo_visual) <= 40),
  bio            text check (char_length(bio) <= 500),
  publicada      boolean not null default false,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create trigger storefronts_atualizado_em before update on public.storefronts
  for each row execute function public.set_atualizado_em();


-- -------------------------------------------------------------------------
-- 6. STOREFRONT_ITEMS — itens Staypse escolhidos para a vitrine
-- -------------------------------------------------------------------------
create table public.storefront_items (
  storefront_id  uuid not null references public.storefronts (id) on delete cascade,
  item_id        uuid not null references public.items (id) on delete cascade,
  ordem          integer not null default 0,
  adicionado_em  timestamptz not null default now(),
  primary key (storefront_id, item_id)
);
create index storefront_items_item_idx on public.storefront_items (item_id);


-- -------------------------------------------------------------------------
-- 7. EXTERNAL_LINKS — seção separada de links de fora (Shopee, ML, TikTok)
-- -------------------------------------------------------------------------
-- A Staypse NUNCA altera estes links e NÃO ganha nada com eles.
-- Não existe coluna de comissão aqui de propósito. Eles também nunca
-- aparecem no marketplace público.
create table public.external_links (
  id              uuid primary key default gen_random_uuid(),
  storefront_id   uuid not null references public.storefronts (id) on delete cascade,
  url             text not null check (url ~ '^https://' and char_length(url) <= 2000),
  titulo          text not null check (char_length(titulo) between 2 and 140),
  imagem_url      text check (imagem_url ~ '^https://' and char_length(imagem_url) <= 2000),
  -- preço informado pelo revendedor, só para exibição
  preco_centavos  integer check (preco_centavos > 0),
  plataforma      text not null check (plataforma in ('shopee', 'mercado_livre', 'tiktok_shop', 'outra')),
  ordem           integer not null default 0,
  criado_em       timestamptz not null default now()
);
create index external_links_storefront_idx on public.external_links (storefront_id);


-- -------------------------------------------------------------------------
-- 8. ORDERS — pedidos (sempre de UM produtor; um carrinho com dois
--    produtores vira dois pedidos, cada um com seu split)
-- -------------------------------------------------------------------------
create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  producer_id          uuid not null references public.producers (id) on delete restrict,
  -- null = venda direta pelo marketplace, sem revendedor
  revendedor_id        uuid references public.profiles (id) on delete restrict,
  storefront_id        uuid references public.storefronts (id) on delete set null,
  -- comprador pode comprar sem conta
  comprador_id         uuid references public.profiles (id) on delete set null,
  comprador_nome       text not null,
  comprador_email      text not null,
  comprador_documento  text check (public.documento_valido(comprador_documento)),
  comprador_telefone   text,
  endereco_entrega     jsonb,
  subtotal_centavos    integer not null check (subtotal_centavos > 0),
  frete_centavos       integer not null default 0 check (frete_centavos >= 0),
  total_centavos       integer not null,
  status               text not null default 'aguardando_pagamento'
                         check (status in ('aguardando_pagamento', 'pago', 'cancelado',
                                           'em_reembolso', 'reembolsado')),
  -- REGRA 4: momento em que o resumo com as cláusulas foi exibido e aceito
  resumo_aceito_em     timestamptz not null,
  termos_versao        text not null,
  pago_em              timestamptz,
  entregue_em          timestamptz,
  -- REGRA 5: fim do prazo de arrependimento (7 dias do recebimento)
  arrependimento_ate   timestamptz,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  check (total_centavos = subtotal_centavos + frete_centavos)
);
create index orders_producer_idx on public.orders (producer_id);
create index orders_revendedor_idx on public.orders (revendedor_id);
create index orders_comprador_idx on public.orders (comprador_id);

create trigger orders_atualizado_em before update on public.orders
  for each row execute function public.set_atualizado_em();


-- -------------------------------------------------------------------------
-- 9. ORDER_ITEMS — itens do pedido, com a nota fiscal do produtor
-- -------------------------------------------------------------------------
create table public.order_items (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references public.orders (id) on delete cascade,
  item_id                  uuid not null references public.items (id) on delete restrict,
  -- "fotografia" do item no momento da compra
  nome_item                text not null,
  tipo_item                text not null,
  quantidade               integer not null check (quantidade > 0),
  preco_unitario_centavos  integer not null check (preco_unitario_centavos > 0),
  comissao_percentual      numeric(5,2) not null check (comissao_percentual >= 0 and comissao_percentual < 100),
  status_entrega           text not null default 'aguardando'
                             check (status_entrega in ('aguardando', 'enviado', 'entregue', 'cancelado', 'devolvido')),
  codigo_rastreio          text,
  -- REGRA 2: nota fiscal emitida pelo PRODUTOR
  nota_fiscal_numero       text,
  -- chave de acesso: 44 dígitos (NF-e) ou 50 (NFS-e nacional)
  nota_fiscal_chave        text check (nota_fiscal_chave ~ '^[0-9]{44}([0-9]{6})?$'),
  nota_fiscal_url          text check (nota_fiscal_url ~ '^https://'),
  nota_fiscal_emitida_em   timestamptz,
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),
  -- REGRA 2: não dá para marcar como enviado/entregue sem a nota fiscal
  constraint order_items_entrega_exige_nota check (
    status_entrega not in ('enviado', 'entregue')
    or (nota_fiscal_numero is not null
        and (nota_fiscal_chave is not null or nota_fiscal_url is not null))
  )
);
create index order_items_order_idx on public.order_items (order_id);

create trigger order_items_atualizado_em before update on public.order_items
  for each row execute function public.set_atualizado_em();


-- -------------------------------------------------------------------------
-- 10. PAYMENT_REFS — SÓ REFERÊNCIAS do pagamento na Lytex
-- -------------------------------------------------------------------------
-- NUNCA adicione aqui (nem em lugar nenhum) colunas de saldo, carteira,
-- "a repassar" ou similar. O dinheiro vai do comprador para a Lytex, que
-- divide direto entre produtor, revendedor e Staypse.
create table public.payment_refs (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null unique references public.orders (id) on delete restrict,
  lytex_cobranca_id      text not null unique,
  -- status como a Lytex informa (texto livre até termos a documentação oficial)
  status                 text not null,
  percentual_produtor    numeric(5,2) not null check (percentual_produtor > 0),
  percentual_revendedor  numeric(5,2) not null default 0 check (percentual_revendedor >= 0),
  percentual_staypse     numeric(5,2) not null check (percentual_staypse >= 0),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  check (percentual_produtor + percentual_revendedor + percentual_staypse = 100)
);

create trigger payment_refs_atualizado_em before update on public.payment_refs
  for each row execute function public.set_atualizado_em();


-- -------------------------------------------------------------------------
-- 11. CLICKS — cliques nas vitrines (sem IP, por LGPD)
-- -------------------------------------------------------------------------
create table public.clicks (
  id                bigint generated always as identity primary key,
  storefront_id     uuid not null references public.storefronts (id) on delete cascade,
  item_id           uuid references public.items (id) on delete set null,
  external_link_id  uuid references public.external_links (id) on delete set null,
  -- só o domínio de origem (ex.: instagram.com), nunca a URL completa
  origem            text check (char_length(origem) <= 255),
  criado_em         timestamptz not null default now(),
  check (item_id is null or external_link_id is null)
);
create index clicks_storefront_idx on public.clicks (storefront_id, criado_em);


-- -------------------------------------------------------------------------
-- 12. WAITLIST — lista de espera
-- -------------------------------------------------------------------------
create table public.waitlist (
  id               bigint generated always as identity primary key,
  email            text not null unique
                     check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                            and char_length(email) <= 254),
  nome             text check (char_length(nome) <= 120),
  interesse        text not null check (interesse in ('produtor', 'revendedor', 'comprador')),
  consentimento_em timestamptz not null default now(),
  criado_em        timestamptz not null default now()
);


-- -------------------------------------------------------------------------
-- 13. TERMS_ACCEPTANCES — REGRA 7: aceite com data e versão
-- -------------------------------------------------------------------------
-- Registro imutável: não há UPDATE nem DELETE para usuários.
create table public.terms_acceptances (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  documento  text not null check (documento in ('termos_uso', 'politica_privacidade',
                                                'termos_produtor', 'termos_revendedor')),
  versao     text not null check (char_length(versao) between 1 and 40),
  aceito_em  timestamptz not null default now()
);
create index terms_acceptances_user_idx on public.terms_acceptances (user_id);


-- =========================================================================
-- FUNÇÕES DE APOIO ÀS REGRAS DE ACESSO
-- =========================================================================
-- "security definer" = rodam com permissão do dono do banco, para que as
-- políticas consigam checar dados de outras tabelas sem expor essas tabelas.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and papel = 'admin'
  );
$$;

create or replace function public.tem_papel(p text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and papel = p
  );
$$;

-- O usuário logado é dono deste produtor?
create or replace function public.eh_dono_produtor(p_producer uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.producers
    where id = p_producer and user_id = (select auth.uid())
  );
$$;

create or replace function public.produtor_aprovado(p_producer uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.producers
    where id = p_producer and status_verificacao = 'aprovado'
  );
$$;

create or replace function public.eh_dono_vitrine(p_storefront uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.storefronts
    where id = p_storefront and revendedor_id = (select auth.uid())
  );
$$;

create or replace function public.vitrine_publicada(p_storefront uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.storefronts
    where id = p_storefront and publicada
  );
$$;

-- Quem pode ver um pedido: comprador, revendedor da venda, produtor, admin.
create or replace function public.pode_ver_pedido(p_order uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order
      and (o.comprador_id = (select auth.uid())
           or o.revendedor_id = (select auth.uid())
           or public.eh_dono_produtor(o.producer_id)
           or public.is_admin())
  );
$$;

-- Produtor dono de um pedido JÁ PAGO (só assim pode lançar nota/envio).
create or replace function public.produtor_do_pedido_pago(p_order uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order and o.status = 'pago'
      and public.eh_dono_produtor(o.producer_id)
  );
$$;


-- =========================================================================
-- CADASTRO AUTOMÁTICO: ao criar usuário no Auth, cria profile, papéis e
-- registra o aceite dos termos (REGRA 7) com data do servidor.
-- =========================================================================
-- O formulário de cadastro envia em "options.data":
--   nome, papeis (["produtor","revendedor"]), termos_versao
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nome text := nullif(trim(meta ->> 'nome'), '');
  v_versao text := nullif(trim(meta ->> 'termos_versao'), '');
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(left(v_nome, 120), split_part(new.email, '@', 1)));

  -- Só aceita produtor/revendedor vindos do formulário. admin NUNCA.
  insert into public.user_roles (user_id, papel)
  select new.id, p
  from jsonb_array_elements_text(
         case when jsonb_typeof(meta -> 'papeis') = 'array' then meta -> 'papeis' else '[]'::jsonb end
       ) as p
  where p in ('produtor', 'revendedor')
  on conflict do nothing;

  if v_versao is not null then
    insert into public.terms_acceptances (user_id, documento, versao)
    values (new.id, 'termos_uso', left(v_versao, 40)),
           (new.id, 'politica_privacidade', left(v_versao, 40));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =========================================================================
-- PERMISSÕES (GRANTs) — o que cada papel do banco pode fazer em cada coluna
-- =========================================================================
-- Começamos tirando tudo e liberando só o necessário.
revoke all on
  public.profiles, public.user_roles, public.producers, public.items,
  public.storefronts, public.storefront_items, public.external_links,
  public.orders, public.order_items, public.payment_refs, public.clicks,
  public.waitlist, public.terms_acceptances
from anon, authenticated;

-- Leitura pública (as políticas abaixo filtram as linhas)
grant select on public.items, public.storefronts, public.storefront_items,
                public.external_links
  to anon, authenticated;

-- Leitura para usuários logados (RLS filtra)
grant select on public.profiles, public.user_roles, public.producers,
                public.orders, public.order_items, public.payment_refs,
                public.clicks, public.waitlist, public.terms_acceptances
  to authenticated;

-- profiles: edita só os próprios dados básicos
grant update (nome, tipo_pessoa, documento, telefone) on public.profiles to authenticated;

-- user_roles: pode se dar produtor/revendedor (política impede admin)
grant insert (user_id, papel) on public.user_roles to authenticated;

-- producers: preenche cadastro; status/aprovação/Lytex só pelo servidor
grant insert (user_id, razao_social, cnpj, documento_path) on public.producers to authenticated;
grant update (razao_social, cnpj, documento_path) on public.producers to authenticated;

-- items: produtor gerencia (status controlado pelo gatilho)
grant insert (producer_id, nome, descricao, fotos, preco_centavos, tipo, estoque, peso_gramas,
              altura_cm, largura_cm, comprimento_cm, comissao_percentual, status_aprovacao)
  on public.items to authenticated;
grant update (nome, descricao, fotos, preco_centavos, tipo, estoque, peso_gramas,
              altura_cm, largura_cm, comprimento_cm, comissao_percentual, status_aprovacao)
  on public.items to authenticated;
grant delete on public.items to authenticated;

-- vitrine
grant insert (revendedor_id, slug, nome_exibicao, nicho, modelo_visual, bio, publicada)
  on public.storefronts to authenticated;
grant update (slug, nome_exibicao, nicho, modelo_visual, bio, publicada)
  on public.storefronts to authenticated;
grant delete on public.storefronts to authenticated;

grant insert (storefront_id, item_id, ordem) on public.storefront_items to authenticated;
grant update (ordem) on public.storefront_items to authenticated;
grant delete on public.storefront_items to authenticated;

grant insert (storefront_id, url, titulo, imagem_url, preco_centavos, plataforma, ordem)
  on public.external_links to authenticated;
grant update (url, titulo, imagem_url, preco_centavos, plataforma, ordem)
  on public.external_links to authenticated;
grant delete on public.external_links to authenticated;

-- order_items: produtor lança só nota fiscal e envio
grant update (status_entrega, codigo_rastreio, nota_fiscal_numero, nota_fiscal_chave,
              nota_fiscal_url, nota_fiscal_emitida_em)
  on public.order_items to authenticated;

-- waitlist: qualquer visitante entra na lista
grant insert (email, nome, interesse) on public.waitlist to anon, authenticated;

-- aceite de termos: registra (data vem do servidor)
grant insert (user_id, documento, versao) on public.terms_acceptances to authenticated;

-- orders, payment_refs e clicks: SEM escrita para usuários.
-- São gravados só pelo servidor (service_role) no checkout/webhook.


-- =========================================================================
-- RLS — POLÍTICAS POR LINHA
-- =========================================================================
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.producers         enable row level security;
alter table public.items             enable row level security;
alter table public.storefronts       enable row level security;
alter table public.storefront_items  enable row level security;
alter table public.external_links    enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payment_refs      enable row level security;
alter table public.clicks            enable row level security;
alter table public.waitlist          enable row level security;
alter table public.terms_acceptances enable row level security;

-- ---------- profiles ----------
create policy "profiles: ver o próprio ou admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: editar o próprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- user_roles ----------
create policy "user_roles: ver os próprios ou admin" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "user_roles: escolher produtor/revendedor" on public.user_roles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and papel in ('produtor', 'revendedor'));

-- ---------- producers ----------
create policy "producers: ver o próprio ou admin" on public.producers
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "producers: cadastrar o próprio" on public.producers
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.tem_papel('produtor'));
-- depois de aprovado, mudar CNPJ/razão social só falando com a Staypse
create policy "producers: editar o próprio enquanto não aprovado" on public.producers
  for update to authenticated
  using (user_id = (select auth.uid()) and status_verificacao in ('pendente', 'rejeitado'))
  with check (user_id = (select auth.uid()));

-- ---------- items ----------
create policy "items: públicos aprovados" on public.items
  for select to anon, authenticated
  using (status_aprovacao = 'aprovado' and public.produtor_aprovado(producer_id));
create policy "items: produtor vê os seus" on public.items
  for select to authenticated
  using (public.eh_dono_produtor(producer_id) or public.is_admin());
create policy "items: produtor cria os seus" on public.items
  for insert to authenticated
  with check (public.eh_dono_produtor(producer_id));
create policy "items: produtor edita os seus" on public.items
  for update to authenticated
  using (public.eh_dono_produtor(producer_id))
  with check (public.eh_dono_produtor(producer_id));
create policy "items: produtor apaga rascunhos" on public.items
  for delete to authenticated
  using (public.eh_dono_produtor(producer_id) and status_aprovacao = 'rascunho');

-- ---------- storefronts ----------
create policy "storefronts: públicas" on public.storefronts
  for select to anon, authenticated
  using (publicada);
create policy "storefronts: dono ou admin" on public.storefronts
  for select to authenticated
  using (revendedor_id = (select auth.uid()) or public.is_admin());
create policy "storefronts: revendedor cria a sua" on public.storefronts
  for insert to authenticated
  with check (revendedor_id = (select auth.uid()) and public.tem_papel('revendedor'));
create policy "storefronts: dono edita" on public.storefronts
  for update to authenticated
  using (revendedor_id = (select auth.uid()))
  with check (revendedor_id = (select auth.uid()));
create policy "storefronts: dono apaga" on public.storefronts
  for delete to authenticated
  using (revendedor_id = (select auth.uid()));

-- ---------- storefront_items ----------
create policy "storefront_items: públicos" on public.storefront_items
  for select to anon, authenticated
  using (public.vitrine_publicada(storefront_id));
create policy "storefront_items: dono ou admin" on public.storefront_items
  for select to authenticated
  using (public.eh_dono_vitrine(storefront_id) or public.is_admin());
-- só dá para colocar na vitrine item aprovado de produtor aprovado
create policy "storefront_items: dono adiciona item aprovado" on public.storefront_items
  for insert to authenticated
  with check (
    public.eh_dono_vitrine(storefront_id)
    and exists (select 1 from public.items i
                where i.id = item_id and i.status_aprovacao = 'aprovado'
                  and public.produtor_aprovado(i.producer_id))
  );
create policy "storefront_items: dono reordena" on public.storefront_items
  for update to authenticated
  using (public.eh_dono_vitrine(storefront_id))
  with check (public.eh_dono_vitrine(storefront_id));
create policy "storefront_items: dono remove" on public.storefront_items
  for delete to authenticated
  using (public.eh_dono_vitrine(storefront_id));

-- ---------- external_links ----------
create policy "external_links: públicos" on public.external_links
  for select to anon, authenticated
  using (public.vitrine_publicada(storefront_id));
create policy "external_links: dono ou admin" on public.external_links
  for select to authenticated
  using (public.eh_dono_vitrine(storefront_id) or public.is_admin());
create policy "external_links: dono cria" on public.external_links
  for insert to authenticated
  with check (public.eh_dono_vitrine(storefront_id));
create policy "external_links: dono edita" on public.external_links
  for update to authenticated
  using (public.eh_dono_vitrine(storefront_id))
  with check (public.eh_dono_vitrine(storefront_id));
create policy "external_links: dono apaga" on public.external_links
  for delete to authenticated
  using (public.eh_dono_vitrine(storefront_id));

-- ---------- orders ----------
create policy "orders: partes do pedido ou admin" on public.orders
  for select to authenticated
  using (public.pode_ver_pedido(id));

-- ---------- order_items ----------
create policy "order_items: partes do pedido ou admin" on public.order_items
  for select to authenticated
  using (public.pode_ver_pedido(order_id));
create policy "order_items: produtor lança nota e envio" on public.order_items
  for update to authenticated
  using (public.produtor_do_pedido_pago(order_id))
  with check (public.produtor_do_pedido_pago(order_id));

-- ---------- payment_refs ----------
create policy "payment_refs: partes do pedido ou admin" on public.payment_refs
  for select to authenticated
  using (public.pode_ver_pedido(order_id));

-- ---------- clicks ----------
create policy "clicks: dono da vitrine ou admin" on public.clicks
  for select to authenticated
  using (public.eh_dono_vitrine(storefront_id) or public.is_admin());

-- ---------- waitlist ----------
create policy "waitlist: qualquer um entra" on public.waitlist
  for insert to anon, authenticated
  with check (true);
create policy "waitlist: só admin vê" on public.waitlist
  for select to authenticated
  using (public.is_admin());

-- ---------- terms_acceptances ----------
create policy "terms: ver os próprios ou admin" on public.terms_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "terms: registrar o próprio aceite" on public.terms_acceptances
  for insert to authenticated
  with check (user_id = (select auth.uid()));


-- =========================================================================
-- ARMAZENAMENTO (Supabase Storage)
-- =========================================================================
-- Cada usuário grava só dentro da pasta com o próprio id: <uid>/arquivo.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos-itens', 'fotos-itens', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('documentos-produtores', 'documentos-produtores', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Fotos de itens: leitura pública (bucket público); escrita na própria pasta
create policy "fotos-itens: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-itens'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos-itens: dono vê" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-itens'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos-itens: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-itens'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos-itens: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-itens'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Documentos de produtores: privados; dono e admin leem
create policy "documentos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos-produtores'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documentos: dono ou admin vê" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos-produtores'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "documentos: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'documentos-produtores'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
