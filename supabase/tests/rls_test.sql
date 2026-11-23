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

-- envio para análise: precisa de tudo
select teste.bloqueia($$select public.enviar_produtor_para_analise()$$, 'sem aceitar o Contrato do Produtor não envia');
insert into public.terms_acceptances (user_id, documento, versao)
  values ('00000000-0000-0000-0000-00000000000a', 'termos_produtor', '2026-11-18');
select teste.bloqueia($$select public.enviar_produtor_para_analise()$$, 'sem endereço comercial não envia');
update public.producers set cep = '50030230', logradouro = 'Rua do Bom Jesus', numero = '100', bairro = 'Recife',
       cidade = 'Recife', uf = 'PE';
-- KYC é da Lytex: a Staypse não pede nem guarda documentos
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
select teste.bloqueia($$update public.producers set status_verificacao = 'aprovado'$$,
                      'aprovado sem data de aprovação é recusado pelo banco');

-- admin recusa com motivo
:comoC
create temp table prod as select id from public.producers;
grant select on prod to authenticated, anon, service_role;
select teste.bloqueia($$select public.admin_decidir_produtor((select id from prod), false, '')$$,
                      'recusa sem motivo não é aceita');
select public.admin_decidir_produtor((select id from prod), false, 'Nome da loja diferente da marca, corrija.');

:comoA
select teste.ok((select status_verificacao = 'recusado' and motivo_rejeicao = 'Nome da loja diferente da marca, corrija.'
                 from public.producers), 'produtor vê a recusa e o motivo');
update public.producers set whatsapp = '81998765433';
select public.enviar_produtor_para_analise();
select teste.ok((select status_verificacao = 'em_analise' and motivo_rejeicao is null from public.producers),
                'depois de corrigir, reenvia para análise');

-- admin aprova a loja por conteúdo (a identidade é verificada pela Lytex)
:comoC
select public.admin_decidir_produtor((select id from prod), true);
select teste.ok((select status_verificacao = 'aprovado' and aprovado_por = '00000000-0000-0000-0000-00000000000c'
                 from public.producers), 'admin aprova a loja por conteúdo');
select teste.ok((select string_agg(acao, ',' order by id) from public.audit_log where entidade = 'producer')
                = 'enviado_para_analise,loja_recusada,enviado_para_analise,loja_aprovada',
                'log de auditoria registra cada passo');
select teste.ok((select bool_and(ator_id is not null) from public.audit_log where entidade = 'producer'), 'log guarda quem fez cada ação');
select teste.ok((select detalhes ? 'antes' and detalhes ? 'depois' from public.audit_log where acao = 'loja_aprovada'),
                'log guarda o antes e o depois');
select teste.ok((select count(*) from public.audit_log where acao = 'kyc_proprio_removido') = 1,
                'remoção do KYC próprio registrada no log');

-- recebedor da Ana na Lytex (simulado): em análise → aprovado por webhook
:comoServidor
select teste.bloqueia($$select public.registrar_recebedor('00000000-0000-0000-0000-00000000000a', 'produtor', '00.000.000/0001-91', 'mock', 'rec_a', 'em_analise', null)$$,
                      'recebedor com CNPJ diferente do cadastro é recusado');
select public.registrar_recebedor('00000000-0000-0000-0000-00000000000a', 'produtor', '11.222.333/0001-81', 'mock', 'rec_a', 'em_analise', null);
select public.aplicar_status_recebedor('mock', 'rec_a', 'aprovado', null, '11222333000181');
-- recebedor do afiliado B (CPF)
select public.registrar_recebedor('00000000-0000-0000-0000-00000000000b', 'afiliado', '529.982.247-25', 'mock', 'rec_b', 'em_analise', null);
select public.aplicar_status_recebedor('mock', 'rec_b', 'aprovado', null, null);
-- B também vende como vendedor próprio "split direto": recebedor próprio para isso
select public.registrar_recebedor('00000000-0000-0000-0000-00000000000b', 'vendedor', '529.982.247-25', 'mock', 'rec_b_vend', 'em_analise', null);
select public.aplicar_status_recebedor('mock', 'rec_b_vend', 'aprovado', null, null);
:comoA
select teste.ok((select status_recebedor from public.recebedores) = 'aprovado', 'loja vê o status do próprio recebedor');
:comoB
select teste.ok((select count(*) from public.recebedores) = 2 and (select bool_and(user_id = '00000000-0000-0000-0000-00000000000b') from public.recebedores),
                'cada um vê só o próprio recebedor');
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
select teste.ok((select declaracao_nf_em is not null from public.itens_privados()), 'declaração de NF registrada com data do servidor');
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
-- 8. Armazenamento: sem documentos de identidade (KYC é da Lytex)
-- =========================================================================
reset role;
select teste.ok(not exists (select 1 from storage.buckets where id = 'documentos-produtores'), 'não existe bucket de documentos');
select teste.ok(not exists (select 1 from information_schema.columns
                            where table_name = 'producers' and column_name like 'documento%path'),
                'cadastro do produtor não guarda caminho de documento');
:comoA
select teste.bloqueia($$insert into storage.objects (bucket_id, name)
                        values ('documentos-produtores', '00000000-0000-0000-0000-00000000000a/rg.jpg')$$,
                      'ninguém envia documento de identidade');

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
select teste.ok((select alerta_palavras from public.itens_privados() where nome = 'Chá Emagrecedor')
                = array['cura','emagrecedor','fique rico','remedio'],
                'alerta encontra termos proibidos sem diferenciar acento e maiúsculas');
select teste.ok((select alerta_palavras = '{}' from public.itens_privados() where nome = 'Sérum Facial'),
                'item normal não recebe alerta');
