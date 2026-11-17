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
-- 3. Produtor (REGRA 2) — cadastro em passos + decisão do admin (Etapa 3)
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
insert into public.producers (user_id, razao_social, cnpj, inscricao_estadual, whatsapp, email_contato)
  values ('00000000-0000-0000-0000-00000000000a', 'Ana Cosméticos ME', '11222333000181', 'ISENTO',
          '81998765432', 'contato@anacosmeticos.com');
select teste.ok((select status_verificacao from public.producers) = 'rascunho', 'produtor começa em rascunho');
select teste.bloqueia($$update public.producers set status_verificacao = 'aprovado'$$, 'produtor não se aprova');
select teste.bloqueia($$update public.producers set lytex_recebedor_id = 'x'$$, 'produtor não altera id da Lytex');
select teste.bloqueia($$update public.producers set inscricao_estadual = '12.345'$$, 'inscrição estadual com pontuação recusada');
select teste.bloqueia($$update public.producers set documento_path = '00000000-0000-0000-0000-00000000000b/doc.pdf'$$,
                      'documento precisa estar na pasta do próprio produtor');

-- envio para análise: precisa de tudo
select teste.bloqueia($$select public.enviar_produtor_para_analise()$$, 'sem aceitar o Contrato do Produtor não envia');
insert into public.terms_acceptances (user_id, documento, versao)
  values ('00000000-0000-0000-0000-00000000000a', 'termos_produtor', '2026-11-18');
select teste.bloqueia($$select public.enviar_produtor_para_analise()$$, 'sem endereço e documentos não envia');
update public.producers set cep = '50030230', logradouro = 'Rua do Bom Jesus', numero = '100', bairro = 'Recife',
       cidade = 'Recife', uf = 'PE',
       documento_path = '00000000-0000-0000-0000-00000000000a/cartao-cnpj.pdf';
select teste.bloqueia($$select public.enviar_produtor_para_analise()$$, 'sem documento do responsável não envia');
update public.producers set documento_responsavel_path = '00000000-0000-0000-0000-00000000000a/rg.jpg';
select public.enviar_produtor_para_analise();
select teste.ok((select status_verificacao from public.producers) = 'em_analise', 'cadastro completo vai para análise');
select teste.ok(teste.linhas($$update public.producers set razao_social = 'Outro'$$) = 0,
                'em análise, o produtor não edita o cadastro');

:comoB
select teste.ok((select count(*) from public.producers) = 0, 'outro usuário não vê dados do produtor');
select teste.bloqueia($$select public.admin_decidir_produtor((select id from public.producers limit 1), true, null, true)$$,
                      'não admin não decide');
select teste.ok((select count(*) from public.audit_log) = 0, 'não admin não lê o log de auditoria');

:comoServidor
select teste.bloqueia($$update public.producers set status_verificacao = 'aprovado', aprovado_em = now()$$,
                      'aprovado sem CNPJ ativo confirmado é recusado pelo banco');

-- admin recusa com motivo
:comoC
create temp table prod as select id from public.producers;
grant select on prod to authenticated, anon, service_role;
select teste.bloqueia($$select public.admin_decidir_produtor((select id from prod), false, '')$$,
                      'recusa sem motivo não é aceita');
select public.admin_decidir_produtor((select id from prod), false, 'Cartão CNPJ ilegível, envie de novo.');

:comoA
select teste.ok((select status_verificacao = 'recusado' and motivo_rejeicao = 'Cartão CNPJ ilegível, envie de novo.'
                 from public.producers), 'produtor vê a recusa e o motivo');
update public.producers set documento_path = '00000000-0000-0000-0000-00000000000a/cartao-cnpj-v2.pdf';
select public.enviar_produtor_para_analise();
select teste.ok((select status_verificacao = 'em_analise' and motivo_rejeicao is null from public.producers),
                'depois de corrigir, reenvia para análise');

-- admin aprova: precisa confirmar o CNPJ ativo
:comoC
select teste.bloqueia($$select public.admin_decidir_produtor((select id from prod), true)$$,
                      'aprovação sem confirmar CNPJ ativo é recusada');
