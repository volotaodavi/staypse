-- =========================================================================
-- STAYPSE — Etapa 2: lista de espera com indicação + LGPD nos pedidos
-- =========================================================================
-- Como aplicar: Supabase > SQL Editor > cole este arquivo > Run
-- (depois do 20261116000001_fundacao.sql). Ou: supabase db push
-- =========================================================================


-- =========================================================================
-- 1. LGPD NOS PEDIDOS
-- =========================================================================
-- O revendedor NÃO vê mais o pedido inteiro (nome, e-mail, telefone e
-- endereço do comprador). Esses dados ficam só com o comprador, o produtor
-- (que entrega) e o admin.
create or replace function public.pode_ver_pedido(p_order uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order
      and (o.comprador_id = (select auth.uid())
           or public.eh_dono_produtor(o.producer_id)
           or public.is_admin())
  );
$$;

-- O revendedor vê as PRÓPRIAS vendas só com: data, produto, valor,
-- comissão e status. Nenhum dado do comprador.
-- (a comissão aqui é só informativa; quem divide de fato é a Lytex)
create or replace function public.minhas_vendas()
returns table (
  pedido_id          uuid,
  data               timestamptz,
  produto            text,
  quantidade         integer,
  valor_centavos     integer,
  comissao_centavos  integer,
  status             text
)
language sql stable security definer
set search_path = ''
as $$
  select o.id,
         o.criado_em,
         oi.nome_item,
         oi.quantidade,
         oi.quantidade * oi.preco_unitario_centavos,
         floor(oi.quantidade * oi.preco_unitario_centavos * oi.comissao_percentual / 100)::integer,
         o.status
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.revendedor_id = (select auth.uid())
  order by o.criado_em desc;
$$;
revoke execute on function public.minhas_vendas() from public, anon;
grant execute on function public.minhas_vendas() to authenticated;


-- =========================================================================
-- 2. LISTA DE ESPERA
-- =========================================================================

-- Código de indicação curto (8 caracteres). Ex.: staypse.com.br/?ref=3f9a1c2b
create or replace function public.gerar_codigo_indicacao()
returns text
language sql volatile
set search_path = ''
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
$$;

alter table public.waitlist
  add column whatsapp      text check (whatsapp ~ '^[1-9]{2}(9[0-9]{8}|[0-9]{8})$'),
  add column cidade        text check (char_length(cidade) between 2 and 120),
  add column uf            text check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT',
                                              'MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO',
                                              'RR','SC','SP','SE','TO')),
  -- nichos de interesse do revendedor (lista fechada, para filtrar no admin)
  add column nichos        text[] not null default '{}'
                             check (cardinality(nichos) <= 10
                                    and nichos <@ array['beleza','moda','casa','saude_fitness','infantil',
                                                        'pets','tecnologia','alimentos','cursos_digitais',
                                                        'outros']::text[]),
  -- campos do produtor
  add column empresa       text check (char_length(empresa) between 2 and 200),
  add column cnpj          text check (char_length(cnpj) = 14 and public.documento_valido(cnpj)),
  add column tipo_produto  text check (tipo_produto in ('fisico', 'digital', 'ambos')),
  add column o_que_vende   text check (char_length(o_que_vende) between 2 and 500),
  -- indicação
  add column codigo_indicacao text not null unique default public.gerar_codigo_indicacao(),
  add column indicado_por  bigint references public.waitlist (id) on delete set null,
  -- IP só como hash com segredo (LGPD: não guardamos o IP em si). Usado para
  -- limitar inscrições por IP e para não contar autoindicação.
  add column ip_hash       text check (char_length(ip_hash) <= 128),
  -- consentimento LGPD: versão da Política aceita (a data já existe: consentimento_em)
  add column consentimento_versao text check (char_length(consentimento_versao) between 1 and 40),
  -- acompanhamento comercial (usado para produtores)
  add column status_contato text not null default 'novo'
                             check (status_contato in ('novo', 'contatado', 'interessado', 'aprovado'));

-- Campos obrigatórios por tipo. "not valid" = vale para as inscrições novas,
-- sem travar a migração se já existir alguma linha antiga.
alter table public.waitlist add constraint waitlist_campos_obrigatorios check (
  consentimento_versao is not null
  and nome is not null and char_length(nome) >= 2
  and whatsapp is not null
  and (interesse <> 'revendedor'
       or (cidade is not null and uf is not null and cardinality(nichos) >= 1))
  and (interesse <> 'produtor'
       or (empresa is not null and tipo_produto is not null and o_que_vende is not null))
) not valid;

create index waitlist_ip_idx on public.waitlist (ip_hash, criado_em);
create index waitlist_indicado_por_idx on public.waitlist (indicado_por);