update public.items set descricao = 'Organizador para armário de cozinha.' where nome = 'Chá Emagrecedor';
select teste.ok((select alerta_palavras from public.itens_privados() where nome = 'Chá Emagrecedor') = array['emagrecedor'],
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
select teste.ok((select motivo_rejeicao from public.itens_privados() where nome = 'Curso de Maquiagem')
                = 'Inclua o conteúdo das aulas na descrição.', 'produtor vê o motivo da recusa do item');
update public.items set descricao = 'Curso em vídeo: pele, olhos e boca. 20 aulas.', status_aprovacao = 'em_analise'
  where nome = 'Curso de Maquiagem';
select teste.ok((select status_aprovacao = 'em_analise' and motivo_rejeicao is null
                 from public.itens_privados() where nome = 'Curso de Maquiagem'), 'item corrigido volta para análise');

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
select teste.ok((select bool_and(not public) from storage.buckets where id = 'arquivos-digitais'),
                'bucket de arquivos digitais é privado');
:comoA
insert into storage.objects (bucket_id, name) values ('arquivos-digitais', '00000000-0000-0000-0000-00000000000a/ebook.pdf');
:comoAnon
select teste.ok((select count(*) from storage.objects
                 where bucket_id = 'arquivos-digitais') = 0,
                'visitante não vê arquivos digitais');
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
-- 13. Vitrines e afiliação (Etapa 4)
-- =========================================================================
reset role;
select teste.ok((select slug = 'serum-facial' from public.items where nome = 'Sérum Facial'), 'item ganha slug curto a partir do nome');
select teste.ok((select loja_slug is not null from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'),
                'produtor aprovado ganha endereço de loja automático');
:comoA
select teste.bloqueia($$select public.salvar_minha_loja('admin', 'Ana', null, null, null, null, null, null)$$, 'slug de loja reservado recusado');
select public.salvar_minha_loja('ana-cosmeticos', 'Ana Cosméticos', 'Cosméticos naturais.', null, null, null, null, null);
:comoC
select public.admin_decidir_item((select id from public.items where nome = 'Curso de Maquiagem'), true);
:comoA
update public.items set aprovacao_afiliacao = 'manual' where nome = 'Curso de Maquiagem';
select teste.ok((select status_aprovacao from public.items where nome = 'Curso de Maquiagem') = 'aprovado', 'mudar a regra de afiliação não pede nova análise');
:comoAnon
select teste.ok((select count(*) from public.loja_publica('ana-cosmeticos')) = 1, 'loja pública do produtor aprovado');
select teste.ok((select count(*) from public.itens_da_loja('ana-cosmeticos')) = 2, 'loja mostra os itens aprovados');
select teste.bloqueia($$select * from public.afiliacoes$$, 'visitante não lê afiliações');
select teste.bloqueia($$select public.afiliar_se(gen_random_uuid())$$, 'visitante não se afilia');
:comoD
select teste.bloqueia($$select public.afiliar_se((select id from public.items where nome = 'Sérum Facial'))$$, 'sem vitrine não se afilia');
:comoB
select teste.ok((select status from public.afiliar_se((select id from public.items where nome = 'Sérum Facial'))) = 'aprovada', 'afiliação automática já sai aprovada');
select teste.ok((select status from public.afiliar_se((select id from public.items where nome = 'Curso de Maquiagem'))) = 'pendente', 'afiliação manual fica pendente');
select teste.ok((select bool_and(codigo ~ '^[0-9a-f]{8}$') from public.afiliacoes), 'afiliação tem código curto');
select teste.bloqueia($$select public.decidir_afiliacao((select id from public.afiliacoes where status = 'pendente'), true)$$, 'afiliado não aprova a própria afiliação');
:comoAnon
select teste.ok((select count(*) from public.itens_da_vitrine('loja-da-bia')) = 1, 'vitrine pública só mostra afiliação aprovada');
:comoA
select teste.ok((select count(*) from public.afiliacoes) = 2, 'produtor vê quem se afiliou aos itens dele');
select public.decidir_afiliacao((select id from public.afiliacoes where status = 'pendente'), true);
:comoD
select teste.ok((select count(*) from public.afiliacoes) = 0, 'outro usuário não vê afiliações alheias');
:comoAnon
select teste.ok((select count(*) from public.itens_da_vitrine('loja-da-bia')) = 2, 'após aprovação do produtor, item aparece na vitrine');
select teste.bloqueia($$select * from public.abrir_link_afiliado('loja-da-bia', 'serum-facial', 'h', null, true)$$, 'visitante não grava clique direto');
:comoServidor
select teste.ok((select atribuido and clique_registrado and loja_slug = 'ana-cosmeticos'
                 from public.abrir_link_afiliado('loja-da-bia', 'serum-facial', 'ip-1', 'instagram.com', true)),
                'link curto /@bia/serum-facial: atribui, registra clique e leva à loja');
select teste.ok((select atribuido and not clique_registrado from public.abrir_link_afiliado('loja-da-bia', 'serum-facial', 'ip-1', null, true)),
                'mesmo IP e item em 10 min não conta de novo (mas continua atribuindo)');
select teste.ok((select clique_registrado from public.abrir_link_afiliado('loja-da-bia', 'serum-facial', 'ip-2', null, true)),
                'outro IP conta outro clique');
select teste.ok((select not clique_registrado from public.abrir_link_afiliado('loja-da-bia', 'serum-facial', 'ip-robo', null, false)),
                'robô de prévia (WhatsApp) não conta clique');
:comoB
select teste.ok((select cliques_30d from public.meus_cliques() where titulo = 'Sérum Facial') = 2, 'afiliado vê os cliques no painel');
:comoD
select teste.ok((select count(*) from public.meus_cliques()) = 0, 'outro usuário não vê cliques alheios');
:comoA
update public.items set preco_centavos = 10990 where nome = 'Sérum Facial';
:comoAnon
select teste.ok((select count(*) from public.itens_da_vitrine('loja-da-bia')) = 1, 'item que volta para análise some da vitrine');
select teste.ok((select count(*) from public.produto_da_loja('ana-cosmeticos', 'curso-de-maquiagem')) = 1, 'página do produto aprovado é pública (dentro da loja)');
select teste.ok((select count(*) from public.produto_da_loja('ana-cosmeticos', 'serum-facial')) = 0, 'produto em análise não abre');

-- =========================================================================
-- 14. Links curtos, identidade visual e vendedores próprios (Etapa 4 — complemento)
-- =========================================================================
:comoServidor
select teste.ok((select not atribuido and loja_slug = 'ana-cosmeticos'
                 from public.abrir_link_afiliado('ninguem', 'curso-de-maquiagem', 'ip-5', null, true)),
                'afiliado inexistente: leva ao produto SEM atribuir');
select teste.ok((select count(*) from public.abrir_link_afiliado('loja-da-bia', 'nao-existe', 'ip-5', null, true)) = 0,
                'produto inexistente: nenhum destino');
:comoA
insert into public.items (producer_id, nome, preco_centavos, tipo, comissao_percentual)
  select id, 'Sérum Facial', 5000, 'fisico', 20 from public.producers where user_id = '00000000-0000-0000-0000-00000000000a';
select teste.ok((select count(*) from public.items where slug = 'serum-facial-2') = 1, 'mesmo nome na mesma loja ganha -2');
select teste.bloqueia($$update public.items set slug = 'Com Espaço' where slug = 'serum-facial-2'$$, 'endereço de produto inválido recusado');
select teste.bloqueia($$update public.items set slug = 'serum-facial' where slug = 'serum-facial-2'$$, 'endereço repetido na loja recusado');
update public.items set slug = 'serum-mini' where slug = 'serum-facial-2';
select teste.ok((select count(*) from public.items where slug = 'serum-mini') = 1, 'loja edita o endereço do produto');

-- identidade visual
select teste.bloqueia($$select public.salvar_minha_loja('ana-cosmeticos', 'Ana Cosméticos', null, null, 'azul', null, null, null)$$, 'cor inválida recusada');
select teste.bloqueia($$select public.salvar_minha_loja('ana-cosmeticos', 'Ana Cosméticos', null, null, null, null, 'comic-sans', null)$$, 'fonte fora da lista recusada');
select public.salvar_minha_loja('ana-cosmeticos', 'Ana Cosméticos', 'Cosméticos naturais.', null, '#7A1F3D', '#F2C14E', 'playfair', 'destaque');
:comoAnon
select teste.ok((select cor_principal = '#7a1f3d' and fonte = 'playfair' and layout = 'destaque' and cnpj is not null
                 from public.loja_publica('ana-cosmeticos')), 'loja pública traz cores, fonte, layout e dados do vendedor');
:comoB
update public.storefronts set modelo_visual = 'proprio', cor_principal = '#14d6c4' where slug = 'loja-da-bia';
select teste.ok((select modelo_visual = 'proprio' from public.storefronts where slug = 'loja-da-bia'), 'afiliado escolhe "minhas cores"');
select teste.bloqueia($$update public.storefronts set cor_principal = 'verde' where slug = 'loja-da-bia'$$, 'cor da vitrine inválida recusada');

-- links externos: clique só pelo servidor, e só se o link é daquela vitrine
insert into public.external_links (storefront_id, url, titulo, plataforma)
  select id, 'https://shopee.com.br/fone-xyz', 'Fone sem fio', 'shopee' from public.storefronts where slug = 'loja-da-bia';
:comoServidor
select teste.ok(public.registrar_clique_externo('loja-da-bia', (select id from public.external_links where titulo = 'Fone sem fio'), 'ip-7'),
                'clique em link externo registrado');
select teste.ok(not public.registrar_clique_externo('outra-vitrine', (select id from public.external_links where titulo = 'Fone sem fio'), 'ip-8'),
                'link externo de outra vitrine não conta');

-- vendedores próprios: convite
:comoB
select teste.bloqueia($$select public.convidar_vendedor('x@teste.com', 10, 'folha', false)$$, 'quem não tem loja não convida');
:comoA
select teste.bloqueia($$select public.convidar_vendedor('bia@teste.com', 25, 'split_direto', false)$$,
                      'split direto exige a declaração "não é meu empregado"');
select public.convidar_vendedor('Davi@Teste.com', 15, 'folha', false) as token_davi \gset
select public.convidar_vendedor('bia@teste.com', 25, 'split_direto', true) as token_bia \gset
reset role;
select teste.ok((select count(*) from public.loja_vendedores where convite_token_hash = :'token_davi') = 0,
                'o link do convite não fica guardado puro (só o hash)');
:comoAnon
select teste.ok((select loja_nome = 'Ana Cosméticos' and not expirado from public.ver_convite(:'token_davi')), 'convite mostra a loja');
select teste.bloqueia($$select * from public.loja_vendedores$$, 'visitante não lê vendedores');
:comoD
select teste.bloqueia($$insert into public.user_roles (user_id, papel) values ('00000000-0000-0000-0000-00000000000d', 'vendedor_proprio')$$,
                      'ninguém se dá o papel de vendedor próprio sozinho');
:comoB
select teste.bloqueia(format('select public.aceitar_convite(%L, %L)', :'token_davi', 'bia2'), 'convite de outro e-mail recusado');
:comoD
select public.aceitar_convite(:'token_davi', 'davi-vendas');
select teste.ok(public.tem_papel('vendedor_proprio'), 'aceite dá o papel de vendedor próprio');
select teste.ok((select count(*) from public.afiliacoes where origem = 'vendedor_proprio' and status = 'aprovada') = 1,
                'vendedor afiliado automaticamente aos itens aprovados da loja');
select teste.ok((select not publicada from public.storefronts where slug = 'davi-vendas'), 'vendedor pode só usar os links (vitrine não publicada)');
select teste.bloqueia(format('select public.aceitar_convite(%L, %L)', :'token_davi', 'davi2'), 'convite não é usado duas vezes');
:comoB
select public.aceitar_convite(:'token_bia', 'ignorado');
select teste.ok((select origem = 'vendedor_proprio' from public.afiliacoes a join public.items i on i.id = a.item_id
                 where i.slug = 'curso-de-maquiagem'), 'afiliado do catálogo que vira vendedor próprio passa a usar o contrato');
-- privacidade entre vendedores
:comoD
select teste.ok((select count(*) from public.loja_vendedores) = 1, 'vendedor vê só o próprio vínculo');
select teste.ok((select count(*) from public.meus_vendedores()) = 0, 'vendedor não lista os colegas');
select teste.ok((select count(*) from public.relatorio_comissoes(current_date)) = 0, 'vendedor não vê relatório da loja');
select teste.ok((select count(*) from public.loja_vendedores_historico) = 0, 'vendedor não vê o histórico da loja');
select teste.bloqueia(format('select public.atualizar_vendedor(%L, 90, %L, false)',
                      (select id from public.loja_vendedores), 'folha'), 'vendedor não muda a própria comissão');
delete from public.afiliacoes;
select teste.ok((select count(*) from public.afiliacoes) = 1, 'vendedor não apaga o vínculo da loja');
:comoA
select teste.ok((select count(*) from public.meus_vendedores()) = 2, 'loja lista seus vendedores');
-- clique atribuído ao vendedor
:comoServidor
select teste.ok((select atribuido from public.abrir_link_afiliado('davi-vendas', 'curso-de-maquiagem', 'ip-10', null, true)),
                'link do vendedor próprio atribui');
:comoD
select teste.ok((select cliques_30d from public.meus_cliques() where titulo = 'Curso de Maquiagem') = 1, 'vendedor vê o clique dele');
-- item aprovado depois entra sozinho para o vendedor
:comoC
select public.admin_decidir_item((select id from public.items where slug = 'serum-facial'), true);
:comoD
select teste.ok((select count(*) from public.afiliacoes where status = 'aprovada') = 2, 'item aprovado depois entra para o vendedor');
-- comissão conforme contrato + histórico
:comoA
select public.atualizar_vendedor((select id from public.loja_vendedores where email = 'davi@teste.com'), 18, 'folha', false);
select teste.ok((select valor_antigo = '15.00' and valor_novo = '18.00' and alterado_por = '00000000-0000-0000-0000-00000000000a'
                 from public.loja_vendedores_historico where campo = 'comissao_percentual' and valor_antigo is not null),
                'histórico guarda quem mudou e os valores antigo/novo');
select teste.bloqueia(format('select public.atualizar_vendedor(%L, 18, %L, false)',
                      (select id from public.loja_vendedores where email = 'davi@teste.com'), 'split_direto'),
                      'trocar para split direto exige a declaração');
select teste.ok((select count(*) from public.relatorio_comissoes(current_date)) = 2, 'relatório mensal lista os vendedores');
-- desativar: links param de atribuir, histórico fica
select public.definir_status_vendedor((select id from public.loja_vendedores where email = 'davi@teste.com'), false);
:comoServidor
select teste.ok((select not atribuido from public.abrir_link_afiliado('davi-vendas', 'curso-de-maquiagem', 'ip-11', null, true)),
                'vendedor desativado: link leva ao produto mas não atribui');
reset role;
select teste.ok((select count(*) from public.afiliacoes a join public.storefronts s on s.revendedor_id = a.afiliado_id
                 where s.slug = 'davi-vendas') = 2, 'histórico de afiliações continua');
select teste.ok((select count(*) from public.loja_vendedores_historico where campo = 'status' and valor_novo = 'desativado') = 1,
                'desativação fica no histórico');
:comoA
select public.definir_status_vendedor((select id from public.loja_vendedores where email = 'davi@teste.com'), true);
:comoServidor
select teste.ok((select atribuido from public.abrir_link_afiliado('davi-vendas', 'curso-de-maquiagem', 'ip-12', null, true)),
                'vendedor reativado volta a atribuir');

-- =========================================================================
-- 15. Revisão de segurança (migração 20261122000001)
-- =========================================================================
-- conteúdo pago e dados internos dos itens
:comoAnon
select teste.bloqueia($$select link_acesso from public.items$$, 'visitante NÃO lê o link de acesso do produto digital');
select teste.bloqueia($$select instrucoes_pos_compra from public.items$$, 'visitante NÃO lê as instruções pós-compra');
select teste.bloqueia($$select * from public.itens_privados()$$, 'visitante não chama itens_privados');
select teste.ok((select count(*) from public.items where slug = 'curso-de-maquiagem') = 1, 'visitante continua vendo os dados públicos do item');
:comoB
select teste.bloqueia($$select link_acesso from public.items$$, 'outro usuário logado NÃO lê o link de acesso');
select teste.ok((select count(*) from public.itens_privados()) = 0, 'itens_privados não mostra itens de outra loja');
:comoA
select teste.ok((select count(*) from public.itens_privados() where link_acesso is not null or arquivo_path is not null) >= 1,
                'dono da loja lê o conteúdo do próprio item digital');
:comoC
select teste.ok((select count(*) from public.itens_privados()) >= 3, 'admin lê todos os itens para análise');

-- links externos só das plataformas permitidas (também pela API direta)
:comoB
select teste.bloqueia($$insert into public.external_links (storefront_id, url, titulo, plataforma)
                        select id, 'https://loja-falsa.example/login', 'Golpe', 'shopee' from public.storefronts where slug = 'loja-da-bia'$$,
                      'link externo de site não permitido recusado no banco');
select teste.bloqueia($$insert into public.external_links (storefront_id, url, titulo, plataforma)
                        select id, 'https://shopee.com.br@evil.example/x', 'Golpe', 'shopee' from public.storefronts where slug = 'loja-da-bia'$$,
                      'truque "shopee.com.br@site-falso" recusado');
select teste.bloqueia($$insert into public.external_links (storefront_id, url, titulo, plataforma)
                        select id, 'https://shopee.com.br.evil.example/x', 'Golpe', 'shopee' from public.storefronts where slug = 'loja-da-bia'$$,
                      'subdomínio enganoso "shopee.com.br.site-falso" recusado');
select teste.bloqueia($$insert into public.external_links (storefront_id, url, titulo, plataforma, imagem_url)
                        select id, 'https://shopee.com.br/x', 'Fone', 'shopee', 'https://rastreio.example/pixel.gif' from public.storefronts where slug = 'loja-da-bia'$$,
                      'imagem de servidor desconhecido (pixel de rastreio) recusada');
insert into public.external_links (storefront_id, url, titulo, plataforma, imagem_url)
  select id, 'https://produto.mercadolivre.com.br/MLB-1', 'Garrafa', 'mercado_livre', 'https://http2.mlstatic.com/D_1.jpg'
  from public.storefronts where slug = 'loja-da-bia';
select teste.ok(true, 'link e imagem das plataformas permitidas aceitos');

-- caminhos de arquivo
select teste.bloqueia($$update public.storefronts set foto_path = '00000000-0000-0000-0000-00000000000b/../x.png' where slug = 'loja-da-bia'$$,
                      'caminho com ".." recusado');
select teste.bloqueia($$update public.storefronts set foto_path = '00000000-0000-0000-0000-00000000000a/foto.png' where slug = 'loja-da-bia'$$,
                      'foto da vitrine fora da pasta do dono recusada');
:comoA
select teste.bloqueia($$update public.items set fotos = array['00000000-0000-0000-0000-00000000000b/x.webp'] where slug = 'serum-mini'$$,
                      'foto de item na pasta de outra pessoa recusada');

-- convite: não expõe o e-mail e exige e-mail confirmado
select public.convidar_vendedor('eva@teste.com', 10, 'folha', false) as token_eva \gset
:comoAnon
select teste.ok((select email_mascarado = 'e***@teste.com' and not para_mim from public.ver_convite(:'token_eva')),
                'convite mostra só o e-mail mascarado');
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000e', 'eva@teste.com', null, '{"nome":"Eva Sem Confirmar","papeis":[],"termos_versao":"2026-11-16"}');
reset role; select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', false); set role authenticated;
select teste.bloqueia(format('select public.aceitar_convite(%L, %L)', :'token_eva', 'eva'), 'convite exige e-mail confirmado');

-- loja pública: identificação completa de quem vende (Decreto 7.962/2013)
:comoAnon
select teste.ok((select endereco like 'Rua do Bom Jesus, 100%' and email_contato is not null from public.loja_publica('ana-cosmeticos')),
                'loja pública traz endereço e e-mail do vendedor');

-- =========================================================================
-- 16. Checkout, pedidos, frete, arrependimento, SAC, LGPD e erros (migração 9)
-- =========================================================================
reset role;
-- item físico aprovado da loja da Ana, com estoque 5 e retirada no local
insert into public.items (producer_id, nome, descricao, fotos, categoria, declaracao_nf, declaracao_nf_em, preco_centavos, tipo,
                          comissao_percentual, estoque, peso_gramas, altura_cm, largura_cm, comprimento_cm, prazo_postagem_dias,
                          retirada_local, status_aprovacao, aprovado_em)
select id, 'Kit Banho', 'Kit com sabonete e óleo.', array['00000000-0000-0000-0000-00000000000a/kit.webp'], 'beleza', true, now(),
       5000, 'fisico', 10, 5, 500, 10, 10, 10, 2, true, 'aprovado', now()
from public.producers where user_id = '00000000-0000-0000-0000-00000000000a';
update public.items set status_aprovacao = 'aprovado', aprovado_em = now() where nome = 'Kit Banho';
select id as kit from public.items where nome = 'Kit Banho' \gset
select id as curso from public.items where nome = 'Curso de Maquiagem' \gset

-- frete: só a própria loja define
:comoB
select teste.bloqueia($$select public.salvar_frete(1000, 20000, 5)$$, 'quem não tem loja não define frete');
:comoA
select public.salvar_frete(1500, 12000, 5);
:comoAnon
select teste.bloqueia(format('select * from public.cotar_pedido(%L, 1, %L)', :'kit', 'digital'), 'item físico não aceita entrega digital');
select teste.bloqueia(format('select * from public.cotar_pedido(%L, 6, %L)', :'kit', 'envio'), 'cotação respeita o estoque');
select teste.ok((select frete_centavos = 1500 and total_centavos = 6500 from public.cotar_pedido(:'kit', 1, 'envio')),
                'cotação: preço + frete fixo calculados pelo banco');
select teste.ok((select frete_centavos = 0 from public.cotar_pedido(:'kit', 3, 'envio')), 'frete grátis acima do valor da loja');
select teste.ok((select frete_centavos = 0 from public.cotar_pedido(:'kit', 1, 'retirada')), 'retirada no local sem frete');

-- só o servidor cria pedido
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L)',
                             :'kit', 'retirada', 'Caio', 'caio@teste.com', '52998224725', '2026-11-18'),
                      'visitante não cria pedido direto');