select public.admin_decidir_produtor((select id from prod), true, null, true);
select teste.ok((select status_verificacao = 'aprovado' and cnpj_ativo_verificado_em is not null
                        and aprovado_por = '00000000-0000-0000-0000-00000000000c'
                 from public.producers), 'admin aprova com CNPJ ativo confirmado');
select public.admin_definir_recebedor_lytex((select id from prod), 'rec_teste_123');
select teste.ok((select lytex_recebedor_id from public.producers) = 'rec_teste_123', 'admin preenche id do recebedor Lytex');
select teste.ok((select string_agg(acao, ',' order by id) from public.audit_log where entidade = 'producer')
                = 'enviado_para_analise,produtor_recusado,enviado_para_analise,produtor_aprovado,recebedor_lytex_definido',
                'log de auditoria registra cada passo');
select teste.ok((select bool_and(ator_id is not null) from public.audit_log), 'log guarda quem fez cada ação');
select teste.bloqueia($$update public.audit_log set acao = 'x'$$, 'nem o admin altera o log');
select teste.bloqueia($$delete from public.audit_log$$, 'nem o admin apaga o log');

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
select teste.bloqueia($$insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
                        select id, 'Sérum', 8990, 'fisico', 9 from public.producers$$,
                      'comissão abaixo de 10% recusada');
select teste.bloqueia($$insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
                        select id, 'Sérum', 8990, 'fisico', 71 from public.producers$$,
                      'comissão acima de 70% recusada');
insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
  select id, 'Sérum Facial', 8990, 'fisico', 20 from public.producers;
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise'$$,
                      'item sem fotos/descrição/medidas não vai para análise');
update public.items set descricao = 'Sérum facial com vitamina C, 30 ml.', categoria = 'beleza',
       fotos = array['00000000-0000-0000-0000-00000000000a/serum-1.webp'],
       peso_gramas = 150, altura_cm = 12, largura_cm = 4, comprimento_cm = 4, estoque = 30, prazo_postagem_dias = 2;
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise'$$,
                      'sem a declaração "emito nota fiscal" não vai para análise');
select teste.bloqueia($$update public.items set declaracao_nf_em = '2020-01-01'$$,
                      'data da declaração de NF não vem do produtor');
update public.items set declaracao_nf = true;
select teste.ok((select declaracao_nf_em is not null from public.items), 'declaração de NF registrada com data do servidor');
select teste.bloqueia($$update public.items set fotos = array['a','b','c','d','e','f','g']$$, 'mais de 6 fotos recusado');
update public.items set status_aprovacao = 'em_analise';
select teste.ok(true, 'item físico completo vai para análise');
select teste.bloqueia($$update public.items set status_aprovacao = 'aprovado'$$, 'produtor não aprova item');

:comoAnon
select teste.ok((select count(*) from public.items) = 0, 'visitante não vê item em análise');

:comoC
create temp table serum as select id from public.items;
grant select on serum to authenticated, anon, service_role;
select public.admin_decidir_item((select id from serum), true);

:comoAnon
select teste.ok((select count(*) from public.items) = 1, 'visitante vê item aprovado de produtor aprovado');

:comoA
update public.items set status_aprovacao = 'pausado';
select teste.ok((select status_aprovacao from public.items) = 'pausado', 'produtor pausa item aprovado');
update public.items set status_aprovacao = 'aprovado';
select teste.ok((select status_aprovacao from public.items) = 'aprovado', 'produtor despausa sem nova análise');
update public.items set estoque = 25;
select teste.ok((select status_aprovacao from public.items) = 'aprovado', 'mudar só o estoque não pede nova análise');
update public.items set preco_centavos = 9990;
select teste.ok((select status_aprovacao from public.items) = 'em_analise',
                'mudou o preço → item volta para análise');
select teste.bloqueia($$update public.items set status_aprovacao = 'aprovado'$$,
                      'depois de editar, produtor não reaprova sozinho');

