-- =========================================================================
-- Testes das regras de acesso e conformidade (rodar com supabase/tests/rodar.sh)
-- Cada linha "ok: ..." é uma regra comprovada. Qualquer falha para o script.
-- =========================================================================
\set ON_ERROR_STOP 1
\set QUIET 1
set client_min_messages = notice;

-- ---------- utilitários de teste ----------
create schema teste;
grant usage on schema teste to anon, authenticated, service_role;

-- confere uma condição
create function teste.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok: %', msg;
end $$;

-- roda um comando que DEVE dar erro
create function teste.bloqueia(cmd text, msg text) returns void language plpgsql as $$
begin
  begin
    execute cmd;
  exception when others then
    raise notice 'ok: % (bloqueado: %)', msg, sqlerrm;
    return;
  end;
  raise exception 'FALHOU: % — o comando passou e não devia', msg;
end $$;

-- roda um comando e devolve quantas linhas ele afetou
create function teste.linhas(cmd text) returns int language plpgsql as $$
declare n int;
begin
  execute cmd;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on all functions in schema teste to anon, authenticated, service_role;

-- "logar como": troca o usuário do JWT e o papel do banco
\set comoA   'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-00000000000a"}'', false); set role authenticated;'
\set comoB   'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-00000000000b"}'', false); set role authenticated;'
\set comoC   'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-00000000000c"}'', false); set role authenticated;'
\set comoD   'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-00000000000d"}'', false); set role authenticated;'
\set comoAnon 'reset role; select set_config(''request.jwt.claims'', '''', false); set role anon;'
\set comoServidor 'reset role; select set_config(''request.jwt.claims'', '''', false); set role service_role;'

\o /dev/null

-- =========================================================================
-- 0. Validação de documentos
-- =========================================================================
reset role;
select teste.ok(public.documento_valido('52998224725'), 'CPF válido aceito');
select teste.ok(not public.documento_valido('52998224724'), 'CPF com dígito errado recusado');
select teste.ok(not public.documento_valido('11111111111'), 'CPF repetido recusado');
select teste.ok(public.documento_valido('11222333000181'), 'CNPJ numérico válido aceito');
select teste.ok(not public.documento_valido('11222333000182'), 'CNPJ com dígito errado recusado');
select teste.ok(public.documento_valido('12ABC34501DE35'), 'CNPJ alfanumérico (exemplo da Receita) aceito');
select teste.ok(not public.documento_valido('12ABC34501DE36'), 'CNPJ alfanumérico errado recusado');

-- =========================================================================
-- 1. Cadastro automático (gatilho em auth.users)
-- =========================================================================
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@teste.com',
   '{"nome":"Ana Produtora","papeis":["produtor","revendedor"],"termos_versao":"2026-11-16"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@teste.com',
   '{"nome":"Bia Revendedora","papeis":["revendedor"],"termos_versao":"2026-11-16"}'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@teste.com',
   '{"nome":"Caio Admin","papeis":[],"termos_versao":"2026-11-16"}'),
  -- D tenta se cadastrar como admin pelo formulário
  ('00000000-0000-0000-0000-00000000000d', 'davi@teste.com',
   '{"nome":"Davi Espertinho","papeis":["admin","revendedor"],"termos_versao":"2026-11-16"}');

select teste.ok((select count(*) from public.profiles) = 4, 'profile criado para cada cadastro');
select teste.ok((select count(*) from public.user_roles
                 where user_id = '00000000-0000-0000-0000-00000000000a') = 2,
                'Ana é produtora E revendedora');
select teste.ok(not exists (select 1 from public.user_roles
                            where user_id = '00000000-0000-0000-0000-00000000000d' and papel = 'admin'),
                'cadastro NÃO consegue criar admin');
select teste.ok((select count(*) from public.terms_acceptances
                 where user_id = '00000000-0000-0000-0000-00000000000a' and versao = '2026-11-16') = 2,
                'aceite de termos e privacidade registrado com versão');

-- admin só é criado direto no banco (SQL Editor)
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000c', 'admin');

-- =========================================================================
-- 2. Profiles e papéis
-- =========================================================================
:comoA
select teste.ok((select count(*) from public.profiles) = 1, 'usuário vê só o próprio profile');
select teste.ok(teste.linhas($$update public.profiles set telefone = '11987654321'
                               where id = '00000000-0000-0000-0000-00000000000b'$$) = 0,
                'não edita profile de outro');
select teste.ok(teste.linhas($$update public.profiles set telefone = '11987654321',
                               tipo_pessoa = 'pf', documento = '52998224725'
                               where id = '00000000-0000-0000-0000-00000000000a'$$) = 1,
                'edita o próprio profile');
select teste.bloqueia($$update public.profiles set documento = '52998224724'
                        where id = '00000000-0000-0000-0000-00000000000a'$$, 'CPF inválido no profile');