:comoServidor
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L)',
                             :'kit', 'retirada', 'Caio', 'caio@teste.com', '11111111111', '2026-11-18'),
                      'CPF inválido recusado');
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, %L, %L)',
                             :'kit', 'envio', 'Caio', 'caio@teste.com', '52998224725', '{"cep":"123"}', '2026-11-18'),
                      'envio sem endereço completo recusado');
-- "indicado" por quem não tem afiliação ao kit => sem comissão
select codigo as ped1, token as tok1 from public.criar_pedido(:'kit', 2, 'envio', '00000000-0000-0000-0000-0000000000ff', null,
  'Caio Comprador', 'Caio@Teste.com', '529.982.247-25', '(21) 99999-0000',
  '{"cep":"24900000","logradouro":"Rua A","numero":"1","bairro":"Centro","cidade":"Maricá","uf":"RJ","extra":"x"}', '2026-11-18') \gset
select codigo as ped2, token as tok2 from public.criar_pedido(:'curso', 1, 'digital', '00000000-0000-0000-0000-00000000000b', null,
  'Duda', 'duda@teste.com', '52998224725', null, null, '2026-11-18') \gset
reset role;
select teste.ok((select revendedor_id is null and total_centavos = 11500 and not (endereco_entrega ? 'extra') and comprador_email = 'caio@teste.com'
                 from public.orders where codigo = :'ped1'),
                'pedido: total do banco, sem indicação sem afiliação aprovada, endereço limpo');