:comoC
select public.admin_decidir_item((select id from serum), true);
-- um segundo item, em rascunho
:comoServidor
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
-- LGPD (Etapa 2): revendedor NÃO vê o pedido com dados do comprador...
select teste.ok((select count(*) from public.orders) = 0, 'LGPD: revendedor não lê o pedido (dados do comprador)');
select teste.ok((select count(*) from public.order_items) = 0, 'LGPD: revendedor não lê itens do pedido direto');
-- ...mas vê a venda resumida: data, produto, valor, comissão e status
select teste.ok((select count(*) from public.minhas_vendas()) = 1, 'revendedor vê a própria venda em minhas_vendas()');
select teste.ok((select produto = 'Sérum Facial' and valor_centavos = 9990 and comissao_centavos = 1998
                        and status = 'aguardando_pagamento'
                 from public.minhas_vendas()),
                'minhas_vendas: produto, valor, comissão (20%) e status corretos');
select teste.ok(not exists (
                  select 1
                  from unnest((select proargnames from pg_proc where proname = 'minhas_vendas')) as coluna
                  where coluna ilike any (array['%comprador%','%email%','%telefone%','%endereco%','%whatsapp%'])),
                'LGPD: minhas_vendas não devolve nome/e-mail/telefone/endereço do comprador');
:comoD
select teste.ok((select count(*) from public.minhas_vendas()) = 0, 'outro usuário não vê vendas alheias');
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
-- Etapa 2: visitante não grava direto; inscrição só pelo servidor (seção 10)
select teste.bloqueia($$insert into public.waitlist (email, interesse) values ('visitante@teste.com', 'revendedor')$$,
                      'visitante não grava direto na lista de espera');
:comoServidor
select public.inscrever_na_lista(
  '{"email":"visitante@teste.com","nome":"Visitante","interesse":"revendedor","whatsapp":"11987654321",
    "cidade":"Recife","uf":"PE","nichos":["beleza"],"consentimento_versao":"2026-11-16"}', 'ip-visitante');
:comoAnon
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
-- 10. Lista de espera com indicação (Etapa 2)
-- =========================================================================
\set REV '{"interesse":"revendedor","whatsapp":"81998765432","cidade":"Recife","uf":"PE","nichos":["beleza","moda"],"consentimento_versao":"2026-11-16"'
\set PROD '{"interesse":"produtor","whatsapp":"1133334444","empresa":"Doces da Vó","tipo_produto":"fisico","o_que_vende":"Doces caseiros","consentimento_versao":"2026-11-16"'

-- inscrição que DEVE ser recusada (mostra o motivo, para conferir que é o certo)
reset role;
create function teste.inscricao_recusada(p jsonb, ip text, msg text) returns void language plpgsql as $$
begin
  begin
    perform public.inscrever_na_lista(p, ip);
  exception when others then
    raise notice 'ok: % (bloqueado: %)', msg, sqlerrm;
    return;
  end;
  raise exception 'FALHOU: % — a inscrição passou e não devia', msg;
end $$;
grant execute on function teste.inscricao_recusada(jsonb, text, text) to service_role;

:comoAnon
select teste.bloqueia($$select public.inscrever_na_lista('{}', 'x')$$,
                      'visitante não chama a função de inscrição direto (só o servidor)');
select teste.bloqueia($$select * from public.waitlist_com_indicacoes$$, 'visitante não lê a visão com indicações');

:comoServidor
-- inscrições válidas
create temp table codigos (quem text, codigo text);
grant all on codigos to anon, authenticated, service_role;
insert into codigos select 'rita', public.inscrever_na_lista((:'REV' || ',"email":"Rita@Teste.com ","nome":"Rita"}')::jsonb, 'ip-rita');
select teste.ok((select email from public.waitlist where nome = 'Rita') = 'rita@teste.com', 'e-mail salvo em minúsculas e sem espaços');
select teste.ok((select codigo ~ '^[0-9a-f]{8}$' from codigos where quem = 'rita'), 'inscrito recebe código de indicação de 8 caracteres');
select teste.ok((select consentimento_versao = '2026-11-16' and consentimento_em is not null
                 from public.waitlist where nome = 'Rita'), 'consentimento gravado com data e versão');

-- validações
select teste.inscricao_recusada((:'REV' || ',"email":"x1@teste.com","nome":"Xis"}')::jsonb || '{"consentimento_versao":""}', 'ip-x',
                                'sem consentimento LGPD não inscreve');