select teste.bloqueia($$update public.profiles set criado_em = now()
                        where id = '00000000-0000-0000-0000-00000000000a'$$, 'coluna protegida do profile');

:comoC
select teste.ok((select count(*) from public.profiles) = 4, 'admin vê todos os profiles');

:comoD
select teste.bloqueia($$insert into public.user_roles values ('00000000-0000-0000-0000-00000000000d', 'admin')$$,
                      'usuário não se promove a admin');
select teste.bloqueia($$insert into public.user_roles values ('00000000-0000-0000-0000-00000000000a', 'revendedor')$$,
                      'usuário não mexe em papéis de outro');

-- =========================================================================
-- 3. Produtor (REGRA 2)
-- =========================================================================
:comoD
select teste.bloqueia($$insert into public.producers (user_id, razao_social, cnpj)
                        values ('00000000-0000-0000-0000-00000000000d', 'Davi ME', '11222333000181')$$,
                      'sem papel de produtor não cadastra empresa');

:comoA
select teste.bloqueia($$insert into public.producers (user_id, razao_social, cnpj)
                        values ('00000000-0000-0000-0000-00000000000a', 'Ana ME', '11222333000182')$$,
                      'CNPJ inválido recusado');
select teste.bloqueia($$insert into public.producers (user_id, razao_social, cnpj, status_verificacao)
                        values ('00000000-0000-0000-0000-00000000000a', 'Ana ME', '11222333000181', 'aprovado')$$,
                      'produtor não se cadastra já aprovado');
insert into public.producers (user_id, razao_social, cnpj)
  values ('00000000-0000-0000-0000-00000000000a', 'Ana Cosméticos ME', '11222333000181');
select teste.ok((select status_verificacao from public.producers) = 'pendente', 'produtor começa pendente');
select teste.bloqueia($$update public.producers set status_verificacao = 'aprovado'$$,
                      'produtor não se aprova');
select teste.bloqueia($$update public.producers set lytex_recebedor_id = 'x'$$,
                      'produtor não altera id da Lytex');

:comoB
select teste.ok((select count(*) from public.producers) = 0, 'outro usuário não vê dados do produtor');

-- aprovação pelo servidor
:comoServidor
select teste.bloqueia($$update public.producers set status_verificacao = 'aprovado', aprovado_em = now()$$,
                      'aprovação sem documento e sem CNPJ ativo verificado');
update public.producers set status_verificacao = 'aprovado', aprovado_em = now(),
       documento_path = '00000000-0000-0000-0000-00000000000a/cartao-cnpj.pdf',
       cnpj_ativo_verificado_em = now();
select teste.ok(true, 'aprovação com documento + CNPJ ativo verificado');

:comoA
select teste.ok(teste.linhas($$update public.producers set razao_social = 'Outro Nome'$$) = 0,
                'produtor aprovado não muda razão social sozinho');

-- =========================================================================
-- 4. Itens
-- =========================================================================
:comoA
select teste.bloqueia($$insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual, status_aprovacao)
                        select id, 'Sérum', 8990, 'fisico', 20, 'aprovado' from public.producers$$,
                      'produtor não cria item já aprovado');
select teste.bloqueia($$insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
                        select id, 'Sérum', 8990, 'ingresso', 20 from public.producers$$,
                      'tipo ingresso ainda não liberado');
insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
  select id, 'Sérum Facial', 8990, 'fisico', 20 from public.producers;
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise'$$,
                      'item físico sem peso/medidas/estoque não vai para análise');
update public.items set status_aprovacao = 'em_analise', peso_gramas = 150,
       altura_cm = 12, largura_cm = 4, comprimento_cm = 4, estoque = 30;
select teste.ok(true, 'item físico completo vai para análise');
select teste.bloqueia($$update public.items set status_aprovacao = 'aprovado'$$, 'produtor não aprova item');

:comoAnon
select teste.ok((select count(*) from public.items) = 0, 'visitante não vê item em análise');

:comoServidor
update public.items set status_aprovacao = 'aprovado', aprovado_em = now();

:comoAnon
select teste.ok((select count(*) from public.items) = 1, 'visitante vê item aprovado de produtor aprovado');

:comoA
update public.items set status_aprovacao = 'pausado';
select teste.ok((select status_aprovacao from public.items) = 'pausado', 'produtor pausa item aprovado');
update public.items set status_aprovacao = 'aprovado';
select teste.ok((select status_aprovacao from public.items) = 'aprovado', 'produtor despausa sem nova análise');
update public.items set preco_centavos = 9990;
select teste.ok((select status_aprovacao from public.items) = 'em_analise',
                'mudou o preço → item volta para análise');
select teste.bloqueia($$update public.items set status_aprovacao = 'aprovado'$$,
                      'depois de editar, produtor não reaprova sozinho');