select teste.ok((select o.revendedor_id = '00000000-0000-0000-0000-00000000000b' and oi.comissao_percentual > 0
                 from public.orders o join public.order_items oi on oi.order_id = o.id where o.codigo = :'ped2'),
                'pedido indicado por afiliação aprovada leva a comissão');
select teste.ok((select acesso_hash <> :'tok1' from public.orders where codigo = :'ped1'), 'token do comprador guardado só como hash');

-- comprador sem conta vê o pedido só com o link certo
:comoServidor
select teste.ok(public.pedido_do_comprador(:'ped1', 'errado') is null, 'link errado não abre o pedido');
select teste.ok((public.pedido_do_comprador(:'ped2', :'tok2') -> 'itens' -> 0 -> 'acesso') = 'null'::jsonb,
                'conteúdo digital fechado antes do pagamento');
:comoAnon
select teste.bloqueia(format('select public.confirmar_pagamento((select id from public.orders limit 1))'), 'visitante não confirma pagamento');
:comoA
select teste.bloqueia(format('select public.confirmar_pagamento(%L)', (select gen_random_uuid())), 'loja não confirma pagamento');
:comoServidor
select public.confirmar_pagamento(id) from public.orders where codigo in (:'ped1', :'ped2');
select teste.ok((public.pedido_do_comprador(:'ped2', :'tok2') -> 'itens' -> 0 -> 'acesso') <> 'null'::jsonb,
                'conteúdo digital liberado depois do pagamento');
select teste.ok((public.pedido_do_comprador(:'ped2', :'tok2') ->> 'arrependimento_ate') is not null,
                'digital: prazo de 7 dias começa na liberação');
reset role;
select teste.ok((select estoque = 3 from public.items where nome = 'Kit Banho'), 'pagamento baixa o estoque');

-- loja: nota fiscal e rastreio; entregue começa o prazo de arrependimento
:comoA
select teste.ok((select count(*) from public.orders where codigo = :'ped1') = 1, 'loja vê o pedido pago');
update public.order_items set nota_fiscal_numero = '987', nota_fiscal_chave = repeat('3', 44), codigo_rastreio = 'BR987',
       status_entrega = 'enviado'
where order_id = (select id from public.orders where codigo = :'ped1');
select teste.ok((select nota_fiscal_emitida_em is not null from public.order_items
                 where order_id = (select id from public.orders where codigo = :'ped1')), 'data da nota preenchida sozinha');
:comoServidor
select public.confirmar_recebimento(:'ped1', :'tok1');
reset role;
select teste.ok((select entregue_em is not null and arrependimento_ate = entregue_em + interval '7 days'
                 from public.orders where codigo = :'ped1'), 'recebimento confirmado: prazo de 7 dias a partir da entrega');

-- arrependimento (CDC art. 49)
:comoServidor
select teste.ok(public.desistir_do_pedido(:'ped1', :'tok1', null) = 'em_reembolso', 'comprador desiste dentro de 7 dias sem justificar');
select teste.ok((public.pedido_do_comprador(:'ped1', :'tok1') ->> 'status') = 'em_reembolso', 'pedido vai para reembolso');
reset role;
update public.orders set arrependimento_ate = now() - interval '1 day', status = 'pago' where codigo = :'ped2';
:comoServidor
select teste.bloqueia(format('select public.desistir_do_pedido(%L, %L, null)', :'ped2', :'tok2'), 'fora do prazo de 7 dias a desistência é recusada');
:comoB
select teste.bloqueia(format('select public.concluir_reembolso((select id from public.orders where codigo = %L))', :'ped1'),
                      'só o admin registra o reembolso');
:comoC
select public.concluir_reembolso(id) from public.orders where codigo = :'ped1';
reset role;
select teste.ok((select status = 'reembolsado' from public.orders where codigo = :'ped1'), 'reembolso concluído');
-- pedido não pago: cancela sem custo
:comoServidor
select codigo as ped3, token as tok3 from public.criar_pedido(:'kit', 1, 'retirada', null, null, 'Eli', 'eli@teste.com', '52998224725', null, null, '2026-11-18') \gset
select teste.ok(public.desistir_do_pedido(:'ped3', :'tok3', 'mudei de ideia') = 'cancelado', 'pedido não pago é cancelado');
select teste.ok(public.renovar_acesso_pedido(:'ped3', 'outra@teste.com') is null, 'perdeu o link: e-mail errado não gera link novo');
select teste.ok(public.renovar_acesso_pedido(:'ped3', 'ELI@teste.com') is not null, 'perdeu o link: código + e-mail geram link novo');
select teste.ok(public.pedido_do_comprador(:'ped3', :'tok3') is null, 'link antigo deixa de valer');

-- revendedor vê a venda sem dados do comprador
:comoB
select teste.ok((select count(*) from public.minhas_vendas()) >= 1, 'afiliado vê as próprias vendas (sem dados do comprador)');

-- SAC com protocolo e prazo de 5 dias
:comoAnon
select teste.bloqueia($$select * from public.abrir_atendimento(null, 'Caio', 'caio@teste.com', 'pedido', 'Mensagem de teste longa.', null)$$,
                      'visitante não grava atendimento direto (só pelo servidor)');
:comoServidor
select protocolo as proto, token as tokp from public.abrir_atendimento(null, 'Caio', 'caio@teste.com', 'pedido',
                                                                      'Quero saber do meu pedido, por favor.', :'ped1') \gset
select protocolo as proto_lgpd from public.abrir_atendimento(null, 'Caio', 'caio@teste.com', 'lgpd_exclusao',
                                                            'Quero apagar meus dados pessoais.', null) \gset
select teste.ok((select prazo_ate::date = (criado_em + interval '5 days')::date from public.ver_atendimento(:'proto', :'tokp')),
                'atendimento com protocolo e prazo de 5 dias');
:comoA
select teste.ok((select count(*) from public.atendimentos) = 1, 'loja vê o atendimento sobre o pedido dela (não o de LGPD)');
select public.responder_atendimento((select id from public.atendimentos where protocolo = :'proto'), 'Seu pedido foi postado.', false);
:comoD
select teste.ok((select count(*) from public.atendimentos) = 0, 'terceiro não vê atendimentos');
select teste.bloqueia(format('select public.responder_atendimento((select id from public.atendimentos limit 1), %L, true)', 'oi'),
                      'terceiro não responde atendimento');
:comoServidor
select teste.ok((select status = 'respondido' and resposta like 'Seu pedido%' from public.ver_atendimento(:'proto', :'tokp')),
                'comprador vê a resposta pelo protocolo');
:comoC
select teste.ok((select count(*) from public.atendimentos where protocolo = :'proto_lgpd') = 1, 'pedido LGPD chega à Staypse');

-- LGPD: baixar meus dados
:comoB
select teste.ok((select (d -> 'conta' ->> 'email') is not null and d ? 'afiliacoes' and d ? 'aceites_de_termos'
                 from public.meus_dados() d), 'titular baixa os próprios dados');
:comoAnon
select teste.bloqueia($$select public.meus_dados()$$, 'visitante não chama meus_dados');

-- monitoramento
:comoAnon
select teste.ok(public.saude() = 1, 'checagem de saúde responde');
select teste.bloqueia($$insert into public.erros_app (mensagem) values ('x')$$, 'visitante não grava erro');
:comoServidor
insert into public.erros_app (mensagem, caminho) values ('teste de erro', '/x');
:comoB
select teste.ok((select count(*) from public.erros_app) = 0, 'só admin lê os erros');
:comoC
select teste.ok((select count(*) from public.erros_app) = 1, 'admin lê os erros');
reset role;
update public.orders set criado_em = now() - interval '4 days' where codigo = :'ped3';
select codigo as ped4 from public.criar_pedido(:'kit', 1, 'retirada', null, null, 'Fê', 'fe@teste.com', '52998224725', null, null, '2026-11-18') \gset
update public.orders set criado_em = now() - interval '4 days' where codigo = :'ped4';
select public.apagar_dados_vencidos();
select teste.ok((select status = 'cancelado' from public.orders where codigo = :'ped4'), 'pedido não pago em 3 dias é cancelado sozinho');

-- =========================================================================
-- 17. Painéis (Etapa 5): relatórios por período e bloqueio de afiliado
-- =========================================================================
reset role;
select teste.ok((select bool_and(enviado_em is not null) from public.order_items oi join public.orders o on o.id = oi.order_id
                 where o.codigo = :'ped1' and oi.status_entrega in ('enviado', 'entregue', 'devolvido')),
                'marcar como enviado registra a data do envio');
:comoA
select teste.ok((select (r ->> 'vendas')::int >= 1 and jsonb_array_length(r -> 'serie') = 7
                 from public.painel_loja_resumo(now() - interval '6 days', now() + interval '1 hour') r),
                'resumo da loja: vendas do período e série com um ponto por dia');