select teste.inscricao_recusada((:'REV' || ',"email":"x2@teste.com","nome":"Xis"}')::jsonb || '{"nichos":[]}', 'ip-x',
                                'revendedor sem nicho não inscreve');
select teste.inscricao_recusada((:'REV' || ',"email":"x3@teste.com","nome":"Xis"}')::jsonb || '{"nichos":["armas"]}', 'ip-x',
                                'nicho fora da lista recusado');
select teste.inscricao_recusada((:'REV' || ',"email":"x4@teste.com","nome":"Xis"}')::jsonb || '{"whatsapp":"123"}', 'ip-x',
                                'WhatsApp inválido recusado');
select teste.inscricao_recusada((:'PROD' || ',"email":"x5@teste.com","nome":"Xis"}')::jsonb || '{"empresa":""}', 'ip-x',
                                'produtor sem empresa não inscreve');
select teste.inscricao_recusada((:'PROD' || ',"email":"x6@teste.com","nome":"Xis"}')::jsonb || '{"cnpj":"11222333000182"}', 'ip-x',
                                'CNPJ informado precisa ser válido');
select teste.inscricao_recusada((:'REV' || ',"email":"rita@teste.com","nome":"Rita Dois"}')::jsonb, 'ip-x',
                                'e-mail repetido não inscreve de novo');
insert into codigos select 'doces', public.inscrever_na_lista((:'PROD' || ',"email":"doces@teste.com","nome":"Dona Ana"}')::jsonb, 'ip-doces');
select teste.ok(true, 'produtor sem CNPJ inscreve (CNPJ opcional nesta fase)');

-- indicação: Rita indica duas pessoas de outros IPs e "se indica" uma vez do próprio IP
select public.inscrever_na_lista((:'REV' || ',"email":"amiga1@teste.com","nome":"Amiga Um","ref":"' || (select codigo from codigos where quem = 'rita') || '"}')::jsonb, 'ip-amiga1');
select public.inscrever_na_lista((:'REV' || ',"email":"amiga2@teste.com","nome":"Amiga Dois","ref":"' || (select codigo from codigos where quem = 'rita') || '"}')::jsonb, 'ip-amiga2');
select public.inscrever_na_lista((:'REV' || ',"email":"rita.fake@teste.com","nome":"Rita Fake","ref":"' || (select codigo from codigos where quem = 'rita') || '"}')::jsonb, 'ip-rita');
select public.inscrever_na_lista((:'REV' || ',"email":"semref@teste.com","nome":"Sem Ref","ref":"naoexiste"}')::jsonb, 'ip-semref');
select teste.ok((select indicado_por is null from public.waitlist where email = 'semref@teste.com'),
                'código de indicação inexistente é ignorado');

-- posição: pública, sem dados pessoais
:comoAnon
select teste.ok((select indicacoes from public.posicao_na_lista((select codigo from codigos where quem = 'rita'))) = 2,
                'indicação do mesmo IP (autoindicação) não conta: Rita tem 2, não 3');
select teste.ok((select posicao from public.posicao_na_lista((select codigo from codigos where quem = 'rita'))) = 1,
                'quem indica mais fica na frente da fila (Rita passa o visitante que chegou antes)');
select teste.ok((select total from public.posicao_na_lista((select codigo from codigos where quem = 'rita'))) = 6,
                'fila separada por tipo: 6 revendedores');
select teste.ok((select posicao = 1 and total = 1 and interesse = 'produtor'
                 from public.posicao_na_lista((select codigo from codigos where quem = 'doces'))),
                'produtor tem a própria fila');
select teste.ok((select count(*) from public.posicao_na_lista('naoexiste')) = 0, 'código inexistente não devolve nada');

-- limite por IP: 5 por hora
:comoServidor
select public.inscrever_na_lista((:'REV' || ',"email":"s' || n || '@teste.com","nome":"Spam ' || n || '"}')::jsonb, 'ip-spam')
from generate_series(1, 5) n;
select teste.inscricao_recusada((:'REV' || ',"email":"s6@teste.com","nome":"Spam 6"}')::jsonb, 'ip-spam',
                                'sexta inscrição do mesmo IP em 1 hora é bloqueada');