:comoServidor
update public.items set status_aprovacao = 'aprovado', aprovado_em = now();
-- um segundo item, em rascunho
insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
  select id, 'E-book de Skincare', 2990, 'digital', 40 from public.producers;

-- =========================================================================
-- 5. Vitrine (REGRA: links externos separados, sem comissão)
-- =========================================================================
:comoB
select teste.bloqueia($$insert into public.storefronts (revendedor_id, slug)
                        values ('00000000-0000-0000-0000-00000000000b', 'admin')$$,
                      'slug reservado (rota do site) recusado');
select teste.bloqueia($$insert into public.storefronts (revendedor_id, slug)
                        values ('00000000-0000-0000-0000-00000000000b', 'Loja Bia')$$,
                      'slug com espaço/maiúscula recusado');
select teste.bloqueia($$insert into public.storefronts (revendedor_id, slug)
                        values ('00000000-0000-0000-0000-00000000000a', 'loja-da-ana')$$,
                      'não cria vitrine em nome de outro');
insert into public.storefronts (revendedor_id, slug, nicho)
  values ('00000000-0000-0000-0000-00000000000b', 'loja-da-bia', 'beleza');

insert into public.storefront_items (storefront_id, item_id)
  select s.id, i.id from public.storefronts s, public.items i where i.nome = 'Sérum Facial';
select teste.ok(true, 'revendedor coloca item aprovado na vitrine');
select teste.bloqueia($$insert into public.storefront_items (storefront_id, item_id)
                        select s.id, (select id from public.items where nome like 'E-book%' limit 1)
                        from public.storefronts s$$,
                      'item não aprovado não entra na vitrine');
insert into public.external_links (storefront_id, url, titulo, plataforma)
  select id, 'https://shopee.com.br/produto-x', 'Escova Rotativa', 'shopee' from public.storefronts;
select teste.bloqueia($$insert into public.external_links (storefront_id, url, titulo, plataforma)
                        select id, 'http://inseguro.com', 'Produto qualquer', 'outra' from public.storefronts$$,
                      'link externo sem https recusado');

:comoAnon
select teste.ok((select count(*) from public.storefronts) = 0, 'vitrine não publicada fica oculta');

:comoB
update public.storefronts set publicada = true;

:comoAnon
select teste.ok((select count(*) from public.storefronts) = 1, 'vitrine publicada aparece');
select teste.ok((select count(*) from public.external_links) = 1, 'links externos aparecem na vitrine pública');

:comoA
select teste.ok(teste.linhas($$delete from public.external_links$$) = 0,
                'outro usuário não apaga link da vitrine alheia');

-- =========================================================================
-- 6. Pedidos, nota fiscal (REGRA 2) e pagamento (REGRA 1)
-- =========================================================================
:comoB
select teste.bloqueia($$insert into public.orders (producer_id, comprador_nome, comprador_email,
                          subtotal_centavos, total_centavos, resumo_aceito_em, termos_versao)
                        select id, 'X', 'x@x.com', 100, 100, now(), 'v1' from public.producers$$,
                      'usuário não cria pedido direto (só o servidor)');

:comoServidor
insert into public.orders (id, producer_id, revendedor_id, storefront_id, comprador_nome, comprador_email,
                           subtotal_centavos, frete_centavos, total_centavos, resumo_aceito_em, termos_versao)
  select '00000000-0000-0000-0000-0000000000f1', p.id, '00000000-0000-0000-0000-00000000000b', s.id,
         'Carla Compradora', 'carla@teste.com', 9990, 1500, 11490, now(), '2026-11-16'
  from public.producers p, public.storefronts s;
insert into public.order_items (order_id, item_id, nome_item, tipo_item, quantidade,
                                preco_unitario_centavos, comissao_percentual)
  select '00000000-0000-0000-0000-0000000000f1', id, nome, tipo, 1, preco_centavos, comissao_percentual
  from public.items where nome = 'Sérum Facial';
select teste.bloqueia($$insert into public.orders (producer_id, comprador_nome, comprador_email,
                          subtotal_centavos, frete_centavos, total_centavos, resumo_aceito_em, termos_versao)
                        select id, 'X', 'x@x.com', 100, 10, 999, now(), 'v1' from public.producers$$,
                      'total precisa ser subtotal + frete');
select teste.bloqueia($$insert into public.orders (producer_id, comprador_nome, comprador_email,
                          subtotal_centavos, total_centavos, termos_versao)
                        select id, 'X', 'x@x.com', 100, 100, 'v1' from public.producers$$,
                      'pedido sem resumo aceito (REGRA 4) recusado');

:comoB
select teste.ok((select count(*) from public.orders) = 1, 'revendedor vê a própria venda');
:comoA
select teste.ok((select count(*) from public.orders) = 1, 'produtor vê o pedido do seu produto');
:comoD
select teste.ok((select count(*) from public.orders) = 0, 'terceiro não vê o pedido');