select teste.ok((select (r ->> 'vendas')::int = 0 from public.painel_loja_resumo(now() - interval '400 days', now() - interval '300 days') r),
                'período sem vendas devolve zero (estado vazio)');
select teste.ok((select count(*) from public.painel_loja_produtos(now() - interval '30 days', now())) >= 2,
                'desempenho por produto da própria loja');
:comoD
select teste.ok((select (r ->> 'vendas')::int = 0 from public.painel_loja_resumo(now() - interval '30 days', now() + interval '1 hour') r),
                'outra loja não vê as vendas da Ana');
select teste.ok((select count(*) from public.painel_loja_produtos(now() - interval '30 days', now())
                 where nome in ('Kit Banho', 'Sérum Facial')) = 0, 'outra loja não vê os produtos da Ana');
:comoAnon
select teste.bloqueia($$select public.painel_loja_resumo(now() - interval '1 day', now())$$, 'visitante não lê relatório de loja');

-- bloquear afiliado: links e checkout deixam de atribuir; ele não se afilia de novo
:comoA
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000b', true);
reset role;
select teste.ok((select count(*) from public.afiliacoes a join public.items i on i.id = a.item_id
                 join public.producers p on p.id = i.producer_id
                 where p.user_id = '00000000-0000-0000-0000-00000000000a' and a.afiliado_id = '00000000-0000-0000-0000-00000000000b'
                   and a.origem = 'catalogo' and a.status = 'aprovada') = 0,
                'afiliado bloqueado perde as afiliações de catálogo da loja');
:comoA
select teste.ok((select bloqueado from public.painel_loja_afiliados(now() - interval '30 days', now())
                 where afiliado_id = '00000000-0000-0000-0000-00000000000b'), 'loja vê o afiliado como bloqueado');
:comoB
select teste.bloqueia(format('select public.afiliar_se(%L)', :'kit'), 'afiliado bloqueado não se afilia de novo');
:comoD
select teste.ok((select count(*) from public.loja_afiliados_bloqueados) = 0, 'outra loja não vê o bloqueio da Ana');
-- o desbloqueio vale só para a loja de quem chama: o da Ana continua
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000b', false);
reset role;
select teste.ok((select count(*) from public.loja_afiliados_bloqueados) = 1, 'outra loja não desfaz o bloqueio da Ana');
:comoA
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000b', false);
:comoB
select teste.ok((select status from public.afiliar_se(:'kit')) in ('aprovada', 'pendente'), 'desbloqueado pode se afiliar de novo');

-- =========================================================================
-- 18. Painéis do afiliado e do vendedor (Etapa 5): cada um só o seu
-- =========================================================================
:comoB
select teste.ok((select count(*) from public.minhas_comissoes('afiliado', now() - interval '30 days', now() + interval '1 hour')) >= 1,
                'afiliado vê as próprias comissões');
select teste.ok((select bool_and(situacao in ('aguardando_pagamento', 'a_receber', 'repassada', 'estornada', 'cancelada'))
                 from public.minhas_comissoes('afiliado', now() - interval '30 days', now() + interval '1 hour')),
                'cada comissão tem uma situação (a receber, repassada, estornada...)');
select teste.ok((select jsonb_array_length(r -> 'serie') = 7 and r ? 'a_receber_centavos' and r ? 'repassada_centavos'
                 from public.painel_indicador('afiliado', now() - interval '6 days', now() + interval '1 hour') r),
                'painel do afiliado: cards e série de cliques × vendas');
:comoD
select teste.ok((select count(*) from public.minhas_comissoes('afiliado', now() - interval '30 days', now() + interval '1 hour')) = 0,
                'afiliado NÃO lê vendas de outro afiliado');
select teste.ok((select (r ->> 'a_receber_centavos')::int = 0 and (r ->> 'repassada_centavos')::int = 0
                 from public.painel_indicador('afiliado', now() - interval '30 days', now() + interval '1 hour') r),
                'cards de outro afiliado não somam vendas alheias');
-- B é vendedor próprio da loja da Ana: não enxerga o faturamento da loja
:comoB
select teste.ok((select (r ->> 'vendas')::int = 0 and (r ->> 'faturamento_centavos')::int = 0
                 from public.painel_loja_resumo(now() - interval '30 days', now() + interval '1 hour') r),
                'vendedor próprio NÃO lê o faturamento da loja');
select teste.ok((select count(*) from public.painel_loja_vendedores(now() - interval '30 days', now())) = 0,
                'vendedor próprio NÃO vê o ranking dos colegas');
select teste.ok((select count(*) from public.orders) = 0, 'vendedor/afiliado não lê pedidos (dados do comprador)');
-- a loja não lê dados pessoais dos afiliados
:comoA
select teste.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0,
                'loja NÃO lê o perfil (nome, documento, telefone) do afiliado');
select teste.bloqueia($$select email from auth.users$$, 'loja NÃO lê e-mails da tabela de usuários');
:comoAnon
select teste.bloqueia($$select public.minhas_comissoes('afiliado', now() - interval '1 day', now())$$, 'visitante não lê comissões');

-- =========================================================================
-- 19. KYC só pela Lytex: recebedor decide publicação, afiliação e vendas
-- =========================================================================
-- loja do Davi aprovada por conteúdo, com um produto digital completo
reset role;
update public.producers set whatsapp = '81990000000', email_contato = 'davi@teste.com', cep = '01001000',
       logradouro = 'Praça da Sé', numero = '1', bairro = 'Sé', cidade = 'São Paulo', uf = 'SP',
       status_verificacao = 'aprovado', aprovado_em = now()
 where cnpj = '12ABC34501DE35';
update public.items set descricao = 'Curso completo de fotografia.', fotos = array['00000000-0000-0000-0000-00000000000d/f.webp'],
       categoria = 'cursos_digitais', declaracao_nf = true, tipo_digital = 'curso', link_acesso = 'https://exemplo.com/curso',
       instrucoes_pos_compra = 'Acesse pelo link enviado.'
 where nome = 'Produto do Davi';
:comoD
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise' where nome = 'Produto do Davi'$$,
                      'sem recebedor na Lytex a loja não publica produto');
:comoServidor
select public.registrar_recebedor('00000000-0000-0000-0000-00000000000d', 'produtor', '12.ABC.345/01DE-35', 'mock', 'rec_d', 'em_analise', null);
:comoD
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise' where nome = 'Produto do Davi'$$,
                      'recebedor "em análise" ainda não publica');
select teste.bloqueia($$insert into public.recebedores (user_id, papel, documento, provedor, status_recebedor)
                        values ('00000000-0000-0000-0000-00000000000d', 'afiliado', '52998224725', 'mock', 'aprovado')$$,
                      'ninguém se dá status de recebedor (só o webhook da Lytex)');
:comoServidor
select teste.ok(public.aplicar_status_recebedor('mock', 'rec_d', 'aprovado', null, '12ABC34501DE35') = 'em_analise',
                'webhook muda em_analise → aprovado');
:comoD
update public.items set status_aprovacao = 'em_analise' where nome = 'Produto do Davi';
select teste.ok((select status_aprovacao from public.items where nome = 'Produto do Davi') = 'em_analise',
                'recebedor aprovado: a loja publica (vai para a análise de conteúdo)');
-- recusado: bloqueia e mostra o motivo da Lytex
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_d', 'recusado', 'Dados bancários não conferem com o titular.', null);
:comoD
select teste.ok((select status_recebedor = 'recusado' and motivo = 'Dados bancários não conferem com o titular.' from public.recebedores),
                'recusado: a loja vê o motivo informado pela Lytex');
update public.items set status_aprovacao = 'rascunho' where nome = 'Produto do Davi';
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise' where nome = 'Produto do Davi'$$,
                      'recebedor recusado bloqueia a publicação');
-- documento diferente na Lytex: bloqueia
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_d', 'aprovado', null, '11222333000181');
:comoD
select teste.bloqueia($$update public.items set status_aprovacao = 'em_analise' where nome = 'Produto do Davi'$$,
                      'CNPJ do recebedor diferente do cadastro bloqueia');

-- loja com recebedor suspenso não recebe pedido novo
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_a', 'suspenso', 'Conta em revisão.', null);
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L)',
                             :'kit', 'retirada', 'Gil', 'gil@teste.com', '52998224725', '2026-11-18'),
                      'loja com recebedor suspenso não vende');
select public.aplicar_status_recebedor('mock', 'rec_a', 'aprovado', null, '11222333000181');
-- vendedor split_direto suspenso: a venda acontece, mas sem comissão para ele
select public.aplicar_status_recebedor('mock', 'rec_b_vend', 'suspenso', 'Conta em revisão.', null);
select codigo as ped5 from public.criar_pedido(:'curso', 1, 'digital', '00000000-0000-0000-0000-00000000000b', null,
  'Gil', 'gil@teste.com', '52998224725', null, null, '2026-11-18') \gset
reset role;
select teste.ok((select o.revendedor_id is null and oi.comissao_percentual = 0 from public.orders o
                 join public.order_items oi on oi.order_id = o.id where o.codigo = :'ped5'),
                'indicação de recebedor suspenso não gera comissão (links param de gerar vendas)');
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_b_vend', 'aprovado', null, null);
-- afiliado sem recebedor aprovado não se afilia
:comoA
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000b', true);
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000b', false);
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_b', 'em_analise', null, null);
:comoB
select teste.bloqueia(format('select public.afiliar_se(%L)', :'kit'), 'afiliado sem recebedor aprovado não se afilia');
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_b', 'aprovado', null, null);

