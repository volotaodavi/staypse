-- Staypse: banco da lista de espera e da medição.
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem problema: nada é apagado.
--
-- Se você rodou a versão antiga deste arquivo (tabelas "afiliados" e "fabricas"),
-- apague as duas antes, com:  drop table if exists public.afiliados, public.fabricas;

-- =========================================================================
-- CADASTROS: afiliados, fornecedores e entregadores numa tabela só
-- =========================================================================
create table if not exists public.cadastros (
  id                  bigint generated always as identity primary key,
  criado_em           timestamptz not null default now(),
  tipo                text not null check (tipo in ('afiliado', 'fornecedor', 'entregador')),

  -- Comuns aos três
  nome                text not null check (char_length(nome) between 2 and 120),
  whatsapp            text not null check (whatsapp ~ '^[1-9]{2}(9[0-9]{8}|[0-9]{8})$'),
  email               text check (char_length(email) <= 254
                                  and email = lower(email)
                                  and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cidade              text not null check (char_length(cidade) between 2 and 120),
  uf                  text not null check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO',
                                                  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
                                                  'RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  aceite_privacidade  boolean not null check (aceite_privacidade),

  -- Afiliado
  canais              text[] check (cardinality(canais) >= 1
                                    and canais <@ array['Instagram','TikTok','WhatsApp','Tráfego pago','Outro']::text[]),
  vende_fisico        boolean,
  produto_interesse   text check (char_length(produto_interesse) between 2 and 160),

  -- Fornecedor (fábrica ou loja)
  tipo_empresa        text check (tipo_empresa in ('fabrica', 'loja')),
  empresa             text check (char_length(empresa) between 2 and 160),
  cnpj                text check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$'),
  o_que_vende         text check (char_length(o_que_vende) between 2 and 300),
  trabalha_afiliados  boolean,
  entrega_regiao      text check (entrega_regiao in ('sim', 'nao', 'as_vezes')),

  -- Entregador
  bairro              text check (char_length(bairro) between 2 and 120),
  veiculo             text check (veiculo in ('moto', 'bicicleta', 'carro')),

  -- Origem do acesso
  utm_source          text check (char_length(utm_source)   <= 120),
  utm_medium          text check (char_length(utm_medium)   <= 120),
  utm_campaign        text check (char_length(utm_campaign) <= 120),
  utm_content         text check (char_length(utm_content)  <= 120),
  utm_term            text check (char_length(utm_term)     <= 120),
  referencia          text check (char_length(referencia)   <= 255),
  sessao              uuid,

  -- Cada tipo precisa dos seus campos obrigatórios
  constraint campos_por_tipo check (case tipo
    when 'afiliado'   then email is not null and canais is not null
                           and vende_fisico is not null and produto_interesse is not null
    when 'fornecedor' then email is not null and tipo_empresa is not null and empresa is not null
                           and cnpj is not null and o_que_vende is not null
                           and trabalha_afiliados is not null and entrega_regiao is not null
    when 'entregador' then bairro is not null and veiculo is not null
  end)
);

-- Evita cadastro repetido
create unique index if not exists cadastros_afiliado_email
  on public.cadastros (email) where tipo = 'afiliado';
create unique index if not exists cadastros_fornecedor_cnpj
  on public.cadastros (cnpj) where tipo = 'fornecedor';
create unique index if not exists cadastros_entregador_whatsapp
  on public.cadastros (whatsapp) where tipo = 'entregador';

-- =========================================================================
-- EVENTOS: visitas e cliques (sem dado pessoal)
-- =========================================================================
create table if not exists public.eventos (
  id            bigint generated always as identity primary key,
  criado_em     timestamptz not null default now(),
  evento        text not null check (evento in ('visita', 'clique')),
  alvo          text check (char_length(alvo) <= 60),
  pagina        text not null check (char_length(pagina) <= 30),
  sessao        uuid not null,
  utm_source    text check (char_length(utm_source)   <= 120),
  utm_medium    text check (char_length(utm_medium)   <= 120),
  utm_campaign  text check (char_length(utm_campaign) <= 120),
  utm_content   text check (char_length(utm_content)  <= 120),
  utm_term      text check (char_length(utm_term)     <= 120),
  referencia    text check (char_length(referencia)   <= 255)
);

create index if not exists eventos_evento_alvo on public.eventos (evento, alvo);

-- =========================================================================
-- SEGURANÇA: a página só consegue GRAVAR. Ninguém de fora lê, edita ou apaga.
-- Você consulta tudo pelo painel do Supabase.
-- =========================================================================
alter table public.cadastros enable row level security;
alter table public.eventos   enable row level security;

drop policy if exists "pagina pode cadastrar" on public.cadastros;
create policy "pagina pode cadastrar" on public.cadastros
  for insert to anon with check (true);

drop policy if exists "pagina pode registrar eventos" on public.eventos;
create policy "pagina pode registrar eventos" on public.eventos
  for insert to anon with check (true);

grant insert on public.cadastros, public.eventos to anon;

-- =========================================================================
-- CONSULTAS PRONTAS (aparecem no Table Editor como tabelas)
-- Horários já convertidos para o horário de Brasília.
-- =========================================================================

-- Listas por tipo -----------------------------------------------------------
create or replace view public.lista_afiliados with (security_invoker = true) as
select id,
       to_char(criado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as data,
       nome, whatsapp, email, cidade, uf,
       array_to_string(canais, ', ')                 as onde_vende,
       case when vende_fisico then 'sim' else 'não' end as vende_fisico,
       produto_interesse,
       utm_source as origem, utm_campaign as campanha
from public.cadastros
where tipo = 'afiliado'
order by criado_em desc;

create or replace view public.lista_fornecedores with (security_invoker = true) as
select id,
       to_char(criado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as data,
       case tipo_empresa when 'fabrica' then 'fábrica' else 'loja' end as tipo,
       empresa, cnpj, nome as responsavel, whatsapp, email, cidade, uf, o_que_vende,
       case when trabalha_afiliados then 'sim' else 'não' end as trabalha_com_afiliados,
       case entrega_regiao when 'sim' then 'sim' when 'nao' then 'não' else 'às vezes' end as entrega_na_regiao,
       utm_source as origem, utm_campaign as campanha
from public.cadastros
where tipo = 'fornecedor'
order by criado_em desc;

create or replace view public.lista_entregadores with (security_invoker = true) as
select id,
       to_char(criado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as data,
       nome, whatsapp, cidade, uf, bairro, veiculo,
       utm_source as origem, utm_campaign as campanha
from public.cadastros
where tipo = 'entregador'
order by criado_em desc;

-- Resumo geral (uma linha) ----------------------------------------------------
create or replace view public.metricas_resumo with (security_invoker = true) as
select
  (select count(*) from public.eventos where evento = 'visita' and pagina = 'inicio')
    as visitas,
  (select count(distinct sessao) from public.eventos where evento = 'visita' and pagina = 'inicio')
    as visitantes,
  (select count(*) from public.cadastros where tipo = 'afiliado')   as cadastros_afiliados,
  (select count(*) from public.cadastros where tipo = 'fornecedor') as cadastros_fornecedores,
  (select count(*) from public.cadastros where tipo = 'entregador') as cadastros_entregadores,
  (select count(distinct sessao) from public.eventos
     where evento = 'clique' and alvo = 'rodape_entregador')         as visitantes_clicaram_entregador,
  round(100.0 * (select count(*) from public.cadastros where tipo = 'afiliado')
        / nullif((select count(distinct sessao) from public.eventos
                  where evento = 'visita' and pagina = 'inicio'), 0), 1)
    as conversao_afiliados_pct,
  round(100.0 * (select count(distinct sessao) from public.eventos
                 where evento = 'clique' and alvo = 'rodape_entregador')
        / nullif((select count(distinct sessao) from public.eventos
                  where evento = 'visita' and pagina = 'inicio'), 0), 1)
    as interesse_entregador_pct;

-- Cliques por botão ---------------------------------------------------------
create or replace view public.metricas_cliques with (security_invoker = true) as
select alvo as botao,
       count(*)               as cliques,
       count(distinct sessao) as visitantes
from public.eventos
where evento = 'clique'
group by alvo
order by cliques desc;

-- Por dia --------------------------------------------------------------------
create or replace view public.metricas_por_dia with (security_invoker = true) as
select dia,
       sum(visita)     as visitas,
       sum(afiliado)   as afiliados,
       sum(fornecedor) as fornecedores,
       sum(entregador) as entregadores
from (
  select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
         1 as visita, 0 as afiliado, 0 as fornecedor, 0 as entregador
  from public.eventos where evento = 'visita' and pagina = 'inicio'
  union all
  select (criado_em at time zone 'America/Sao_Paulo')::date, 0,
         (tipo = 'afiliado')::int, (tipo = 'fornecedor')::int, (tipo = 'entregador')::int
  from public.cadastros
) t
group by dia
order by dia desc;

-- Por origem (UTM) ------------------------------------------------------------
create or replace view public.metricas_por_origem with (security_invoker = true) as
select origem, midia, campanha,
       sum(visita)     as visitas,
       sum(afiliado)   as afiliados,
       sum(fornecedor) as fornecedores,
       sum(entregador) as entregadores
from (
  select coalesce(utm_source, referencia, '(direto)') as origem,
         coalesce(utm_medium, '-') as midia, coalesce(utm_campaign, '-') as campanha,
         1 as visita, 0 as afiliado, 0 as fornecedor, 0 as entregador
  from public.eventos where evento = 'visita' and pagina = 'inicio'
  union all
  select coalesce(utm_source, referencia, '(direto)'),
         coalesce(utm_medium, '-'), coalesce(utm_campaign, '-'), 0,
         (tipo = 'afiliado')::int, (tipo = 'fornecedor')::int, (tipo = 'entregador')::int
  from public.cadastros
) t
group by origem, midia, campanha
order by visitas desc;

-- Onde os afiliados vendem -------------------------------------------------------
create or replace view public.metricas_canais with (security_invoker = true) as
select canal, count(*) as afiliados
from public.cadastros, unnest(canais) as canal
where tipo = 'afiliado'
group by canal
order by afiliados desc;

-- As consultas prontas são só para você, nunca para a página.
revoke all on public.lista_afiliados, public.lista_fornecedores, public.lista_entregadores,
              public.metricas_resumo, public.metricas_cliques, public.metricas_por_dia,
              public.metricas_por_origem, public.metricas_canais
  from anon, authenticated;