-- Quantas indicações VÁLIDAS cada inscrito tem: só conta quem veio de outro
-- IP (evita a pessoa se indicar com vários e-mails do mesmo aparelho).
-- security_invoker: respeita a RLS da waitlist (só admin enxerga as linhas).
create view public.waitlist_com_indicacoes with (security_invoker = true) as
select w.*,
       (select count(*) from public.waitlist i
        where i.indicado_por = w.id
          and i.ip_hash is distinct from w.ip_hash) as indicacoes
from public.waitlist w;

revoke all on public.waitlist_com_indicacoes from anon, authenticated;
grant select on public.waitlist_com_indicacoes to authenticated;


-- ---------- inscrição: SÓ pelo servidor ----------
-- O site chama esta função com a chave secreta (service_role), depois de
-- checar o honeypot. Aqui ficam o limite por IP e o vínculo da indicação.
create or replace function public.inscrever_na_lista(p jsonb, p_ip_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite_por_hora constant int := 5;
  v_indicado_por bigint;
  v_codigo text;
begin
  if p_ip_hash is not null and (
       select count(*) from public.waitlist
       where ip_hash = p_ip_hash and criado_em > now() - interval '1 hour'
     ) >= limite_por_hora then
    raise exception 'limite_por_ip';
  end if;

  -- código de quem indicou (se não existir, ignora)
  select id into v_indicado_por
  from public.waitlist
  where codigo_indicacao = nullif(trim(p ->> 'ref'), '');

  insert into public.waitlist (
    email, nome, interesse, whatsapp, cidade, uf, nichos,
    empresa, cnpj, tipo_produto, o_que_vende,
    indicado_por, ip_hash, consentimento_versao
  ) values (
    lower(trim(p ->> 'email')),
    nullif(trim(p ->> 'nome'), ''),
    p ->> 'interesse',
    nullif(p ->> 'whatsapp', ''),
    nullif(trim(p ->> 'cidade'), ''),
    nullif(p ->> 'uf', ''),
    coalesce(array(select jsonb_array_elements_text(
               case when jsonb_typeof(p -> 'nichos') = 'array' then p -> 'nichos' else '[]'::jsonb end)),
             '{}'),
    nullif(trim(p ->> 'empresa'), ''),
    nullif(p ->> 'cnpj', ''),
    nullif(p ->> 'tipo_produto', ''),
    nullif(trim(p ->> 'o_que_vende'), ''),
    v_indicado_por,
    p_ip_hash,
    nullif(p ->> 'consentimento_versao', '')
  )
  returning codigo_indicacao into v_codigo;

  return v_codigo;
end;
$$;
revoke execute on function public.inscrever_na_lista(jsonb, text) from public, anon, authenticated;
grant execute on function public.inscrever_na_lista(jsonb, text) to service_role;


-- ---------- posição na fila (pública, sem dados pessoais) ----------
-- Cada tipo (revendedor / produtor) tem a sua fila. Quem tem mais
-- indicações válidas fica na frente; empate = quem se inscreveu antes.
-- A recompensa é SÓ prioridade no acesso antecipado: sem sorteio, sem
-- prêmio em dinheiro.
create or replace function public.posicao_na_lista(p_codigo text)
returns table (posicao bigint, total bigint, indicacoes bigint, interesse text)
language sql stable security definer
set search_path = ''
as $$
  with ranking as (
    select w.codigo_indicacao, w.interesse, w.indicacoes,
           row_number() over (partition by w.interesse
                              order by w.indicacoes desc, w.criado_em asc, w.id asc) as posicao,
           count(*) over (partition by w.interesse) as total
    from public.waitlist_com_indicacoes w
  )
  select r.posicao, r.total, r.indicacoes, r.interesse
  from ranking r
  where r.codigo_indicacao = p_codigo;
$$;
revoke execute on function public.posicao_na_lista(text) from public;
grant execute on function public.posicao_na_lista(text) to anon, authenticated;


-- ---------- permissões da waitlist ----------
-- Antes o visitante gravava direto na tabela; agora só via servidor.
drop policy "waitlist: qualquer um entra" on public.waitlist;
revoke insert on public.waitlist from anon, authenticated;

-- Admin marca o andamento do contato (contatado / interessado / aprovado)
grant update (status_contato) on public.waitlist to authenticated;
create policy "waitlist: admin atualiza status" on public.waitlist
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =========================================================================
-- 3. ROTAS NOVAS QUE NÃO PODEM VIRAR VITRINE
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
    -- Etapa 2
    'lista','obrigado','indicacao','indicar','espera'
  ]);
$$;