-- webhook: o mesmo evento duas vezes não é registrado de novo
insert into public.eventos_pagamento (provedor, evento_id, tipo, payload) values ('mock', 'ev_1', 'recebedor.status', '{}');
select teste.bloqueia($$insert into public.eventos_pagamento (provedor, evento_id, tipo, payload) values ('mock', 'ev_1', 'recebedor.status', '{}')$$,
                      'evento repetido do webhook não duplica (idempotência)');
:comoA
select teste.ok((select count(*) from public.eventos_pagamento) = 0, 'só o admin lê os eventos de pagamento');
:comoServidor
select teste.bloqueia($$delete from public.audit_log$$, 'nem o servidor apaga o log de auditoria');
select teste.bloqueia($$update public.audit_log set acao = 'x'$$, 'nem o servidor altera o log de auditoria');
reset role;
select teste.bloqueia($$update public.audit_log set ator_id = null, acao = 'x' where ator_id is not null$$, 'anonimizar não permite mudar o resto do registro');
update public.audit_log set ator_id = null where id = (select min(id) from public.audit_log where ator_id is not null);
select teste.ok(true, 'excluir a conta anonimiza o autor no log (LGPD), sem apagar o registro');

-- =========================================================================
-- 20. Painel admin (migração 13): denúncias, configurações, suspensão, contadores
-- =========================================================================
reset role;
select id as loja_alvo from public.producers limit 1 \gset
select id as item_alvo from public.items limit 1 \gset

-- ---------- denúncias ----------
:comoServidor
select public.denunciar('loja', :'loja_alvo', 'golpe_ou_fraude', 'A loja não entrega o que vende.', 'quem@denuncia.com', 'ip-1') as den1 \gset
select teste.ok(:'den1' is not null, 'servidor registra a denúncia (função denunciar)');
select teste.ok(public.denunciar('loja', :'loja_alvo', 'golpe_ou_fraude', 'A loja não entrega o que vende.', null, 'ip-1') = :'den1'::uuid,
                'a mesma denúncia do mesmo IP no mesmo alvo não duplica');
select teste.bloqueia(format('select public.denunciar(%L, %L, %L, %L, null, %L)', 'item', '00000000-0000-0000-0000-0000000000ff',
                             'outro', 'Descrição suficiente.', 'ip-2'), 'denúncia de alvo inexistente é recusada');
select teste.bloqueia(format('select public.denunciar(%L, %L, %L, %L, null, %L)', 'item', :'item_alvo',
                             'motivo_inventado', 'Descrição suficiente.', 'ip-2'), 'motivo fora das categorias é recusado');
select teste.bloqueia(format('select public.denunciar(%L, %L, %L, %L, null, %L)', 'item', :'item_alvo',
                             'outro', 'curta', 'ip-2'), 'descrição curta é recusada');
select teste.bloqueia(format('select public.denunciar(%L, %L, %L, %L, null, %L)', 'item', :'item_alvo',
                             'outro', repeat('x', 1001), 'ip-2'), 'descrição acima de 1000 letras é recusada');
-- limite: 5 por hora por IP
do $$
declare r record; n int := 0;
begin
  for r in select id from public.items limit 5 loop
    perform public.denunciar('item', r.id, 'produto_proibido', 'Parece produto proibido pela política.', null, 'ip-limite');
    n := n + 1;
  end loop;
  if n < 5 then raise exception 'poucos itens no teste (%)', n; end if;
end $$;
select teste.bloqueia(format('select public.denunciar(%L, %L, %L, %L, null, %L)', 'loja', :'loja_alvo',
                             'outro', 'Sexta denúncia no mesmo horário.', 'ip-limite'), 'limite de 5 denúncias por hora por IP');

:comoAnon
select teste.bloqueia($$select * from public.denuncias$$, 'anônimo não lê denúncias');
select teste.bloqueia($$insert into public.denuncias (alvo_tipo, alvo_id, motivo, descricao, ip_hash)
                        values ('loja', gen_random_uuid(), 'outro', 'Descrição suficiente.', 'x')$$, 'anônimo não insere denúncia direto na tabela');
select teste.bloqueia(format('select public.denunciar(%L, %L, %L, %L, null, %L)', 'loja', :'loja_alvo', 'outro', 'Descrição suficiente.', 'ip-3'),
                      'anônimo não chama denunciar direto (só o servidor, com o hash do IP)');
:comoA
select teste.ok((select count(*) from public.denuncias) = 0, 'usuário comum não vê denúncias (RLS)');
select teste.bloqueia($$update public.denuncias set status = 'improcedente'$$, 'usuário comum não altera denúncia');
select teste.bloqueia(format('select public.admin_decidir_denuncia(%L, %L, %L)', :'den1', 'procedente', 'Confirmado pela análise.'),
                      'não-admin não decide denúncia');
:comoC
select teste.ok((select count(*) from public.denuncias where status = 'aberta') = 6, 'admin vê as denúncias abertas');
select teste.bloqueia(format('select public.admin_decidir_denuncia(%L, %L, %L)', :'den1', 'procedente', ''), 'decidir exige nota');
select teste.bloqueia(format('select public.admin_decidir_denuncia(%L, %L, %L)', :'den1', 'aberta', 'Nota qualquer.'), 'status de decisão inválido');
select public.admin_decidir_denuncia(:'den1', 'procedente', 'Confirmado pela análise.');
select teste.ok((select status = 'procedente' and decidido_por = '00000000-0000-0000-0000-00000000000c' and decidido_em is not null
                 from public.denuncias where id = :'den1'), 'admin decide e a denúncia guarda quem e quando');
select teste.ok((select detalhes #>> '{antes,status}' = 'aberta' and detalhes #>> '{depois,status}' = 'procedente'
                 from public.audit_log where entidade = 'denuncia' and entidade_id = :'den1'),
                'decisão da denúncia grava o log com antes e depois');
select teste.bloqueia(format('select public.admin_decidir_denuncia(%L, %L, %L)', :'den1', 'improcedente', 'Mudei de ideia.'),
                      'denúncia decidida não é decidida de novo');

-- ---------- configurações ----------
:comoA
select teste.ok((select count(*) from public.configuracoes) = 0, 'usuário comum não lê as configurações');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"prazo_nf_dias": 3}')$$, 'não-admin não altera configuração');
select teste.bloqueia($$update public.configuracoes set valor = '1'$$, 'não-admin não altera a tabela de configurações');
:comoAnon
select teste.ok(public.configuracoes_publicas() ? 'meios_pagamento' and not (public.configuracoes_publicas() ? 'taxa_staypse_percentual')
                and not (public.configuracoes_publicas() ? 'palavras_proibidas'),
                'leitura pública traz só chaves não sensíveis (sem taxa nem palavras proibidas)');
:comoC
select teste.ok((select count(*) from public.configuracoes) = 6, 'admin lê as 6 configurações');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"comissao_min_percentual": 80}')$$, 'mínimo maior que o máximo salvo é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"comissao_min_percentual": 40, "comissao_max_percentual": 30}')$$, 'faixa incoerente (min > max) é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_staypse_percentual": 101}')$$, 'taxa acima de 100 é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_staypse_percentual": -1}')$$, 'taxa negativa é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_staypse_percentual": "cinco"}')$$, 'taxa que não é número é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"prazo_nf_dias": 0}')$$, 'prazo de nota fiscal zero é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"prazo_nf_dias": 2.5}')$$, 'prazo de nota fiscal fracionado é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"meios_pagamento": {"pix": true}}')$$, 'meios de pagamento incompletos são recusados');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"meios_pagamento": {"pix": "sim", "cartao": true, "boleto": false}}')$$, 'meio de pagamento não booleano é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"palavras_proibidas": ["a"]}')$$, 'palavra proibida curta demais é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"chave_inventada": 1}')$$, 'chave desconhecida é recusada');
select teste.ok((select valor = '5' from public.configuracoes where chave = 'taxa_staypse_percentual'), 'config recusada não altera nada');
select public.admin_salvar_configuracoes('{"taxa_staypse_percentual": 7.5, "comissao_min_percentual": 15, "comissao_max_percentual": 60,
                                           "prazo_nf_dias": 3, "meios_pagamento": {"pix": true, "cartao": false, "boleto": true},
                                           "palavras_proibidas": ["Palavra Nova", "outra coisa"]}');
select teste.ok((select valor = '7.5' from public.configuracoes where chave = 'taxa_staypse_percentual')
                and (select valor = '3' from public.configuracoes where chave = 'prazo_nf_dias')
                and (select valor -> 'cartao' = 'false' from public.configuracoes where chave = 'meios_pagamento'),
                'configuração válida é salva');
select teste.ok((select detalhes -> 'antes' = '5' and detalhes -> 'depois' = '7.5'
                 from public.audit_log where entidade = 'configuracao' and detalhes ->> 'chave' = 'taxa_staypse_percentual'),
                'alterar configuração grava o log com antes e depois');
select teste.ok((select count(*) from public.audit_log where acao = 'configuracao_alterada') = 6, 'uma entrada no log por chave alterada');
select public.admin_salvar_configuracoes('{"prazo_nf_dias": 3}');
select teste.ok((select count(*) from public.audit_log where acao = 'configuracao_alterada') = 6, 'salvar sem mudança não polui o log');
select teste.ok((select array_agg(termo order by termo) from public.palavras_proibidas) = array['outra coisa', 'palavra nova'],
                'a lista de palavras proibidas da configuração vira a lista usada na análise de itens');
reset role;
select teste.bloqueia($$update public.configuracoes set valor = '101' where chave = 'taxa_staypse_percentual'$$,
                      'nem o banco aceita valor fora da faixa (restrição da tabela)');