:comoA
select teste.ok(teste.linhas($$update public.order_items set status_entrega = 'enviado',
                               nota_fiscal_numero = '123', nota_fiscal_chave = repeat('1', 44)$$) = 0,
                'produtor não lança envio em pedido ainda não pago');

:comoServidor
update public.orders set status = 'pago', pago_em = now();

:comoA
select teste.bloqueia($$update public.order_items set status_entrega = 'enviado'$$,
                      'envio sem nota fiscal recusado');
select teste.bloqueia($$update public.order_items set quantidade = 5$$,
                      'produtor não altera quantidade/preço do pedido');
update public.order_items set status_entrega = 'enviado', nota_fiscal_numero = '123',
       nota_fiscal_chave = repeat('1', 44), codigo_rastreio = 'BR123';
select teste.ok(true, 'envio com nota fiscal aceito');

:comoB
select teste.bloqueia($$insert into public.payment_refs (order_id, lytex_cobranca_id, status,
                          percentual_produtor, percentual_revendedor, percentual_staypse)
                        values ('00000000-0000-0000-0000-0000000000f1', 'x', 'y', 70, 20, 10)$$,
                      'usuário não grava referência de pagamento');

:comoServidor
select teste.bloqueia($$insert into public.payment_refs (order_id, lytex_cobranca_id, status,
                          percentual_produtor, percentual_revendedor, percentual_staypse)
                        values ('00000000-0000-0000-0000-0000000000f1', 'cob_1', 'pendente', 70, 20, 5)$$,
                      'split que não soma 100% recusado');
insert into public.payment_refs (order_id, lytex_cobranca_id, status,
                                 percentual_produtor, percentual_revendedor, percentual_staypse)
  values ('00000000-0000-0000-0000-0000000000f1', 'cob_1', 'pendente', 70, 20, 10);

reset role;
select teste.ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public'
    and (column_name ilike '%saldo%' or column_name ilike '%carteira%'
         or column_name ilike '%repass%' or column_name ilike '%wallet%' or column_name ilike '%balance%')),
  'REGRA 1: nenhuma coluna de saldo/carteira/repasse no banco');

-- =========================================================================
-- 7. Termos (REGRA 7), lista de espera, cliques
-- =========================================================================
:comoA
select teste.bloqueia($$update public.terms_acceptances set versao = 'falsa'$$, 'aceite não pode ser alterado');
select teste.bloqueia($$delete from public.terms_acceptances$$, 'aceite não pode ser apagado');
select teste.bloqueia($$insert into public.terms_acceptances (user_id, documento, versao, aceito_em)
                        values ('00000000-0000-0000-0000-00000000000a', 'termos_uso', 'v2', '2020-01-01')$$,
                      'data do aceite vem do servidor, não do usuário');
insert into public.terms_acceptances (user_id, documento, versao)
  values ('00000000-0000-0000-0000-00000000000a', 'termos_produtor', '2026-11-16');
select teste.ok(true, 'usuário registra novo aceite');

:comoAnon
insert into public.waitlist (email, interesse) values ('visitante@teste.com', 'revendedor');
select teste.ok(true, 'visitante entra na lista de espera');
select teste.bloqueia($$select * from public.waitlist$$, 'visitante não lê a lista de espera');
select teste.bloqueia($$insert into public.clicks (storefront_id) select id from public.storefronts$$,
                      'visitante não grava clique direto (só o servidor)');

:comoB
select teste.ok((select count(*) from public.waitlist) = 0, 'usuário comum não vê a lista de espera');
:comoC
select teste.ok((select count(*) from public.waitlist) = 1, 'admin vê a lista de espera');

-- =========================================================================
-- 8. Armazenamento
-- =========================================================================
:comoA
insert into storage.objects (bucket_id, name)
  values ('documentos-produtores', '00000000-0000-0000-0000-00000000000a/cartao-cnpj.pdf');
select teste.ok(true, 'produtor envia documento na própria pasta');
select teste.bloqueia($$insert into storage.objects (bucket_id, name)
                        values ('documentos-produtores', '00000000-0000-0000-0000-00000000000b/x.pdf')$$,
                      'não envia arquivo na pasta de outro');
:comoB
select teste.ok((select count(*) from storage.objects) = 0, 'outro usuário não vê documento do produtor');
:comoC
select teste.ok((select count(*) from storage.objects) = 1, 'admin vê documentos de produtores');

-- =========================================================================
-- 9. RLS ligado em TODAS as tabelas
-- =========================================================================
reset role;
select teste.ok(not exists (select 1 from pg_tables
                            where schemaname = 'public' and not rowsecurity),
                'RLS ativo em todas as tabelas do schema public');

\o
\echo '>>> TODOS OS TESTES PASSARAM'