-- admin: status do contato
:comoB
select teste.ok(teste.linhas($$update public.waitlist set status_contato = 'aprovado'$$) = 0,
                'usuário comum não altera status da lista');
select teste.ok((select count(*) from public.waitlist_com_indicacoes) = 0, 'usuário comum não lê a visão com indicações');
:comoC
select teste.ok(teste.linhas($$update public.waitlist set status_contato = 'contatado' where email = 'doces@teste.com'$$) = 1,
                'admin marca produtor como contatado');
select teste.bloqueia($$update public.waitlist set status_contato = 'vip' where email = 'doces@teste.com'$$,
                      'status de contato fora da lista recusado');
select teste.bloqueia($$update public.waitlist set email = 'outro@teste.com' where email = 'doces@teste.com'$$,
                      'admin não altera e-mail do inscrito pelo site');
select teste.ok((select indicacoes from public.waitlist_com_indicacoes where nome = 'Rita') = 2,
                'admin vê o número de indicações válidas');

-- vitrine não pode usar as rotas novas
:comoA
select teste.bloqueia($$insert into public.storefronts (revendedor_id, slug)
                        values ('00000000-0000-0000-0000-00000000000a', 'lista')$$,
                      'slug "lista" (rota da lista de espera) é reservado');

-- =========================================================================
-- 11. Área do produtor (Etapa 3): digital, alertas, recusa, arquivos
-- =========================================================================
:comoA
-- item digital
insert into public.items (producer_id, nome, descricao, preco_centavos, tipo, comissao_percentual, categoria,
                          fotos, tipo_digital, declaracao_nf, status_aprovacao)
  select id, 'Curso de Maquiagem', 'Curso completo em vídeo, 20 aulas.', 19700, 'digital', 50, 'cursos_digitais',
         array['00000000-0000-0000-0000-00000000000a/curso.webp'], 'curso', true, 'rascunho'
  from public.producers;
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise' where nome = 'Curso de Maquiagem'$$,
                      'digital sem arquivo/link e instruções não vai para análise');
select teste.bloqueia($$update public.items set link_acesso = 'http://curso.com' where nome = 'Curso de Maquiagem'$$,
                      'link de acesso sem https recusado');
select teste.bloqueia($$update public.items set arquivo_path = '00000000-0000-0000-0000-00000000000b/x.pdf'
                        where nome = 'Curso de Maquiagem'$$,
                      'arquivo digital precisa estar na pasta do próprio produtor');
update public.items set link_acesso = 'https://cursos.exemplo.com/maquiagem',
       instrucoes_pos_compra = 'Você receberá o acesso por e-mail em até 24h.', status_aprovacao = 'em_analise'
  where nome = 'Curso de Maquiagem';
select teste.ok((select status_aprovacao from public.items where nome = 'Curso de Maquiagem') = 'em_analise',
                'item digital completo vai para análise');

-- alerta de palavras proibidas (marca, não bloqueia)
insert into public.items (producer_id, nome, descricao, preco_centavos, tipo, comissao_percentual)
  select id, 'Chá Emagrecedor', 'Remédio natural, cura em 7 dias. Fique rico revendendo!', 4990, 'fisico', 30
  from public.producers;
select teste.ok((select alerta_palavras from public.items where nome = 'Chá Emagrecedor')
                = array['cura','emagrecedor','fique rico','remedio'],
                'alerta encontra termos proibidos sem diferenciar acento e maiúsculas');
select teste.ok((select alerta_palavras = '{}' from public.items where nome = 'Sérum Facial'),
                'item normal não recebe alerta');
update public.items set descricao = 'Organizador para armário de cozinha.' where nome = 'Chá Emagrecedor';
select teste.ok((select alerta_palavras from public.items where nome = 'Chá Emagrecedor') = array['emagrecedor'],
                'alerta é recalculado a cada edição ("armário" não dispara "arma")');

-- admin recusa item com motivo, produtor vê e reenvia
:comoC
select teste.bloqueia($$select public.admin_decidir_item((select id from public.items where nome = 'Curso de Maquiagem'), false, 'ruim')$$,
                      'recusa de item com motivo curto demais');