select teste.bloqueia($$update public.audit_log set acao = 'x' where entidade = 'configuracao'$$, 'o log das configurações é imutável');

-- ---------- usuários: suspensão ----------
:comoA
select teste.bloqueia(format('select public.admin_suspender_usuario(%L, true, %L)', '00000000-0000-0000-0000-00000000000b', 'Spam nas vitrines.'),
                      'não-admin não suspende');
select teste.bloqueia($$select * from public.admin_listar_usuarios('bia')$$, 'não-admin não lista usuários');
:comoC
select teste.bloqueia(format('select public.admin_suspender_usuario(%L, true, %L)', '00000000-0000-0000-0000-00000000000b', ''), 'suspender exige motivo');
select teste.bloqueia(format('select public.admin_suspender_usuario(%L, true, %L)', '00000000-0000-0000-0000-00000000000b', 'abc'), 'motivo curto demais');
select teste.bloqueia(format('select public.admin_suspender_usuario(%L, true, %L)', '00000000-0000-0000-0000-00000000000c', 'Teste em mim mesmo.'), 'admin não suspende a si');
select teste.bloqueia(format('select public.admin_suspender_usuario(%L, false, %L)', '00000000-0000-0000-0000-00000000000b', 'Já estava ativo.'), 'reativar quem não está suspenso é recusado');
select teste.ok((select count(*) from public.admin_listar_usuarios('bia')) = 1
                and (select email from public.admin_listar_usuarios('bia@teste')) = 'bia@teste.com'
                and (select count(*) from public.admin_listar_usuarios(null, 2, 0)) = 2
                and (select total from public.admin_listar_usuarios(null, 2, 0) limit 1) >= 4,
                'admin busca por nome ou e-mail e pagina');