select public.admin_decidir_item((select id from public.items where nome = 'Curso de Maquiagem'), false,
                                 'Inclua o conteúdo das aulas na descrição.');
select teste.ok((select count(*) from public.audit_log where entidade = 'item' and acao = 'item_recusado') = 1,
                'recusa do item registrada no log');
:comoA
select teste.ok((select motivo_rejeicao from public.items where nome = 'Curso de Maquiagem')
                = 'Inclua o conteúdo das aulas na descrição.', 'produtor vê o motivo da recusa do item');
update public.items set descricao = 'Curso em vídeo: pele, olhos e boca. 20 aulas.', status_aprovacao = 'em_analise'
  where nome = 'Curso de Maquiagem';
select teste.ok((select status_aprovacao = 'em_analise' and motivo_rejeicao is null
                 from public.items where nome = 'Curso de Maquiagem'), 'item corrigido volta para análise');

-- item aprovado exige produtor aprovado (vale até para o servidor)
:comoServidor
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000d', 'produtor');
insert into public.producers (user_id, razao_social, cnpj)
  values ('00000000-0000-0000-0000-00000000000d', 'Davi ME', '12ABC34501DE35');
select teste.ok((select status_verificacao from public.producers where cnpj = '12ABC34501DE35') = 'rascunho',
                'CNPJ alfanumérico aceito no cadastro do produtor');
insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
  select id, 'Produto do Davi', 1000, 'digital', 10 from public.producers where cnpj = '12ABC34501DE35';
select teste.bloqueia($$update public.items set status_aprovacao = 'aprovado', aprovado_em = now()
                        where nome = 'Produto do Davi'$$,
                      'item não fica aprovado se o produtor não estiver aprovado');

-- arquivos privados
reset role;
select teste.ok((select bool_and(not public) from storage.buckets
                 where id in ('documentos-produtores', 'arquivos-digitais')),
                'buckets de documentos e arquivos digitais são privados');
:comoA
insert into storage.objects (bucket_id, name) values ('arquivos-digitais', '00000000-0000-0000-0000-00000000000a/ebook.pdf');
:comoAnon
select teste.ok((select count(*) from storage.objects
                 where bucket_id in ('documentos-produtores', 'arquivos-digitais')) = 0,
                'visitante não vê documentos nem arquivos digitais');
:comoB
select teste.ok((select count(*) from storage.objects where bucket_id = 'arquivos-digitais') = 0,
                'outro usuário não vê o arquivo digital do produtor');
:comoC
select teste.ok((select count(*) from storage.objects where bucket_id = 'arquivos-digitais') = 1,
                'admin vê o arquivo digital para análise');

-- =========================================================================
-- 12. Quem executa cada função (endurecimento)
-- =========================================================================
:comoAnon
select teste.bloqueia($$select public.is_admin()$$, 'visitante não executa is_admin');
select teste.bloqueia($$select public.tem_papel('admin')$$, 'visitante não executa tem_papel');
select teste.bloqueia($$select public.palavras_proibidas_em('remédio')$$, 'visitante não descobre a lista de palavras proibidas');
select teste.bloqueia($$select public.pode_ver_pedido(gen_random_uuid())$$, 'visitante não executa pode_ver_pedido');
select teste.ok((select count(*) from public.posicao_na_lista('naoexiste')) = 0, 'visitante continua consultando a posição na fila');
select teste.ok((select count(*) from public.items where status_aprovacao = 'aprovado') >= 1,
                'visitante continua vendo itens aprovados (regra pública intacta)');
:comoA
select teste.ok(public.palavras_proibidas_em('remédio') = array['remedio'], 'usuário logado usa o alerta de palavras (gatilho do item)');
reset role;
select teste.ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
                'ninguém chama a função interna do cadastro diretamente');

-- =========================================================================
-- 9. RLS ligado em TODAS as tabelas
-- =========================================================================
reset role;
select teste.ok(not exists (select 1 from pg_tables
                            where schemaname = 'public' and not rowsecurity),
                'RLS ativo em todas as tabelas do schema public');

\o
\echo '>>> TODOS OS TESTES PASSARAM'