select public.admin_suspender_usuario('00000000-0000-0000-0000-00000000000b', true, 'Spam nas vitrines.');
select teste.ok((select suspenso_em is not null and suspenso_motivo = 'Spam nas vitrines.' and suspenso_por = '00000000-0000-0000-0000-00000000000c'
                 from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'suspensão guarda motivo, quem e quando');
select teste.ok((select detalhes #>> '{antes,suspenso}' = 'false' and detalhes #>> '{depois,suspenso}' = 'true' and detalhes ->> 'motivo' = 'Spam nas vitrines.'
                 from public.audit_log where acao = 'usuario_suspenso' and entidade = 'usuario'
                   and entidade_id = '00000000-0000-0000-0000-00000000000b'),
                'suspensão grava o log com antes, depois e motivo');
select teste.bloqueia(format('select public.admin_suspender_usuario(%L, true, %L)', '00000000-0000-0000-0000-00000000000b', 'De novo.'), 'não suspende quem já está suspenso');
:comoB
select teste.ok((select suspenso_em is not null from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
                'o usuário suspenso vê a própria suspensão (o site bloqueia os painéis)');
select teste.bloqueia($$update public.profiles set suspenso_em = null, suspenso_motivo = null where id = '00000000-0000-0000-0000-00000000000b'$$,
                      'usuário não se reativa sozinho');
:comoC
select public.admin_suspender_usuario('00000000-0000-0000-0000-00000000000b', false, 'Recurso aceito.');
select teste.ok((select suspenso_em is null and suspenso_motivo is null from public.profiles where id = '00000000-0000-0000-0000-00000000000b')
                and (select detalhes #>> '{depois,suspenso}' = 'false' from public.audit_log where acao = 'usuario_reativado'
                     and entidade_id = '00000000-0000-0000-0000-00000000000b'),
                'reativação limpa a suspensão e grava o log');

-- ---------- contadores, lista de espera e log (só admin) ----------
:comoA
select teste.bloqueia($$select public.admin_contadores()$$, 'não-admin não vê os contadores');
select teste.bloqueia($$select public.admin_lista_espera_resumo(now() - interval '7 days', now())$$, 'não-admin não vê o resumo da lista de espera');
select teste.bloqueia($$select public.admin_acoes_auditoria()$$, 'não-admin não lista ações do log');
select teste.ok((select count(*) from public.audit_log) = 0, 'não-admin não lê o log de auditoria');
:comoC
select teste.ok((public.admin_contadores() ->> 'denuncias_abertas')::int = 5 and public.admin_contadores() ? 'pedidos_sem_nf'
                and (public.admin_contadores() ->> 'prazo_nf_dias')::int = 3, 'contadores do admin (denúncias abertas, prazo de NF vindo da configuração)');
select teste.ok(jsonb_array_length(public.admin_lista_espera_resumo(now() - interval '6 days', now()) -> 'por_dia') >= 6
                and (public.admin_lista_espera_resumo(now() - interval '6 days', now()) ->> 'total')::int >= 1,
                'resumo da lista de espera traz o crescimento por dia');
select teste.ok('usuario_suspenso' in (select public.admin_acoes_auditoria()), 'admin lista as ações do log para filtrar');
:comoServidor
select teste.bloqueia($$delete from public.audit_log where entidade in ('configuracao', 'usuario', 'denuncia')$$, 'o log continua imutável para o servidor');
reset role;

-- pedido pago há mais que o prazo e sem nota fiscal entra na fila
update public.orders set status = 'pago', pago_em = now() - interval '10 days'
where id = (select order_id from public.order_items where nota_fiscal_numero is null limit 1);
:comoC
select teste.ok((public.admin_contadores() ->> 'pedidos_sem_nf')::int >= 1
                and (select count(*) from public.admin_pedidos_sem_nf()) >= 1, 'pedido pago há mais de X dias sem nota fiscal aparece na fila');
reset role;

-- =========================================================================
-- 21. Afiliação (migração 14): automática ou manual, convite por produto,
--     materiais de divulgação e catálogo por mais vendidos
-- =========================================================================
-- afiliada nova (Fabi): não é vendedora própria da loja da Ana, então a afiliação segue a regra de cada produto
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000f', 'fabi@teste.com',
   '{"nome":"Fabi Afiliada","papeis":["revendedor"],"termos_versao":"2026-11-16"}');
\set comoF 'reset role; select set_config(''request.jwt.claims'', ''{"sub":"00000000-0000-0000-0000-00000000000f"}'', false); set role authenticated;'
insert into public.storefronts (revendedor_id, slug, nicho) values ('00000000-0000-0000-0000-00000000000f', 'loja-da-fabi', 'beleza');
:comoServidor
select public.registrar_recebedor('00000000-0000-0000-0000-00000000000f', 'afiliado', '111.444.777-35', 'mock', 'rec_f', 'em_analise', null);
select public.aplicar_status_recebedor('mock', 'rec_f', 'aprovado', null, null);
reset role;

-- três itens digitais novos da Ana (um automático e dois manuais)
:comoA
insert into public.items (producer_id, nome, descricao, preco_centavos, tipo, comissao_percentual, categoria,
                          fotos, tipo_digital, declaracao_nf, link_acesso, instrucoes_pos_compra, aprovacao_afiliacao, status_aprovacao)
  select id, n.nome, 'Material completo em PDF.', 5000, 'digital', 30, 'cursos_digitais',
         array['00000000-0000-0000-0000-00000000000a/aff.webp'], 'ebook', true, 'https://aff.exemplo.com/x',
         'Acesso por e-mail em até 24h.', n.regra, 'em_analise'
  from public.producers, (values ('Aff Auto', 'automatica'), ('Aff Manual', 'manual'), ('Aff Outro', 'manual')) as n (nome, regra)
  where user_id = '00000000-0000-0000-0000-00000000000a';
:comoC
select public.admin_decidir_item(id, true) from public.items where nome in ('Aff Auto', 'Aff Manual', 'Aff Outro');
reset role;
select id as aff_auto from public.items where nome = 'Aff Auto' \gset
select id as aff_manual from public.items where nome = 'Aff Manual' \gset
select id as aff_outro from public.items where nome = 'Aff Outro' \gset

-- afiliação automática ou manual por produto
:comoF
select teste.ok((select status from public.afiliar_se(:'aff_auto')) = 'aprovada', 'produto com afiliação automática aprova na hora');
select teste.ok((select status from public.afiliar_se(:'aff_manual')) = 'pendente', 'produto com afiliação manual fica pendente');
select teste.ok((select count(*) from public.afiliacoes where item_id = :'aff_auto' and status = 'aprovada' and decidido_em is not null) = 1,
                'afiliação automática registra a data da decisão');
delete from public.afiliacoes where item_id = :'aff_auto';
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_f', 'em_analise', null, null);
:comoF
select teste.bloqueia(format('select public.afiliar_se(%L)', :'aff_auto'), 'sem recebedor aprovado continua bloqueado mesmo com afiliação automática');
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_f', 'aprovado', null, null);

-- convite por produto: quem pode gerar
:comoD
select teste.bloqueia(format('select public.criar_convite_afiliacao(%L)', :'aff_outro'), 'quem não é dono do item não gera convite');
:comoF
select teste.bloqueia(format('select public.criar_convite_afiliacao(%L)', :'aff_outro'), 'afiliado não gera convite');
:comoAnon
select teste.bloqueia(format('select public.criar_convite_afiliacao(%L)', :'aff_outro'), 'visitante não gera convite');
select teste.bloqueia($$select * from public.convites_afiliacao$$, 'visitante não lê a tabela de convites');
:comoA
select teste.bloqueia($$select * from public.convites_afiliacao$$, 'nem a loja lê a tabela de convites direto (só pelas funções)');
select teste.bloqueia(format('select public.criar_convite_afiliacao(%L, 0)', :'aff_outro'), 'validade do convite precisa ser de 1 a 90 dias');
select public.criar_convite_afiliacao(:'aff_manual') as tok_manual \gset
select public.criar_convite_afiliacao(:'aff_outro') as tok_outro \gset
select public.criar_convite_afiliacao(:'aff_outro') as tok_expira \gset
select public.criar_convite_afiliacao(:'aff_outro') as tok_revoga \gset
select teste.ok(:'tok_manual' ~ '^[0-9a-f]{64}$', 'convite devolve um código aleatório de 64 caracteres');
reset role;
select teste.ok((select count(*) from public.convites_afiliacao where token_hash = :'tok_manual') = 0
                and (select count(*) from public.convites_afiliacao where token_hash = encode(sha256(convert_to(:'tok_manual', 'UTF8')), 'hex')) = 1,
                'no banco fica só o hash sha256 do código');
select teste.ok((select expira_em between now() + interval '29 days' and now() + interval '31 days'
                 from public.convites_afiliacao where token_hash = encode(sha256(convert_to(:'tok_manual', 'UTF8')), 'hex')),
                'convite vale por 30 dias');
update public.convites_afiliacao set expira_em = now() - interval '1 minute'
  where token_hash = encode(sha256(convert_to(:'tok_expira', 'UTF8')), 'hex');
:comoA
select teste.ok((select count(*) from public.meus_convites_afiliacao() where situacao = 'ativo') = 3
                and (select count(*) from public.meus_convites_afiliacao() where situacao = 'expirado') = 1,
                'a loja lista os convites e a situação de cada um');
reset role;
select id as id_revoga from public.convites_afiliacao where token_hash = encode(sha256(convert_to(:'tok_revoga', 'UTF8')), 'hex') \gset
:comoA
select public.revogar_convite_afiliacao(:'id_revoga');
select teste.ok((select count(*) from public.meus_convites_afiliacao() where situacao = 'revogado') = 1, 'a loja revoga um convite');
:comoD
select teste.ok((select count(*) from public.meus_convites_afiliacao()) = 0, 'outra loja não vê os convites da Ana');
:comoAnon
select teste.ok((select situacao = 'ativo' and item_nome = 'Aff Manual' from public.ver_convite_afiliacao(:'tok_manual')), 'o link mostra o produto antes de aceitar');
select teste.ok((select count(*) from public.ver_convite_afiliacao('codigo-que-nao-existe')) = 0, 'código inexistente não mostra nada');
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_manual'), 'visitante sem login não aceita convite');

-- convite inválido: expirado, inexistente, revogado
:comoF
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_expira'), 'convite expirado não afilia');
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', 'codigo-que-nao-existe'), 'convite inexistente não afilia');
:comoF
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_revoga'), 'convite revogado não afilia');
select teste.ok((select count(*) from public.afiliacoes where item_id = :'aff_outro') = 0, 'convite recusado não deixa afiliação para trás');
-- convite de um produto não vale para outro produto
select status as st_outro from public.afiliar_por_convite(:'tok_outro') \gset
select teste.ok(:'st_outro' = 'aprovada'
                and (select count(*) from public.afiliacoes where item_id = :'aff_outro' and status = 'aprovada') = 1
                and (select count(*) from public.afiliacoes where item_id = :'aff_manual' and status = 'aprovada') = 0
                and (select count(*) from public.afiliacoes where item_id = :'aff_auto') = 0,
                'convite aprova só o produto do convite (não vale para outro produto)');

-- convite válido aprova, mesmo em produto manual (e quem estava pendente vira aprovado)
select teste.ok((select status from public.afiliacoes where item_id = :'aff_manual' and afiliado_id = '00000000-0000-0000-0000-00000000000f') = 'pendente',
                'antes do convite, a afiliação manual está pendente');
select status as st_manual from public.afiliar_por_convite(:'tok_manual') \gset
select teste.ok(:'st_manual' = 'aprovada'
                and (select status from public.afiliacoes where item_id = :'aff_manual' and afiliado_id = '00000000-0000-0000-0000-00000000000f') = 'aprovada',
                'convite válido aprova na hora, mesmo em produto de aprovação manual');
select teste.ok((select status from public.afiliar_por_convite(:'tok_manual')) = 'aprovada', 'a mesma pessoa abrir o link de novo não dá erro');
:comoD
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_manual'), 'convite de uso único: outra pessoa não reaproveita');
:comoAnon
select teste.ok((select situacao = 'usado' from public.ver_convite_afiliacao(:'tok_manual')), 'o link usado aparece como já usado');

-- afiliado bloqueado pela loja não entra nem por convite; sem recebedor também não
:comoA
select public.criar_convite_afiliacao(:'aff_auto') as tok_bloq \gset
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000f', true);
:comoF
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_bloq'), 'afiliado bloqueado pela loja não entra nem por convite');
:comoA
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000f', false);
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_f', 'em_analise', null, null);
:comoF
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_bloq'), 'sem recebedor aprovado o convite não afilia');
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_f', 'aprovado', null, null);
:comoA
select teste.bloqueia(format('select * from public.afiliar_por_convite(%L)', :'tok_bloq'), 'a dona da loja não se afilia ao próprio produto por convite');
:comoF
select teste.ok((select status from public.afiliar_por_convite(:'tok_bloq')) = 'aprovada', 'recebedor aprovado e sem bloqueio: o convite funciona');

-- materiais de divulgação
:comoA
update public.items set texto_divulgacao = 'Conheça o Aff Auto! Link na bio.', regras_divulgacao = 'Não use a marca no Google Ads.'
  where id = :'aff_auto';
select teste.ok((select status_aprovacao from public.items where id = :'aff_auto') = 'aprovado', 'mudar texto e regras de divulgação não pede nova análise');
select teste.bloqueia(format('update public.items set texto_divulgacao = repeat(%L, 1001) where id = %L', 'x', :'aff_auto'), 'texto de divulgação com mais de 1000 caracteres é recusado');
select teste.bloqueia(format('update public.items set regras_divulgacao = repeat(%L, 1001) where id = %L', 'x', :'aff_auto'), 'regras de divulgação com mais de 1000 caracteres são recusadas');
select teste.ok((select texto_divulgacao is not null from public.itens_privados() where id = :'aff_auto'), 'a loja lê o texto de divulgação do próprio item');
:comoD
select teste.ok(teste.linhas(format('update public.items set texto_divulgacao = %L where id = %L', 'invadido', :'aff_auto')) = 0,
                'outra loja não altera o texto de divulgação');
:comoAnon
select teste.bloqueia($$select texto_divulgacao from public.items$$, 'visitante não lê o texto de divulgação (coluna privada)');
select teste.bloqueia($$select * from public.catalogo_afiliados()$$, 'visitante não abre o catálogo de afiliados');
:comoF
select teste.ok((select texto_divulgacao = 'Conheça o Aff Auto! Link na bio.' and regras_divulgacao = 'Não use a marca no Google Ads.'
                 from public.catalogo_afiliados() where id = :'aff_auto'), 'o afiliado lê o texto e as regras no catálogo');
select teste.bloqueia($$select texto_divulgacao from public.items$$, 'o afiliado não lê a coluna direto na tabela');
:comoA
update public.items set texto_divulgacao = 'Uma Palavra Nova para divulgar!' where id = :'aff_auto';
select teste.ok((select alerta_palavras @> array['palavra nova'] from public.itens_privados() where id = :'aff_auto'), 'texto de divulgação entra no alerta de palavras proibidas');
update public.items set texto_divulgacao = 'Conheça o Aff Auto! Link na bio.' where id = :'aff_auto';

-- catálogo: mais vendidos nos últimos 7 dias; só a ordem, sem números
reset role;
update public.orders set pago_em = now() - interval '30 days' where status = 'pago';
update public.orders set status = 'pago', pago_em = now() - interval '1 day'
  where id in (select order_id from public.order_items where item_id = :'kit');
:comoF
-- pedidos pagos, mas com os itens cancelados ou devolvidos: não contam no ranking
select teste.ok((select nome from public.catalogo_afiliados('vendidos') limit 1) <> 'Kit Banho', 'venda cancelada ou devolvida não conta no ranking');
reset role;
update public.order_items set status_entrega = 'entregue' where item_id = :'kit';
:comoF
select teste.ok((select nome from public.catalogo_afiliados('vendidos') limit 1) = 'Kit Banho', 'mais vendidos (7 dias): o item com mais vendas recentes vem primeiro');
select teste.ok((select nome from public.catalogo_afiliados() limit 1) <> 'Kit Banho', 'a ordem padrão continua a dos mais recentes');
select teste.ok((select count(*) from public.catalogo_afiliados('vendidos')) = (select count(*) from public.catalogo_afiliados()),
                'ordenar por vendidos não esconde nenhum produto');
select teste.ok((select count(*) from information_schema.parameters p
                 where p.specific_name like 'catalogo_afiliados%' and p.parameter_mode = 'OUT'
                   and p.parameter_name ~ '(vend|qtd|quant|total|venda)') = 0,
                'o catálogo não devolve nenhum número de venda');
reset role;
update public.orders set pago_em = now() - interval '8 days' where status = 'pago';
:comoF
select teste.ok((select nome from public.catalogo_afiliados('vendidos') limit 1) = (select nome from public.catalogo_afiliados() limit 1),
                'venda com mais de 7 dias não conta no ranking');

-- =========================================================================
-- 9. RLS ligado em TODAS as tabelas
-- =========================================================================
reset role;
select teste.ok(not exists (select 1 from pg_tables
                            where schemaname = 'public' and not rowsecurity),
                'RLS ativo em todas as tabelas do schema public');

\o
\echo '>>> TODOS OS TESTES PASSARAM'
