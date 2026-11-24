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

-- admin só é criado direto no banco (SQL Editor), e só para o e-mail configurado (admin único)
select public.definir_admin_email('Caio@Teste.com');
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
select teste.bloqueia($$insert into public.waitlist (email, interesse) values ('visitante@teste.com', 'afiliado')$$,
                      'visitante não grava direto na lista de espera');
:comoServidor
select public.inscrever_na_lista(
  '{"email":"visitante@teste.com","nome":"Visitante","interesse":"afiliado","whatsapp":"11987654321",
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
\set REV '{"interesse":"afiliado","whatsapp":"81998765432","cidade":"Recife","uf":"PE","nichos":["beleza","moda"],"consentimento_versao":"2026-11-16"'
\set PROD '{"interesse":"loja","whatsapp":"1133334444","empresa":"Doces da Vó","tipo_produto":"fisico","o_que_vende":"Doces caseiros","consentimento_versao":"2026-11-16"'

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
insert into codigos select 'rita', codigo from public.inscrever_na_lista((:'REV' || ',"email":"Rita@Teste.com ","nome":"Rita"}')::jsonb, 'ip-rita');
select teste.ok((select email from public.waitlist where nome = 'Rita') = 'rita@teste.com', 'e-mail salvo em minúsculas e sem espaços');
select teste.ok((select codigo ~ '^[0-9a-f]{8}$' from codigos where quem = 'rita'), 'inscrito recebe código de indicação de 8 caracteres');
select teste.ok((select consentimento_versao = '2026-11-16' and consentimento_em is not null
                 from public.waitlist where nome = 'Rita'), 'consentimento gravado com data e versão');

-- validações
select teste.inscricao_recusada((:'REV' || ',"email":"x1@teste.com","nome":"Xis"}')::jsonb || '{"consentimento_versao":""}', 'ip-x',
                                'sem consentimento LGPD não inscreve');
select teste.inscricao_recusada((:'REV' || ',"email":"x2@teste.com","nome":"Xis"}')::jsonb || '{"nichos":[]}', 'ip-x',
                                'afiliado sem nicho não inscreve');
select teste.inscricao_recusada((:'REV' || ',"email":"x3@teste.com","nome":"Xis"}')::jsonb || '{"nichos":["armas"]}', 'ip-x',
                                'nicho fora da lista recusado');
select teste.inscricao_recusada((:'REV' || ',"email":"x4@teste.com","nome":"Xis"}')::jsonb || '{"whatsapp":"123"}', 'ip-x',
                                'WhatsApp inválido recusado');
select teste.inscricao_recusada((:'PROD' || ',"email":"x5@teste.com","nome":"Xis"}')::jsonb || '{"empresa":""}', 'ip-x',
                                'loja sem empresa não inscreve');
select teste.inscricao_recusada((:'PROD' || ',"email":"x6@teste.com","nome":"Xis"}')::jsonb || '{"cnpj":"11222333000182"}', 'ip-x',
                                'CNPJ informado precisa ser válido');
-- e-mail repetido: não cria outra linha e devolve o código existente (sem dados de ninguém)
select teste.ok((select not novo and not reenviar and codigo = (select codigo from codigos where quem = 'rita')
                 from public.inscrever_na_lista((:'REV' || ',"email":"RITA@teste.com","nome":"Rita Dois"}')::jsonb, 'ip-x')),
                'e-mail repetido não inscreve de novo (devolve o código existente; reenvio só após 10 min)');
select teste.ok((select count(*) from public.waitlist where email = 'rita@teste.com') = 1, 'e-mail repetido não cria outra linha');
insert into codigos select 'doces', codigo from public.inscrever_na_lista((:'PROD' || ',"email":"doces@teste.com","nome":"Dona Ana"}')::jsonb, 'ip-doces');
select teste.ok(true, 'loja sem CNPJ inscreve (CNPJ opcional nesta fase)');

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
                'fila separada por perfil: 6 afiliados');
select teste.ok((select posicao = 1 and total = 1 and interesse = 'loja'
                 from public.posicao_na_lista((select codigo from codigos where quem = 'doces'))),
                'loja tem a própria fila');
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
                'admin marca loja como contatada');
select teste.bloqueia($$update public.waitlist set status_contato = 'vip' where email = 'doces@teste.com'$$,
                      'status de contato fora da lista recusado');
select teste.bloqueia($$update public.waitlist set email = 'outro@teste.com' where email = 'doces@teste.com'$$,
                      'admin não altera e-mail do inscrito pelo site');
select teste.ok((select indicacoes from public.waitlist_com_indicacoes where nome = 'Rita') = 2,
                'admin vê o número de indicações válidas');


-- =========================================================================
-- 10b. Lista de espera: os 4 perfis do pré-lançamento (Etapa 6)
-- =========================================================================
-- Perfis: loja | vendedor | afiliado | comprador. Os antigos (produtor,
-- revendedor) são convertidos pela migração 20261202000001.
reset role;

-- a tradução dos perfis antigos
select teste.ok(public.perfil_lista_novo('revendedor') = 'afiliado'
                and public.perfil_lista_novo('produtor') = 'loja'
                and public.perfil_lista_novo('comprador') = 'comprador',
                'tradução dos perfis antigos: revendedor→afiliado, produtor→loja, comprador igual');

-- inscrições ANTIGAS são preservadas e convertidas (simula o banco de antes da migração)
alter table public.waitlist drop constraint waitlist_interesse_check;
alter table public.waitlist drop constraint waitlist_campos_obrigatorios;
insert into public.waitlist (email, nome, interesse, whatsapp, cidade, uf, nichos, consentimento_versao)
  values ('antigo.rev@teste.com', 'Antigo Rev', 'revendedor', '81998765432', 'Recife', 'PE', '{beleza}', '2026-11-16');
insert into public.waitlist (email, nome, interesse, whatsapp, empresa, tipo_produto, o_que_vende, consentimento_versao)
  values ('antigo.prod@teste.com', 'Antigo Prod', 'produtor', '1133334444', 'Fábrica Antiga', 'fisico', 'Móveis', '2026-11-16');
insert into public.waitlist (email, nome, interesse) values ('antigo.comp@teste.com', 'Antigo Comp', 'comprador');
update public.waitlist set interesse = public.perfil_lista_novo(interesse) where interesse in ('revendedor', 'produtor');
alter table public.waitlist add constraint waitlist_interesse_check
  check (interesse in ('loja', 'vendedor', 'afiliado', 'comprador'));
select teste.ok((select interesse from public.waitlist where email = 'antigo.rev@teste.com') = 'afiliado'
                and (select interesse from public.waitlist where email = 'antigo.prod@teste.com') = 'loja'
                and (select interesse from public.waitlist where email = 'antigo.comp@teste.com') = 'comprador',
                'inscrições antigas migradas para os perfis novos');
select teste.ok((select empresa = 'Fábrica Antiga' and whatsapp = '1133334444' from public.waitlist where email = 'antigo.prod@teste.com')
                and (select cidade = 'Recife' and nichos = '{beleza}' from public.waitlist where email = 'antigo.rev@teste.com'),
                'migração preserva os dados das inscrições antigas');
select teste.ok(not exists (select 1 from public.waitlist where interesse in ('revendedor', 'produtor')),
                'nenhum perfil antigo sobra no banco');
-- as linhas de teste antigas saem de cena para não alterar as contagens das filas
delete from public.waitlist where email like 'antigo.%@teste.com';
-- o constraint de campos obrigatórios volta, como na migração
alter table public.waitlist add constraint waitlist_campos_obrigatorios check (
  consentimento_versao is not null
  and nome is not null and char_length(nome) >= 2
  and (interesse in ('vendedor', 'comprador') or whatsapp is not null)
  and (interesse <> 'afiliado'
       or (cidade is not null and uf is not null and cardinality(nichos) >= 1))
  and (interesse <> 'loja'
       or (empresa is not null and tipo_produto is not null and o_que_vende is not null))
  and (interesse <> 'vendedor' or empresa is not null)
) not valid;

-- o constraint aceita os 4 perfis e rejeita qualquer outro
select teste.bloqueia($$insert into public.waitlist (email, nome, interesse, whatsapp, consentimento_versao)
                        values ('p1@teste.com', 'Perfil Um', 'revendedor', '81998765432', 'v')$$, 'perfil antigo "revendedor" é rejeitado');
select teste.bloqueia($$insert into public.waitlist (email, nome, interesse, whatsapp, consentimento_versao)
                        values ('p2@teste.com', 'Perfil Dois', 'produtor', '81998765432', 'v')$$, 'perfil antigo "produtor" é rejeitado');
select teste.bloqueia($$insert into public.waitlist (email, nome, interesse, whatsapp, consentimento_versao)
                        values ('p3@teste.com', 'Perfil Três', 'admin', '81998765432', 'v')$$, 'perfil inventado é rejeitado');
select teste.ok(teste.linhas($$insert into public.waitlist (email, nome, interesse, whatsapp, empresa, tipo_produto, o_que_vende, consentimento_versao)
                              values ('ok-loja@teste.com', 'Ok Loja', 'loja', '1133334444', 'Loja X', 'digital', 'Cursos', 'v')$$) = 1, 'constraint aceita "loja"');
select teste.ok(teste.linhas($$insert into public.waitlist (email, nome, interesse, empresa, consentimento_versao)
                              values ('ok-vend@teste.com', 'Ok Vendedor', 'vendedor', 'Loja X', 'v')$$) = 1, 'constraint aceita "vendedor"');
select teste.ok(teste.linhas($$insert into public.waitlist (email, nome, interesse, whatsapp, cidade, uf, nichos, consentimento_versao)
                              values ('ok-afil@teste.com', 'Ok Afiliado', 'afiliado', '81998765432', 'Recife', 'PE', '{moda}', 'v')$$) = 1, 'constraint aceita "afiliado"');
select teste.ok(teste.linhas($$insert into public.waitlist (email, nome, interesse, consentimento_versao)
                              values ('ok-comp@teste.com', 'Ok Comprador', 'comprador', 'v')$$) = 1, 'constraint aceita "comprador"');
delete from public.waitlist where email like 'ok-%@teste.com';

-- regras por perfil, pela função de inscrição (o caminho real do site)
:comoServidor
select teste.inscricao_recusada('{"interesse":"vendedor","email":"v1@teste.com","nome":"Vendedor Um","consentimento_versao":"v"}', 'ip-perfis',
                                'vendedor sem a loja onde trabalha não inscreve');
select teste.inscricao_recusada('{"interesse":"loja","email":"l1@teste.com","nome":"Loja Um","empresa":"X Ltda","tipo_produto":"fisico","o_que_vende":"Doces","consentimento_versao":"v"}', 'ip-perfis',
                                'loja sem WhatsApp não inscreve');
select teste.inscricao_recusada('{"interesse":"revendedor","email":"r1@teste.com","nome":"Antigo Perfil","whatsapp":"81998765432","cidade":"Recife","uf":"PE","nichos":["moda"],"consentimento_versao":"v"}', 'ip-perfis',
                                'perfil antigo "revendedor" não inscreve pela função');
select teste.inscricao_recusada('{"interesse":"produtor","email":"p4@teste.com","nome":"Antigo Perfil","whatsapp":"1133334444","empresa":"X","tipo_produto":"fisico","o_que_vende":"Doces","consentimento_versao":"v"}', 'ip-perfis',
                                'perfil antigo "produtor" não inscreve pela função');
create temp table codigos2 (quem text, codigo text, novo boolean, reenviar boolean);
grant all on codigos2 to anon, authenticated, service_role;
insert into codigos2 select 'vend', * from public.inscrever_na_lista('{"interesse":"vendedor","email":"vend@teste.com","nome":"Vera Vendedora","empresa":"Loja da Esquina","consentimento_versao":"v"}', 'ip-perfis');
insert into codigos2 select 'comp', * from public.inscrever_na_lista('{"interesse":"comprador","email":"comp@teste.com","nome":"Caio Comprador","consentimento_versao":"v"}', 'ip-perfis');
select teste.ok((select novo and reenviar from codigos2 where quem = 'vend') and (select novo from codigos2 where quem = 'comp'),
                'vendedor (sem WhatsApp) e comprador (só nome e e-mail) inscrevem');
select teste.ok((select empresa = 'Loja da Esquina' and whatsapp is null from public.waitlist where email = 'vend@teste.com'),
                'vendedor grava a loja onde trabalha');

-- e-mail repetido: devolve o mesmo código; reenvio liberado só depois de 10 minutos
select teste.ok((select not novo and not reenviar and codigo = (select codigo from codigos2 where quem = 'comp')
                 from public.inscrever_na_lista('{"interesse":"comprador","email":"comp@teste.com","nome":"Outro Nome","consentimento_versao":"v"}', 'ip-outro')),
                'repetido logo depois: mesmo código, sem novo envio');
reset role;
update public.waitlist set ultimo_envio_em = now() - interval '11 minutes' where email = 'comp@teste.com';
:comoServidor
select teste.ok((select not novo and reenviar from public.inscrever_na_lista('{"interesse":"comprador","email":"comp@teste.com","nome":"Outro Nome","consentimento_versao":"v"}', 'ip-outro')),
                'repetido depois de 10 minutos: libera o reenvio do link');
select teste.ok((select count(*) from public.waitlist where email = 'comp@teste.com') = 1, 'repetido nunca cria segunda inscrição');
select teste.ok((select nome = 'Caio Comprador' from public.waitlist where email = 'comp@teste.com'), 'repetido não altera os dados de quem já estava na lista');

-- filas separadas e admin
:comoAnon
select teste.ok((select posicao = 1 and total = 1 and interesse = 'vendedor'
                 from public.posicao_na_lista((select codigo from codigos2 where quem = 'vend'))),
                'vendedor de loja tem a própria fila');
:comoC
select teste.ok((select (r ->> 'total')::int > 0 and r -> 'por_dia' -> 0 ? 'vendedor' and r -> 'por_dia' -> 0 ? 'afiliado'
                 from (select public.admin_lista_espera_resumo(now() - interval '1 day', now() + interval '1 day') as r) x),
                'resumo do admin usa os perfis novos (loja, vendedor, afiliado, comprador)');
select teste.ok((select count(*) = 1 from jsonb_array_elements(public.admin_lista_espera_resumo(now() - interval '1 day', now() + interval '1 day') -> 'por_perfil') e
                 where e ->> 'perfil' = 'vendedor'), 'resumo por perfil lista o vendedor');
reset role;
delete from public.waitlist where email in ('vend@teste.com', 'comp@teste.com');

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
  'Duda', 'duda@teste.com', '11144477735', null, null, '2026-11-18') \gset
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
-- registros de acesso (Marco Civil, art. 15): só o servidor grava, só admin lê, 6 meses
:comoAnon
select teste.bloqueia($$insert into public.registros_acesso (evento, ip) values ('login', '203.0.113.9')$$, 'visitante não grava registro de acesso');
:comoServidor
insert into public.registros_acesso (evento, ip) values ('login', '203.0.113.9');
insert into public.registros_acesso (evento, ip, criado_em) values ('login', '203.0.113.10', now() - interval '7 months');
:comoB
select teste.ok((select count(*) from public.registros_acesso) = 0, 'só admin lê os registros de acesso');
:comoC
select teste.ok((select count(*) from public.registros_acesso) = 2, 'admin lê os registros de acesso');
reset role;
select teste.bloqueia($$insert into public.registros_acesso (evento, ip) values ('xpto', '1.1.1.1')$$, 'evento de acesso desconhecido é recusado');
update public.orders set criado_em = now() - interval '4 days' where codigo = :'ped3';
select codigo as ped4 from public.criar_pedido(:'kit', 1, 'retirada', null, null, 'Fê', 'fe@teste.com', '52998224725', null, null, '2026-11-18') \gset
update public.orders set criado_em = now() - interval '4 days' where codigo = :'ped4';
select public.apagar_dados_vencidos();
select teste.ok((select status = 'cancelado' from public.orders where codigo = :'ped4'), 'pedido não pago em 3 dias é cancelado sozinho');
select teste.ok((select count(*) from public.registros_acesso) = 1, 'registro de acesso com mais de 6 meses é apagado; o recente fica');

-- =========================================================================
-- 17. Painéis (Etapa 5): relatórios por período e bloqueio de afiliado
-- =========================================================================
reset role;
select teste.ok((select bool_and(enviado_em is not null) from public.order_items oi join public.orders o on o.id = oi.order_id
                 where o.codigo = :'ped1' and oi.status_entrega in ('enviado', 'entregue', 'devolvido')),
                'marcar como enviado registra a data do envio');
:comoA
select teste.ok((select (r ->> 'vendas')::int >= 1 and jsonb_array_length(r -> 'serie') between 7 and 8
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
select teste.ok((select jsonb_array_length(r -> 'serie') between 7 and 8 and r ? 'a_receber_centavos' and r ? 'repassada_centavos'
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
  'Gil', 'gil@teste.com', '11144477735', null, null, '2026-11-18') \gset
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
select teste.ok((select count(*) from public.configuracoes where chave like 'taxa\_total\_%' or chave like 'custo\_lytex\_%') = 0,
                'usuário comum não lê taxa total nem custo Lytex');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 9, "fixo_centavos": 500}}')$$, 'não-admin não altera taxa total');
select teste.bloqueia($$select * from public.admin_fin_por_modalidade('2020-03-01', '2020-04-01')$$, 'custo Lytex e receita Staypse por modalidade: não-admin não lê');
select teste.bloqueia($$select public.configuracoes_taxas_coerentes()$$, 'checagem interna de taxas não é chamável por usuário');
:comoAnon
select teste.ok(not (public.configuracoes_publicas() ? 'taxa_total_pix') and not (public.configuracoes_publicas() ? 'custo_lytex_pix')
                and not (public.configuracoes_publicas() ? 'custo_lytex_split'),
                'leitura pública não traz taxa total nem custo Lytex');
select teste.ok(public.configuracoes_publicas() ? 'meios_pagamento' and not (public.configuracoes_publicas() ? 'taxa_staypse_percentual')
                and not (public.configuracoes_publicas() ? 'palavras_proibidas'),
                'leitura pública traz só chaves não sensíveis (sem taxa nem palavras proibidas)');
:comoC
select teste.ok((select count(*) from public.configuracoes) = 22, 'admin lê as 22 configurações (6 de regras + admin_email + 5 taxas totais + 5 custos Lytex + custo de repasse + tarifa mínima, pedido mínimo, vigência e taxas anteriores)');
select teste.ok((select valor = '{"percentual": 1.5, "fixo_centavos": 230}'::jsonb from public.configuracoes where chave = 'taxa_total_pix')
                and (select valor = '{"percentual": 4.29, "fixo_centavos": 0}'::jsonb from public.configuracoes where chave = 'custo_lytex_cartao_7a12'),
                'taxas por modalidade nascem com os valores recomendados');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 31, "fixo_centavos": 200}}')$$, 'taxa total acima de 30% é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 1.555, "fixo_centavos": 200}}')$$, 'percentual com mais de 2 casas é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 1.5, "fixo_centavos": 2001}}')$$, 'fixo acima de R$ 20 é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 1.5}}')$$, 'taxa sem o fixo é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 1.5, "fixo_centavos": 180}}')$$, 'taxa total com fixo abaixo do custo Lytex é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"taxa_total_cartao_1x": {"percentual": 3, "fixo_centavos": 50}}')$$, 'taxa total com percentual abaixo do custo Lytex é recusada');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"custo_lytex_pix": {"percentual": 0, "fixo_centavos": 250}}')$$, 'custo Lytex acima da taxa total é recusado');
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"custo_lytex_split": {"percentual": 1, "minimo_centavos": 200, "maximo_centavos": 100}}')$$, 'repasse com máximo menor que o mínimo é recusado');
select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 1.8, "fixo_centavos": 210}, "custo_lytex_pix": {"percentual": 0, "fixo_centavos": 190}}');
select teste.ok((select valor = '{"percentual": 1.8, "fixo_centavos": 210}'::jsonb from public.configuracoes where chave = 'taxa_total_pix')
                and (select valor = '{"percentual": 0, "fixo_centavos": 190}'::jsonb from public.configuracoes where chave = 'custo_lytex_pix'),
                'taxa total e custo Lytex válidos são salvos (admin)');
select public.admin_salvar_configuracoes('{"taxa_total_pix": {"percentual": 1.5, "fixo_centavos": 230}, "custo_lytex_pix": {"percentual": 0, "fixo_centavos": 185}}');
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
select teste.ok((select count(*) from public.audit_log where acao = 'configuracao_alterada') = 10, 'uma entrada no log por chave alterada');
select public.admin_salvar_configuracoes('{"prazo_nf_dias": 3}');
select teste.ok((select count(*) from public.audit_log where acao = 'configuracao_alterada') = 10, 'salvar sem mudança não polui o log');
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
update public.order_items set status_entrega = 'aguardando' where item_id = :'kit';
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
-- 22. Temas da loja (migração 15): modelo, seções, banner e destaques em JSON
-- =========================================================================
reset role;
select id as item_davi from public.items where nome = 'Produto do Davi' \gset
select id as item_ana from public.items where nome = 'Aff Auto' \gset
select id as item_ana2 from public.items where nome = 'Aff Manual' \gset
select user_id::text as uid_ana from public.producers where user_id = '00000000-0000-0000-0000-00000000000a' \gset

select format('{"modelo":"vitrine","secoes":[{"tipo":"banner","visivel":true},{"tipo":"destaques","visivel":true},{"tipo":"todos_produtos","visivel":true},{"tipo":"sobre","visivel":false}],"destaques":["%s","%s"],"banner":{"imagem":"%s/banner.webp","frase":"Novidades da semana","produto":"%s"}}',
              :'item_ana', :'item_ana2', :'uid_ana', :'item_ana') as tema_ok \gset

-- formato: o banco recusa qualquer coisa fora do combinado
select teste.ok(public.tema_loja_valido(:'tema_ok'::jsonb), 'tema bem formado é aceito');
select teste.ok(public.tema_loja_valido(null), 'loja sem tema continua valendo');
select teste.ok(not public.tema_loja_valido('{"modelo":"livre","secoes":[{"tipo":"banner","visivel":true}]}'), 'modelo fora dos 4 é recusado');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"html","visivel":true}]}'), 'tipo de seção inválido é recusado');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true},{"tipo":"banner","visivel":false}]}'), 'seção repetida é recusada');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":"sim"}]}'), 'visivel precisa ser verdadeiro ou falso');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[]}'), 'lista de seções vazia é recusada');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"css":"body{}"}'), 'chave extra (CSS livre) é recusada');
select teste.ok(not public.tema_loja_valido(format('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"destaques":%s}',
                  (select jsonb_agg(gen_random_uuid()) from generate_series(1, 9)))::jsonb), 'mais de 8 destaques são recusados');
select teste.ok(not public.tema_loja_valido(format('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"banner":{"frase":"%s"}}', repeat('x', 81))::jsonb), 'frase do banner com mais de 80 letras é recusada');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"banner":{"imagem":"../x.png"}}'), 'caminho de imagem inseguro é recusado');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"destaques":["nao-e-id"]}'), 'destaque que não é id é recusado');

-- só a dona grava, pela função
:comoA
select public.salvar_minha_loja('ana-cosmeticos', 'Ana Cosméticos', 'Cosméticos naturais.', null, null, null, null, null, :'tema_ok'::jsonb);
select teste.ok((select loja_tema ->> 'modelo' from public.producers where user_id = '00000000-0000-0000-0000-00000000000a') = 'vitrine', 'a dona salva o tema da própria loja');
select teste.bloqueia($$update public.producers set loja_tema = '{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}]}'$$, 'ninguém grava o tema direto na tabela (só pela função)');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana', '{"modelo":"livre","secoes":[{"tipo":"banner","visivel":true}]}'), 'modelo inválido é recusado pela função');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  format('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"destaques":["%s"]}', :'item_davi')), 'destaque de item de outra loja é recusado');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  format('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"banner":{"produto":"%s"}}', :'item_davi')), 'banner que aponta para produto de outra loja é recusado');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  '{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"banner":{"imagem":"00000000-0000-0000-0000-00000000000b/x.webp"}}'), 'imagem do banner na pasta de outra pessoa é recusada');
select teste.ok((select loja_tema ->> 'modelo' from public.producers where user_id = '00000000-0000-0000-0000-00000000000a') = 'vitrine', 'tema recusado não apaga o tema salvo');

:comoD
select teste.bloqueia(format('update public.producers set loja_tema = %L::jsonb where user_id = %L', :'tema_ok', '00000000-0000-0000-0000-00000000000a'), 'outra loja não altera o tema da Ana');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'davi-me', 'Davi', :'tema_ok'),
                      'a Davi não consegue usar destaques e banner da Ana no próprio tema');
:comoAnon
select teste.bloqueia($$select public.salvar_minha_loja('x', 'x', null, null, null, null, null, null, null)$$, 'visitante não salva tema');

-- leitura pública: só de loja aprovada
select teste.ok((select loja_tema ->> 'modelo' from public.loja_publica('ana-cosmeticos')) = 'vitrine', 'o público lê o tema de loja aprovada');
select teste.ok((select count(*) from public.itens_da_loja('ana-cosmeticos') where id = :'item_ana') = 1, 'itens da loja trazem o id para os destaques');
reset role;
update public.producers set loja_slug = 'davi-me', status_verificacao = 'suspenso' where user_id = '00000000-0000-0000-0000-00000000000d';
:comoAnon
select teste.ok((select count(*) from public.loja_publica('davi-me')) = 0, 'loja não aprovada não aparece (nem o tema)');
select teste.ok((select count(*) from information_schema.columns
                 where table_name = 'itens_da_loja' or (table_schema = 'information_schema' and false)) = 0
                and (select count(*) from information_schema.parameters p
                     where p.specific_name like 'itens_da_loja%' and p.parameter_mode = 'OUT'
                       and p.parameter_name ~ '(qtd|quant|total|venda)') = 0,
                'a loja pública não devolve número de venda, só a posição');
:comoServidor
select teste.ok(public.tema_loja_valido(loja_tema), 'tema salvo continua válido') from public.producers where loja_tema is not null limit 1;
reset role;

-- =========================================================================
-- 21. Organização da vitrine (migração 20261201000001): destaques, coleções, ordem
-- =========================================================================
reset role;
select id as org_serum from public.items where slug = 'serum-facial' \gset
select id as org_curso from public.items where slug = 'curso-de-maquiagem' \gset
select id as org_davi from public.items where nome = 'Produto do Davi' \gset
select jsonb_build_object('destaques', jsonb_build_array(:'org_curso'::text),
         'colecoes', jsonb_build_array(jsonb_build_object('nome', 'Para presentear', 'itens', jsonb_build_array(:'org_serum'::text, :'org_curso'::text))),
         'ordem', jsonb_build_array(:'org_curso'::text, :'org_serum'::text))::text as org_ok \gset

-- formato (função pura): limites de 4 destaques e 6 coleções
select teste.ok(public.organizacao_vitrine_valida(null) and public.organizacao_vitrine_valida(:'org_ok'::jsonb), 'organização vazia ou bem formada é válida');
select teste.ok(public.organizacao_vitrine_valida(jsonb_build_object('destaques', (select jsonb_agg(gen_random_uuid()::text) from generate_series(1, 4)))),
                'até 4 destaques é aceito');
select teste.ok(not public.organizacao_vitrine_valida(jsonb_build_object('destaques', (select jsonb_agg(gen_random_uuid()::text) from generate_series(1, 5)))),
                'o quinto destaque é recusado');
select teste.ok(public.organizacao_vitrine_valida(jsonb_build_object('colecoes',
                  (select jsonb_agg(jsonb_build_object('nome', 'Coleção ' || n, 'itens', '[]'::jsonb)) from generate_series(1, 6) n))),
                'até 6 coleções é aceito');
select teste.ok(not public.organizacao_vitrine_valida(jsonb_build_object('colecoes',
                  (select jsonb_agg(jsonb_build_object('nome', 'Coleção ' || n, 'itens', '[]'::jsonb)) from generate_series(1, 7) n))),
                'a sétima coleção é recusada');
select teste.ok(not public.organizacao_vitrine_valida('{"colecoes":[{"nome":"","itens":[]}]}'), 'coleção sem nome é recusada');
select teste.ok(not public.organizacao_vitrine_valida(jsonb_build_object('colecoes', jsonb_build_array(jsonb_build_object('nome', repeat('x', 41), 'itens', '[]'::jsonb)))),
                'nome de coleção com mais de 40 letras é recusado');
select teste.ok(public.organizacao_vitrine_valida(jsonb_build_object('colecoes', jsonb_build_array(jsonb_build_object('nome', repeat('x', 40), 'itens', '[]'::jsonb)))),
                'nome de coleção com 40 letras é aceito');
select teste.ok(not public.organizacao_vitrine_valida('{"colecoes":[{"nome":"A","itens":[]},{"nome":"a","itens":[]}]}'), 'nomes de coleção repetidos são recusados');
select teste.ok(not public.organizacao_vitrine_valida('{"html":"<script>"}'), 'chave desconhecida é recusada');
select teste.ok(not public.organizacao_vitrine_valida('{"destaques":["nao-e-id"]}'), 'destaque que não é id é recusado');
select teste.ok(not public.organizacao_vitrine_valida(jsonb_build_object('destaques', jsonb_build_array(:'org_serum'::text, :'org_serum'::text))), 'destaque repetido é recusado');

-- só o dono grava, e só itens de afiliação aprovada dele
:comoB
select public.salvar_organizacao_vitrine(:'org_ok'::jsonb);
select teste.ok((select organizacao -> 'destaques' ->> 0 = :'org_curso' from public.storefronts where slug = 'loja-da-bia'), 'o dono salva destaques, coleções e ordem');
select teste.bloqueia($$update public.storefronts set organizacao = '{"destaques":[]}'::jsonb where slug = 'loja-da-bia'$$, 'nem o dono grava a coluna direto (só pela função)');
select teste.bloqueia(format('select public.salvar_organizacao_vitrine(%L::jsonb)', jsonb_build_object('destaques', jsonb_build_array(:'org_davi'::text))),
                      'item sem afiliação do dono é recusado (destaque)');
select teste.bloqueia(format('select public.salvar_organizacao_vitrine(%L::jsonb)',
                             jsonb_build_object('colecoes', jsonb_build_array(jsonb_build_object('nome', 'X', 'itens', jsonb_build_array(:'org_davi'::text))))),
                      'item sem afiliação do dono é recusado (coleção)');
select teste.bloqueia(format('select public.salvar_organizacao_vitrine(%L::jsonb)', jsonb_build_object('ordem', jsonb_build_array(gen_random_uuid()::text))),
                      'item que não existe é recusado (ordem)');
select teste.ok((select organizacao -> 'destaques' ->> 0 = :'org_curso' from public.storefronts where slug = 'loja-da-bia'), 'gravação recusada não apaga a organização salva');

:comoA
select teste.bloqueia(format('update public.storefronts set organizacao = %L::jsonb where slug = %L', :'org_ok', 'loja-da-bia'), 'outra pessoa não edita a organização da vitrine');
select teste.bloqueia(format('select public.salvar_organizacao_vitrine(%L::jsonb)', :'org_ok'), 'quem não tem vitrine não grava organização');
:comoAnon
select teste.bloqueia(format('select public.salvar_organizacao_vitrine(%L::jsonb)', :'org_ok'), 'visitante não grava organização');
select teste.ok((select organizacao is not null from public.storefronts where slug = 'loja-da-bia'), 'o público lê a organização da vitrine publicada');
select teste.ok((select count(*) from public.itens_da_vitrine('loja-da-bia') where id in (:'org_serum', :'org_curso')) = 2, 'itens da vitrine trazem o id');

-- item que sai do ar some da vitrine, mesmo citado na organização
:comoA
update public.items set preco_centavos = 11990 where slug = 'serum-facial';
:comoAnon
select teste.ok((select count(*) from public.itens_da_vitrine('loja-da-bia') where id = :'org_serum') = 0, 'item que saiu do ar não aparece, mesmo na organização');

-- =========================================================================
-- 8b. Código de indicação: atribuição por código digitado no checkout
-- =========================================================================
-- Código = @ (slug da vitrine). Afiliado aprovado e vendedor próprio da loja valem;
-- o código digitado vence o cookie; a origem (link/codigo) fica no pedido.
reset role;
-- a loja do Davi publica um produto (para testar "código de OUTRA loja")
select public.aplicar_status_recebedor('mock', 'rec_d', 'aprovado', null, '12ABC34501DE35');
update public.producers set status_verificacao = 'aprovado' where cnpj = '12ABC34501DE35';
update public.items set status_aprovacao = 'aprovado', aprovado_em = now() where nome = 'Produto do Davi';
select id as ci_davi from public.items where nome = 'Produto do Davi' \gset
-- Fabi (afiliada de catálogo, recebedor aprovado) com afiliação APROVADA ao Aff Auto e PENDENTE ao Aff Manual
:comoF
select public.afiliar_se(:'aff_auto');
reset role;
update public.items set estoque = 200 where id = :'kit';  -- os pedidos abertos dos testes anteriores reservam estoque
:comoServidor
select teste.ok((select vitrine_slug = 'loja-da-fabi' from public.validar_codigo_indicacao(:'aff_auto', '@Loja-Da-Fabi', 'ip-ci-0')),
                'código: afiliado aprovado vale (sem diferenciar maiúsculas, "@" opcional)');
select codigo as ci_p1 from public.criar_pedido(:'aff_auto', 1, 'digital', null, null,
  'Hugo', 'hugo@teste.com', '52998224725', null, null, '2026-11-18', 'Loja-da-Fabi') \gset
reset role;
select teste.ok((select o.revendedor_id = '00000000-0000-0000-0000-00000000000f' and o.atribuicao_origem = 'codigo'
                        and o.vendedor_id is null and oi.comissao_percentual = 30
                 from public.orders o join public.order_items oi on oi.order_id = o.id where o.codigo = :'ci_p1'),
                'código de afiliado aprovado atribui o pedido e registra a origem "codigo"');

-- não vale: afiliação pendente, afiliado bloqueado, sem recebedor aprovado
:comoServidor
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L, %L)',
                             :'aff_manual', 'digital', 'Ivo', 'ivo@teste.com', '52998224725', '2026-11-18', 'loja-da-fabi'),
                      'código de afiliado com afiliação pendente não atribui');
select teste.ok((select not valido and not limitado from public.validar_codigo_indicacao(:'aff_manual', 'loja-da-fabi', 'ip-ci-1')),
                'validar: afiliação pendente = código não vale');
:comoA
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000f', true);
:comoServidor
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L, %L)',
                             :'aff_auto', 'digital', 'Ivo', 'ivo@teste.com', '52998224725', '2026-11-18', 'loja-da-fabi'),
                      'código de afiliado bloqueado pela loja não atribui');
:comoA
select public.bloquear_afiliado('00000000-0000-0000-0000-00000000000f', false);
:comoF
select public.afiliar_se(:'aff_auto');
:comoServidor
select public.aplicar_status_recebedor('mock', 'rec_f', 'em_analise', null, null);
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L, %L)',
                             :'aff_auto', 'digital', 'Ivo', 'ivo@teste.com', '11144477735', '2026-11-18', 'loja-da-fabi'),
                      'código de afiliado sem recebedor aprovado não atribui');
select public.aplicar_status_recebedor('mock', 'rec_f', 'aprovado', null, null);

-- vendedor próprio da loja: split direto (Bia) e folha (Davi) atribuem
select codigo as ci_p2 from public.criar_pedido(:'kit', 1, 'retirada', null, null,
  'Jana', 'jana@teste.com', '11144477735', null, null, '2026-11-18', 'loja-da-bia') \gset
select codigo as ci_p3 from public.criar_pedido(:'kit', 1, 'retirada', null, null,
  'Kleber', 'kleber@teste.com', '11144477735', null, null, '2026-11-18', 'davi-vendas') \gset
reset role;
select teste.ok((select o.revendedor_id = '00000000-0000-0000-0000-00000000000b' and o.vendedor_id is not null and o.atribuicao_origem = 'codigo'
                 from public.orders o where o.codigo = :'ci_p2'),
                'código de vendedor próprio (split direto) da loja atribui');
select teste.ok((select o.revendedor_id = '00000000-0000-0000-0000-00000000000d' and o.vendedor_id is not null and o.atribuicao_origem = 'codigo'
                 from public.orders o where o.codigo = :'ci_p3'),
                'código de vendedor próprio na folha também atribui (conta para o relatório)');

-- vendedor de OUTRA loja não atribui (Bia e Davi são vendedores da loja da Ana, não da loja do Davi)
:comoServidor
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L, %L)',
                             :'ci_davi', 'digital', 'Lia', 'lia@teste.com', '11144477735', '2026-11-18', 'loja-da-bia'),
                      'código de vendedor de OUTRA loja não atribui');
select teste.ok((select not valido from public.validar_codigo_indicacao(:'ci_davi', 'loja-da-bia', 'ip-ci-2')),
                'validar: vendedor de outra loja = código não vale (mesmo resultado de código inexistente)');
select teste.ok((select not valido from public.validar_codigo_indicacao(:'kit', 'nao-existe-xyz', 'ip-ci-2')),
                'validar: código inexistente = código não vale');
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L, %L)',
                             :'kit', 'retirada', 'Mel', 'mel@teste.com', '11144477735', '2026-11-18', 'x'),
                      'código fora do formato não atribui');

-- o código digitado VENCE o cookie; sem código, o cookie vale e a origem é "link"
select codigo as ci_p4 from public.criar_pedido(:'kit', 1, 'retirada', '00000000-0000-0000-0000-00000000000b', null,
  'Nando', 'nando@teste.com', '11144477735', null, null, '2026-11-18', 'davi-vendas') \gset
select codigo as ci_p5 from public.criar_pedido(:'kit', 1, 'retirada', '00000000-0000-0000-0000-00000000000b', null,
  'Olga', 'olga@teste.com', '11144477735', null, null, '2026-11-18') \gset
reset role;
select teste.ok((select o.revendedor_id = '00000000-0000-0000-0000-00000000000d' and o.atribuicao_origem = 'codigo'
                 from public.orders o where o.codigo = :'ci_p4'),
                'cookie da Bia + código do Davi: o código digitado vence');
select teste.ok((select o.revendedor_id = '00000000-0000-0000-0000-00000000000b' and o.atribuicao_origem = 'link'
                 from public.orders o where o.codigo = :'ci_p5'),
                'só cookie: a atribuição segue pelo link e a origem é "link"');
select teste.ok((select atribuicao_origem is null and revendedor_id is null from public.orders where codigo = :'ped3'),
                'pedido sem indicação fica sem origem');

-- o dono da loja não se auto-atribui (nem por código, nem por cookie)
alter table public.afiliacoes disable trigger afiliacoes_y_recebedor;
insert into public.storefronts (revendedor_id, slug, nicho) values ('00000000-0000-0000-0000-00000000000a', 'ana-indica', 'beleza');
insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status, decidido_em)
  select '00000000-0000-0000-0000-00000000000a', id, :'kit', 'aprovada', now() from public.storefronts where slug = 'ana-indica';
alter table public.afiliacoes enable trigger afiliacoes_y_recebedor;
:comoServidor
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L, %L)',
                             :'kit', 'retirada', 'Pia', 'pia@teste.com', '11144477735', '2026-11-18', 'ana-indica'),
                      'dono da loja não se auto-atribui por código');
select codigo as ci_p6 from public.criar_pedido(:'kit', 1, 'retirada', '00000000-0000-0000-0000-00000000000a', null,
  'Rui', 'rui@teste.com', '11144477735', null, null, '2026-11-18') \gset
reset role;
select teste.ok((select revendedor_id is null and atribuicao_origem is null from public.orders where codigo = :'ci_p6'),
                'dono da loja não se auto-atribui nem pelo cookie');
-- comprador logado também não se indica por código
:comoServidor
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, %L, %L, %L, %L, null, null, %L, %L)',
                             :'aff_auto', 'digital', '00000000-0000-0000-0000-00000000000f', 'Fabi', 'fabi@teste.com', '11144477735', '2026-11-18', 'loja-da-fabi'),
                      'comprador não se indica pelo próprio código');

-- antifraude: 8 tentativas inválidas por hora por IP; depois disso, nem o código certo passa por aquele IP
select count(*) from (select public.validar_codigo_indicacao(:'kit', 'palpite-' || n, 'ip-forca-bruta') from generate_series(1, 8) n) t;
select teste.ok((select limitado and not valido from public.validar_codigo_indicacao(:'aff_auto', 'loja-da-fabi', 'ip-forca-bruta')),
                'limite de tentativas inválidas por IP (hash): a nona é barrada');
select teste.ok((select valido from public.validar_codigo_indicacao(:'aff_auto', 'loja-da-fabi', 'ip-outro')),
                'o limite é por IP: outro IP segue normal');
:comoAnon
select teste.bloqueia($$select * from public.validar_codigo_indicacao(gen_random_uuid(), 'x', 'ip')$$, 'visitante não chama a validação direto');
select teste.bloqueia($$select * from public.codigo_indicacao_tentativas$$, 'visitante não lê as tentativas');
:comoB
select teste.bloqueia($$select * from public.resolver_codigo_indicacao(gen_random_uuid(), 'loja-da-bia', null)$$, 'logado também não chama a resolução direto');
select teste.ok((select count(*) from public.minhas_comissoes('vendedor', now() - interval '1 day', now() + interval '1 day')
                 where origem_atribuicao = 'codigo') = 1,
                'vendedor vê a origem "codigo" em "minhas vendas" (sem dados do comprador)');
select teste.ok((select count(*) from public.minhas_comissoes('vendedor', now() - interval '1 day', now() + interval '1 day')
                 where origem_atribuicao = 'link') >= 1, 'e a origem "link" nas vendas pelo link');

-- =========================================================================
-- 23. Cobrança com split, webhook, chargeback e conciliação (migração 20261206000001)
-- =========================================================================
reset role;
update public.recebedores set status_recebedor = 'aprovado', documento_provedor = null where provedor_id is not null;
select id as cb_curso from public.items where nome = 'Curso de Maquiagem' \gset
select id as cb_kit from public.items where nome = 'Kit Banho' \gset
select estoque as cb_est0 from public.items where id = :'cb_kit' \gset
:comoServidor
-- pedido do curso, indicado pela Bia (vendedora split_direto da loja da Ana), comprado por uma conta logada (Fabi)
select id as cb1, codigo as cb1_cod, token as cb1_tok from public.criar_pedido(:'cb_curso', 1, 'digital', '00000000-0000-0000-0000-00000000000b',
  '00000000-0000-0000-0000-00000000000f', 'Cris', 'cris@teste.com', '11144477735', null, null, '2026-11-18') \gset
select id as cb2 from public.criar_pedido(:'cb_kit', 1, 'retirada', null, null, 'Dani', 'dani@teste.com', '52998224725', null, null, '2026-11-18') \gset
select id as cb3 from public.criar_pedido(:'cb_kit', 1, 'retirada', null, null, 'Edu', 'edu@teste.com', '52998224725', null, null, '2026-11-18') \gset
select id as cb4 from public.criar_pedido(:'cb_kit', 1, 'retirada', null, null, 'Fran', 'fran@teste.com', '52998224725', null, null, '2026-11-18') \gset
select id as cb5 from public.criar_pedido(:'cb_kit', 1, 'retirada', null, null, 'Gui', 'gui@teste.com', '52998224725', null, null, '2026-11-18') \gset

-- dados do split: loja + indicação (afiliado) + taxa da Staypse vinda da configuração
select teste.ok((public.dados_split_pedido(:'cb1', 'mock') ->> 'indicador') = 'vendedor_split'
                and (public.dados_split_pedido(:'cb1', 'mock') ->> 'indicador_provedor_id') = 'rec_b_vend'
                and (public.dados_split_pedido(:'cb1', 'mock') ->> 'produtor_provedor_id') is not null
                and (public.dados_split_pedido(:'cb1', 'mock') -> 'taxas' -> 'taxa_total_pix' ->> 'fixo_centavos')::int = 200
                and (public.dados_split_pedido(:'cb1', 'mock') -> 'taxas') ? 'custo_lytex_cartao_7a12'
                and (public.dados_split_pedido(:'cb1', 'mock') -> 'taxas') ? 'custo_lytex_split',
                'split: loja, indicação (vendedor split_direto da loja) e taxa da Staypse (configuração) montados pelo banco');
select teste.ok((public.dados_split_pedido(:'cb2', 'mock') ->> 'indicador') = 'nenhum', 'split: pedido sem indicação não tem indicador');
select teste.bloqueia(format('select public.dados_split_pedido(%L, %L)', :'cb1', 'lytex'),
                      'sem recebedor aprovado no provedor não se monta cobrança (nada de cobrar sem como repassar)');

-- só o servidor registra a cobrança, uma vez só
select public.registrar_cobranca(:'cb1', 'mock', 'mock_cob_t1', '/simulador-pagamentos/cobranca/mock_cob_t1',
                                 '{"versao":1,"partes":[{"papel":"produtor","valorCentavos":1}]}');
select public.registrar_cobranca(id::uuid, 'mock', 'mock_cob_t' || n, null, '{"versao":1}'::jsonb)
from (values (:'cb2', 2), (:'cb3', 3), (:'cb4', 4), (:'cb5', 5)) v(id, n);
select teste.bloqueia(format('select public.registrar_cobranca(%L, %L, %L, null, %L)', :'cb1', 'mock', 'mock_cob_outra', '{}'),
                      'o pedido guarda uma cobrança só');
select teste.bloqueia(format('select public.registrar_cobranca(%L, %L, %L, null, %L)', :'cb2', 'mock', 'mock_cob_t1', '{}'),
                      'a mesma cobrança não vale para dois pedidos');
reset role;
select teste.ok((select cobranca_provedor = 'mock' and split_snapshot ->> 'versao' = '1' and cobranca_criada_em is not null
                 from public.orders where id = :'cb1'), 'pedido guarda a referência da cobrança e o snapshot do split');
select teste.ok((select count(*) = 1 from public.audit_log where acao = 'cobranca_criada' and entidade_id = :'cb1'),
                'criação da cobrança fica no audit_log');

-- quem pode chamar o que
:comoAnon
select teste.bloqueia(format('select public.aplicar_status_cobranca(%L, %L, %L)', 'mock', 'mock_cob_t1', 'paga'), 'visitante não aplica status de cobrança');
:comoA
select teste.bloqueia(format('select public.aplicar_status_cobranca(%L, %L, %L)', 'mock', 'mock_cob_t1', 'paga'), 'loja não aplica status de cobrança');
select teste.bloqueia(format('select public.registrar_cobranca(%L, %L, %L, null, %L)', :'cb2', 'mock', 'x', '{}'), 'loja não registra cobrança');
select teste.bloqueia(format('select * from public.cobrancas_para_conciliar(%L)', 'mock'), 'loja não lista cobranças para conciliar');
:comoC
select teste.bloqueia(format('select public.aplicar_status_cobranca(%L, %L, %L)', 'mock', 'mock_cob_t1', 'paga'), 'nem o admin aplica status pelo app (só o servidor, com a assinatura do provedor)');
select teste.bloqueia($$update public.orders set status = 'inventado'$$, 'status de pedido fora da lista é recusado');

-- WEBHOOK pago: confirma UMA vez só (estoque baixa uma vez)
:comoServidor
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t2', 'paga', :'cb2') = 'confirmado', 'webhook pago confirma o pedido');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t2', 'paga', :'cb2') = 'sem_efeito', 'o mesmo aviso de pago de novo não faz nada (idempotente)');
reset role;
select teste.ok((select status = 'pago' and pago_em is not null from public.orders where id = :'cb2'), 'pedido pago pelo aviso do provedor');
select teste.ok((select estoque = :'cb_est0'::int - 1 from public.items where id = :'cb_kit'), 'pago duas vezes baixou o estoque uma vez só');
select teste.ok((select count(*) = 1 from public.audit_log where acao = 'pedido_confirmado' and entidade_id = :'cb2'), 'só um registro de confirmação');
:comoServidor
select teste.bloqueia(format('select public.aplicar_status_cobranca(%L, %L, %L)', 'mock', 'mock_cob_inexistente', 'paga'), 'cobrança desconhecida é erro (o provedor reenvia)');
select teste.bloqueia(format('select public.aplicar_status_cobranca(%L, %L, %L, %L)', 'mock', 'mock_cob_t2', 'paga', :'cb3'), 'aviso de cobrança de outro pedido é recusado');
select teste.bloqueia(format('select public.aplicar_status_cobranca(%L, %L, %L)', 'mock', 'mock_cob_t2', 'PAID'), 'status fora do vocabulário é recusado');

-- idempotência por evento_id (tabela eventos_pagamento)
insert into public.eventos_pagamento (provedor, evento_id, tipo, payload) values ('mock', 'ev-cb-1', 'cobranca.status', '{"id":"ev-cb-1"}');
select teste.bloqueia($$insert into public.eventos_pagamento (provedor, evento_id, tipo, payload) values ('mock', 'ev-cb-1', 'cobranca.status', '{"id":"ev-cb-1"}')$$,
                      'o mesmo evento_id não é registrado duas vezes (payload bruto guardado uma vez)');

-- comissão: pendente enquanto no prazo de 7 dias → estornada no chargeback
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t1', 'paga', :'cb1') = 'confirmado', 'pedido indicado pago');
select teste.ok((public.pedido_do_comprador(:'cb1_cod', :'cb1_tok') -> 'itens' -> 0 -> 'acesso') <> 'null'::jsonb, 'pago: conteúdo digital liberado');
:comoB
select teste.ok((select situacao from public.minhas_comissoes('vendedor', now() - interval '1 day', now() + interval '1 day') where pedido_id = :'cb1') = 'a_receber',
                'comissão pendente (pago, dentro do prazo de 7 dias)');
:comoServidor
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t1', 'estorno_pendente', :'cb1') = 'sem_efeito', 'estorno pendente no provedor não muda o pedido');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t1', 'chargeback', :'cb1') = 'chargeback', 'chargeback aplicado');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t1', 'chargeback', :'cb1') = 'sem_efeito', 'chargeback repetido não faz nada');
reset role;
select teste.ok((select status = 'chargeback' and chargeback_em is not null from public.orders where id = :'cb1'), 'pedido em chargeback');
select teste.ok((select count(*) = 1 from public.audit_log where acao = 'pedido_chargeback' and entidade_id = :'cb1'
                   and detalhes ->> 'cobranca_id' = 'mock_cob_t1'), 'chargeback registrado no audit_log (uma vez)');
:comoB
select teste.ok((select situacao from public.minhas_comissoes('vendedor', now() - interval '1 day', now() + interval '1 day') where pedido_id = :'cb1') = 'estornada',
                'chargeback estorna a comissão de quem indicou');
select teste.ok((public.painel_indicador('vendedor', now() - interval '1 day', now() + interval '1 day') ->> 'estornada_centavos')::bigint > 0,
                'painel de quem indicou soma a comissão estornada');
:comoServidor
select teste.ok((public.pedido_do_comprador(:'cb1_cod', :'cb1_tok') ->> 'status') = 'chargeback', 'comprador vê o pedido em chargeback');
select teste.ok((public.pedido_do_comprador(:'cb1_cod', :'cb1_tok') -> 'itens' -> 0 -> 'acesso') = 'null'::jsonb,
                'chargeback fecha o acesso ao conteúdo digital');
select teste.ok((public.pedido_do_comprador(:'cb1_cod', :'cb1_tok') ->> 'pode_desistir')::boolean = false, 'pedido em chargeback não aceita desistência');

-- chargeback devolve o estoque do que não saiu; reembolso pelo provedor também
:comoServidor
select public.aplicar_status_cobranca('mock', 'mock_cob_t3', 'paga', :'cb3');
select public.aplicar_status_cobranca('mock', 'mock_cob_t4', 'paga', :'cb4');
reset role;
select teste.ok((select estoque = :'cb_est0'::int - 3 from public.items where id = :'cb_kit'), 'três pedidos pagos baixaram três unidades');
:comoServidor
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t3', 'chargeback', :'cb3') = 'chargeback', 'chargeback no kit');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t4', 'estornada', :'cb4') = 'reembolsado', 'estorno confirmado pelo provedor reembolsa o pedido pago');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t4', 'estornada', :'cb4') = 'sem_efeito', 'estorno repetido não devolve o estoque de novo');
reset role;
select teste.ok((select estoque = :'cb_est0'::int - 1 from public.items where id = :'cb_kit'), 'chargeback e reembolso devolveram o estoque do que não saiu (uma vez só)');
select teste.ok((select status = 'reembolsado' and reembolsado_em is not null from public.orders where id = :'cb4'), 'pedido reembolsado só com a confirmação do provedor');

-- recusa/expiração cancela; pago depois de cancelado não ressuscita o pedido
:comoServidor
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t5', 'recusada', :'cb5') = 'cancelado', 'recusa do provedor cancela o pedido que aguardava pagamento');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t5', 'paga', :'cb5') = 'pago_em_pedido_cancelado', 'pagamento tardio em pedido cancelado é sinalizado, não ressuscita');
reset role;
select teste.ok((select status = 'cancelado' from public.orders where id = :'cb5'), 'pedido segue cancelado');
select teste.ok((select count(*) = 1 from public.audit_log where acao = 'pedido_pago_em_pedido_cancelado' and entidade_id = :'cb5'), 'pagamento tardio fica no audit_log para o admin devolver');

-- reembolso: com cobrança no provedor, o admin NÃO conclui à mão
update public.orders set status = 'em_reembolso' where id = :'cb2';
:comoC
select teste.bloqueia(format('select public.concluir_reembolso(%L)', :'cb2'), 'pedido com cobrança só é reembolsado quando o provedor confirmar');
:comoServidor
select public.registrar_estorno_solicitado(:'cb2', '00000000-0000-0000-0000-00000000000c', 'estorno_pendente');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t2', 'estornada', :'cb2') = 'reembolsado', 'desistência + estorno confirmado: reembolsado');
reset role;
select teste.ok((select count(*) = 1 from public.audit_log where acao = 'estorno_solicitado' and entidade_id = :'cb2'), 'pedido de estorno fica no audit_log');

-- CONCILIAÇÃO: pendentes há mais de 1 hora, status aplicado pelo mesmo caminho do webhook
:comoServidor
select id as cb6 from public.criar_pedido(:'cb_kit', 1, 'retirada', null, null, 'Hana', 'hana@teste.com', '52998224725', null, null, '2026-11-18') \gset
select id as cb7 from public.criar_pedido(:'cb_kit', 1, 'retirada', null, null, 'Ivo', 'ivo@teste.com', '52998224725', null, null, '2026-11-18') \gset
select public.registrar_cobranca(:'cb6', 'mock', 'mock_cob_t6', null, '{}');
select public.registrar_cobranca(:'cb7', 'mock', 'mock_cob_t7', null, '{}');
reset role;
update public.orders set cobranca_criada_em = now() - interval '2 hours' where id = :'cb6';
:comoServidor
select teste.ok((select count(*) = 1 and bool_and(cobranca_id = 'mock_cob_t6') from public.cobrancas_para_conciliar('mock') where status_pedido = 'aguardando_pagamento'),
                'conciliação lista só a cobrança pendente há mais de 1 hora (a recente fica de fora; cancelados recentes entram à parte, para o pagamento tardio)');
select teste.ok((select count(*) = 0 from public.cobrancas_para_conciliar('lytex')), 'conciliação respeita o provedor ativo');
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_t6', 'paga', :'cb6') = 'confirmado', 'conciliação aplica o status "paga" que o provedor informou');
select teste.ok((select count(*) = 0 from public.cobrancas_para_conciliar('mock') where status_pedido = 'aguardando_pagamento'), 'depois de aplicada, a cobrança sai da fila de conciliação');
select public.registrar_conciliacao('{"provedor":"mock","consultadas":1,"aplicadas":{"confirmado":1},"sem_mudanca":0,"erros":0}');
reset role;
select teste.ok((select status = 'pago' from public.orders where id = :'cb6'), 'pedido pago pela conciliação');
select teste.ok((select count(*) = 1 from public.audit_log where acao = 'conciliacao_cobrancas' and entidade = 'sistema'
                   and (detalhes ->> 'consultadas')::int = 1), 'resumo da conciliação registrado no audit_log');
select teste.bloqueia($$delete from public.audit_log where acao = 'conciliacao_cobrancas'$$, 'o resumo da conciliação não pode ser apagado do log');

-- privacidade: snapshot do split e link de pagamento só o servidor lê
:comoD
select teste.bloqueia($$select split_snapshot from public.orders$$, 'terceiro não lê o snapshot do split');
select teste.bloqueia($$select * from public.orders$$, 'select * em pedidos (inclui o snapshot) é barrado para usuário logado');
:comoA
select teste.ok((select count(*) >= 1 from (select cobranca_id, status, chargeback_em from public.orders) x), 'loja continua lendo os próprios pedidos (sem o snapshot)');
select teste.bloqueia($$select split_snapshot from public.orders$$, 'loja não lê o snapshot do split (o split de outros recebedores)');
select teste.bloqueia($$select cobranca_url from public.orders$$, 'loja não lê o link de pagamento (pode carregar o link secreto do comprador)');
:comoB
select teste.ok((select count(*) = 0 from public.orders), 'afiliado segue sem ler pedidos (LGPD)');
select teste.bloqueia($$select split_snapshot from public.orders$$, 'afiliado não lê o snapshot do split');
:comoC
select teste.bloqueia($$select split_snapshot from public.orders$$, 'admin também não lê o snapshot pelo app (auditoria é pelo servidor)');
:comoAnon
select teste.bloqueia($$select split_snapshot from public.orders$$, 'visitante não lê o snapshot do split');
:comoF
select teste.ok((select count(*) = 1 from public.orders where id = :'cb1'), 'comprador logado vê o próprio pedido');
select teste.bloqueia($$select split_snapshot from public.orders$$, 'comprador não lê o snapshot do split');
select teste.bloqueia($$select * from public.simulador_cobrancas$$, 'usuário logado não lê o estado do simulador');
:comoAnon
select teste.bloqueia($$select * from public.simulador_cobrancas$$, 'visitante não lê o estado do simulador');
reset role;
select teste.ok((select split_snapshot ->> 'versao' = '1' from public.orders where id = :'cb1'), 'o snapshot continua guardado (só o servidor lê)');

-- =========================================================================
-- 8b. Frete: quem paga (loja assume ou comprador) e o básico do comprador para o afiliado
-- =========================================================================
reset role;
update public.items set estoque = 50 where id = :'kit';  -- os testes anteriores consumiram o estoque
-- padrão: lojas existentes continuam com o comprador pagando o frete
select teste.ok((select frete_quem_paga = 'comprador' from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'),
                'frete: loja existente segue com o comprador pagando');
:comoA
select public.salvar_frete(1500, 12000, 5, 'comprador');
:comoAnon
select teste.ok((select frete_centavos = 1500 and total_centavos = 6500 from public.cotar_pedido(:'kit', 1, 'envio')),
                'frete (comprador paga): frete fixo cobrado abaixo do valor mínimo');
select teste.ok((select frete_centavos = 0 from public.cotar_pedido(:'kit', 3, 'envio')),
                'frete (comprador paga): grátis acima de X continua valendo');
select teste.ok((select frete_quem_paga = 'comprador' and frete_fixo_centavos = 1500 from public.entregas_do_item(:'kit')),
                'frete (comprador paga): a tela recebe o frete fixo');
:comoB
select teste.bloqueia($$select public.salvar_frete(0, null, 5, 'loja')$$, 'quem não tem loja não escolhe quem paga o frete');
:comoA
select teste.bloqueia($$select public.salvar_frete(1500, null, 5, 'ninguem')$$, 'quem paga o frete só aceita comprador ou loja');
-- loja assume: mesmo mandando valor fixo e "grátis acima de", o banco grava frete 0 e sem limite
select public.salvar_frete(1500, 12000, 5, 'loja');
select teste.ok((select frete_quem_paga = 'loja' and frete_fixo_centavos = 0 and frete_gratis_acima_centavos is null
                 from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'),
                'frete (loja assume): gravado como frete 0, sem "grátis acima de"');
:comoAnon
select teste.ok((select frete_centavos = 0 and total_centavos = subtotal_centavos from public.cotar_pedido(:'kit', 1, 'envio')),
                'frete (loja assume): comprador paga frete 0 em compra pequena');
select teste.ok((select frete_quem_paga = 'loja' and envio and frete_fixo_centavos = 0 and frete_gratis_acima_centavos is null
                 from public.entregas_do_item(:'kit')),
                'frete (loja assume): a tela recebe "Frete grátis" e nenhum limite');
:comoServidor
select id as fr1 from public.criar_pedido(:'kit', 1, 'envio', null, null, 'Gabi', 'gabi@teste.com', '52998224725',
  null, '{"cep":"01001000","logradouro":"Rua A","numero":"1","bairro":"Centro","cidade":"São Paulo","uf":"SP"}', '2026-11-18') \gset
reset role;
select teste.ok((select frete_centavos = 0 and total_centavos = subtotal_centavos from public.orders where id = :'fr1'),
                'frete (loja assume): o pedido criado tem frete 0 e total = subtotal');
-- volta ao comprador pagando: a cobrança de frete retorna
:comoA
select public.salvar_frete(1500, null, 5, 'comprador');
:comoAnon
select teste.ok((select frete_centavos = 1500 from public.cotar_pedido(:'kit', 1, 'envio')), 'frete: voltar para "comprador paga" cobra o frete de novo');

-- afiliado vê SÓ o básico do comprador (nome e valor pago) das próprias vendas
reset role;
insert into public.orders (id, producer_id, comprador_nome, comprador_email, comprador_documento,
                           comprador_telefone, endereco_entrega, subtotal_centavos, frete_centavos, total_centavos,
                           status, resumo_aceito_em, termos_versao, codigo, acesso_hash)
  select '00000000-0000-0000-0000-0000000000f8', p.id, 'Helena Basica',
         'helena.secreta@teste.com', '52998224725', '11999990000', '{"logradouro":"Rua Secreta"}'::jsonb,
         5000, 1500, 6500, 'pago', now(), '2026-11-18', 'BASICO0001', 'hash-basico'
  from public.producers p where p.user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.order_items (order_id, item_id, nome_item, tipo_item, quantidade, preco_unitario_centavos, comissao_percentual)
  select '00000000-0000-0000-0000-0000000000f8', id, nome, tipo, 1, preco_centavos, 10 from public.items where id = :'kit';
-- a indicação é ligada depois do insert (o gatilho de criação só mantém indicadores com recebedor aprovado)
update public.orders set revendedor_id = '00000000-0000-0000-0000-00000000000d' where id = '00000000-0000-0000-0000-0000000000f8';
:comoD
select teste.ok((select count(*) = 1 and bool_and(comprador_nome = 'Helena Basica' and valor_pago_centavos = 6500)
                 from public.minhas_comissoes('afiliado', now() - interval '1 day', now() + interval '1 day')
                 where pedido_id = '00000000-0000-0000-0000-0000000000f8'),
                'afiliado vê o nome do comprador e o valor pago (total) das próprias vendas');
select teste.ok(not exists (
                  select 1 from unnest((select proargnames from pg_proc where proname = 'minhas_comissoes')) as coluna
                  where coluna ilike any (array['%email%', '%telefone%', '%documento%', '%cpf%', '%endereco%', '%acesso%', '%codigo%', '%whatsapp%'])),
                'afiliado: minhas_comissoes só expõe nome e valor pago do comprador (sem e-mail/telefone/CPF/endereço/código)');
select teste.ok((select count(*) = 0 from public.orders), 'afiliado não lê a tabela de pedidos (nenhum campo do comprador por essa via)');
select teste.ok((select count(comprador_email) = 0 from public.orders), 'afiliado não lê o e-mail do comprador (a RLS não devolve nenhuma linha)');
select teste.ok((select count(comprador_telefone) = 0 from public.orders), 'afiliado não lê o telefone do comprador (a RLS não devolve nenhuma linha)');
select teste.ok((select count(comprador_documento) = 0 from public.orders), 'afiliado não lê o CPF do comprador (a RLS não devolve nenhuma linha)');
select teste.ok((select count(endereco_entrega) = 0 from public.orders), 'afiliado não lê o endereço do comprador (a RLS não devolve nenhuma linha)');
select teste.ok((select count(acesso_hash) = 0 from public.orders), 'afiliado não lê o código de acesso do pedido (a RLS não devolve nenhuma linha)');
select teste.ok(not exists (
                  select 1 from unnest((select proargnames from pg_proc where proname = 'minhas_vendas')) as coluna
                  where coluna ilike any (array['%email%', '%telefone%', '%documento%', '%cpf%', '%endereco%', '%acesso%'])),
                'afiliado: minhas_vendas também não expõe contato do comprador');
-- outro afiliado não vê a venda dele
:comoB
select teste.ok((select count(*) = 0 from public.minhas_comissoes('afiliado', now() - interval '1 day', now() + interval '1 day')
                 where pedido_id = '00000000-0000-0000-0000-0000000000f8'),
                'afiliado não vê (nem o nome do comprador) de venda de outro afiliado');
:comoAnon
select teste.bloqueia($$select * from public.minhas_comissoes('afiliado', now() - interval '1 day', now() + interval '1 day')$$,
                      'visitante não lê comissões nem o nome do comprador');

-- =========================================================================
-- 8b. Notificações no app e preferências de e-mail
-- =========================================================================
reset role;
-- recebedor recusado (testado acima com o webhook do Davi): ele foi avisado, COM o motivo
select teste.ok((select count(*) = 1 and bool_and(texto like '%Dados bancários não conferem com o titular.%')
                 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000d' and tipo = 'recebedor_recusado'),
                'recebedor recusado: a pessoa recebe notificação com o motivo');
select teste.ok((select email_pendente from public.notificacoes
                 where user_id = '00000000-0000-0000-0000-00000000000d' and tipo = 'recebedor_recusado'),
                'recebedor recusado: e-mail fica na fila (preferência padrão ligada)');

-- gatilho de pedido pago: avisa a loja (venda nova) e quem indicou (só o primeiro nome do comprador)
update public.orders set status = 'aguardando_pagamento', pago_em = null where id = '00000000-0000-0000-0000-0000000000f8';
update public.orders set status = 'pago', pago_em = now() where id = '00000000-0000-0000-0000-0000000000f8';
select teste.ok((select count(*) = 1 and bool_and(titulo = 'Venda nova' and texto like '%BASICO0001%'
                                                 and link = '/painel/loja/pedidos/BASICO0001' and lida_em is null and email_pendente)
                 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000a' and tipo = 'venda_paga'
                   and chave = 'pago:00000000-0000-0000-0000-0000000000f8'),
                'pedido pago: a loja recebe "Venda nova" com link interno e e-mail na fila');
select teste.ok((select count(*) = 1 and bool_and(texto like '%Helena%' and texto not like '%Basica%' and texto not like '%secreta%'
                                                 and texto not like '%11999990000%' and texto not like '%Rua%')
                 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000d' and tipo = 'venda_atribuida'),
                'venda atribuída: o afiliado vê só o primeiro nome (sem e-mail, telefone, CPF ou endereço)');
-- repetir o mesmo evento não duplica o aviso
update public.orders set status = 'aguardando_pagamento' where id = '00000000-0000-0000-0000-0000000000f8';
update public.orders set status = 'pago' where id = '00000000-0000-0000-0000-0000000000f8';
select teste.ok((select count(*) = 1 from public.notificacoes where tipo = 'venda_paga'
                 and chave = 'pago:00000000-0000-0000-0000-0000000000f8'), 'o mesmo pedido pago não gera aviso repetido');
-- estorno: a loja é avisada da desistência e quem indicou, da comissão estornada
update public.orders set status = 'em_reembolso' where id = '00000000-0000-0000-0000-0000000000f8';
select teste.ok(exists (select 1 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000a' and tipo = 'desistencia')
                and exists (select 1 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000d' and tipo = 'comissao_estornada'),
                'desistência avisa a loja e estorna a comissão de quem indicou (com aviso)');
update public.orders set status = 'chargeback' where id = '00000000-0000-0000-0000-0000000000f8';
select teste.ok((select count(*) = 1 from public.notificacoes where tipo = 'comissao_estornada'
                 and user_id = '00000000-0000-0000-0000-00000000000d')
                and exists (select 1 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000a' and tipo = 'chargeback'),
                'chargeback avisa a loja e não repete o aviso de comissão estornada');
update public.orders set status = 'pago' where id = '00000000-0000-0000-0000-0000000000f8';

-- afiliação: pedido novo avisa a loja; decisão avisa o afiliado
alter table public.afiliacoes disable trigger afiliacoes_y_recebedor;
insert into public.afiliacoes (afiliado_id, storefront_id, item_id, status)
  select '00000000-0000-0000-0000-00000000000b', s.id, :'kit', 'pendente'
  from public.storefronts s where s.revendedor_id = '00000000-0000-0000-0000-00000000000b'
  on conflict (afiliado_id, item_id) do update set status = 'pendente', decidido_em = null;
select teste.ok(exists (select 1 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000a' and tipo = 'afiliacao_pedida'),
                'pedido de afiliação novo avisa a loja');
update public.afiliacoes set status = 'aprovada', decidido_em = now()
  where afiliado_id = '00000000-0000-0000-0000-00000000000b' and item_id = :'kit';
select teste.ok((select count(*) = 1 from public.notificacoes
                 where user_id = '00000000-0000-0000-0000-00000000000b' and tipo = 'afiliacao_aprovada' and link = '/painel/revendedor/catalogo'),
                'afiliação aprovada notifica o afiliado');
alter table public.afiliacoes enable trigger afiliacoes_y_recebedor;

-- denúncia nova avisa os admins
select teste.ok(exists (select 1 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000c' and tipo = 'denuncia_nova'),
                'denúncia nova avisa o admin');

-- pedido sem nota fiscal depois do prazo: a rotina avisa a loja uma vez só
update public.orders set pago_em = now() - interval '30 days' where id = '00000000-0000-0000-0000-0000000000f8';
select public.notificar_pedidos_sem_nf();
select public.notificar_pedidos_sem_nf();
select teste.ok((select count(*) = 1 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000a'
                 and tipo = 'pedido_sem_nf' and chave = 'sem_nf:00000000-0000-0000-0000-0000000000f8'),
                'pedido sem nota fiscal após o prazo: a loja é avisada uma única vez');

-- RLS: cada um só lê e marca as próprias
:comoB
select teste.ok((select count(*) > 0 from public.notificacoes) and (select bool_and(user_id = '00000000-0000-0000-0000-00000000000b') from public.notificacoes),
                'usuário só lê as próprias notificações');
select teste.ok((select count(*) = 0 from public.notificacoes where user_id = '00000000-0000-0000-0000-00000000000a'),
                'usuário não lê notificação de outro');
select teste.bloqueia($$select email_pendente from public.notificacoes$$, 'usuário não lê a fila de e-mail');
select teste.bloqueia($$insert into public.notificacoes (user_id, tipo, titulo, texto) values ('00000000-0000-0000-0000-00000000000b', 'venda_paga', 'x', 'y')$$,
                      'ninguém cria notificação pelo navegador');
select teste.bloqueia($$select public.notificar('00000000-0000-0000-0000-00000000000b', 'venda_paga', 'x', 'y')$$,
                      'ninguém chama notificar() pelo navegador');
select teste.bloqueia($$update public.notificacoes set titulo = 'alterado'$$, 'usuário só altera a marca de lida (não o texto)');
select teste.ok(teste.linhas($$update public.notificacoes set lida_em = now() where user_id = '00000000-0000-0000-0000-00000000000a'$$) = 0,
                'usuário não marca como lida a notificação de outro');
select teste.ok(teste.linhas($$update public.notificacoes set lida_em = now() where lida_em is null$$) > 0,
                'usuário marca as próprias notificações como lidas');
select teste.ok((select count(*) = 0 from public.notificacoes where lida_em is null), 'marcar todas como lidas zera as não lidas');
reset role;
select teste.bloqueia($$insert into public.notificacoes (user_id, tipo, titulo, texto, link) values
  ('00000000-0000-0000-0000-00000000000b', 'venda_paga', 'x', 'y', '//site-externo.com')$$, 'link da notificação só aceita caminho interno');
select teste.bloqueia($$insert into public.notificacoes (user_id, tipo, titulo, texto) values
  ('00000000-0000-0000-0000-00000000000b', 'venda_paga', repeat('a', 121), 'y')$$, 'título da notificação tem no máximo 120 caracteres');

-- preferências: só o dono lê e edita; desligar tira o e-mail da fila
:comoA
insert into public.preferencias_notificacao (user_id, email_venda) values ('00000000-0000-0000-0000-00000000000a', false);
select teste.ok((select count(*) = 1 from public.preferencias_notificacao), 'o dono salva as próprias preferências');
select teste.bloqueia($$insert into public.preferencias_notificacao (user_id) values ('00000000-0000-0000-0000-00000000000b')$$,
                      'ninguém cria preferências de outra pessoa');
:comoB
select teste.ok((select count(*) = 0 from public.preferencias_notificacao), 'preferências de outra pessoa não aparecem');
select teste.ok(teste.linhas($$update public.preferencias_notificacao set email_venda = true where user_id = '00000000-0000-0000-0000-00000000000a'$$) = 0,
                'só o dono edita as preferências');
reset role;
select public.notificar('00000000-0000-0000-0000-00000000000a', 'venda_paga', 'Venda nova', 'teste de preferência', '/painel/loja/pedidos', 'pref-teste');
select teste.ok((select not email_pendente from public.notificacoes where chave = 'pref-teste'),
                'preferência desligada: a venda nova avisa no app mas não entra na fila de e-mail');


-- =========================================================================
-- 8b. Admin único + Financeiro do admin (migração 20261209000001)
-- =========================================================================
reset role;
select teste.ok(public.admin_email_configurado() = 'caio@teste.com', 'admin_email guardado em minúsculas');
select teste.bloqueia($$insert into public.user_roles values ('00000000-0000-0000-0000-00000000000a', 'admin')$$,
                      'papel admin recusado para outro e-mail (até para o servidor)');
select teste.bloqueia($$update public.user_roles set papel = 'admin' where user_id = '00000000-0000-0000-0000-00000000000b' and papel = 'revendedor'$$,
                      'promover papel existente a admin também é recusado');
select teste.ok((select count(*) = 1 from public.user_roles where papel = 'admin'), 'existe um único admin');
:comoC
select teste.bloqueia($$select public.admin_salvar_configuracoes('{"admin_email": "outro@teste.com"}'::jsonb)$$,
                      'nem o admin troca o admin_email pela tela');
select teste.ok(public.is_admin(), 'admin com o e-mail configurado é admin');

-- cenário pequeno, em 2020 (não mistura com os pedidos dos outros testes)
reset role;
insert into public.orders (id, producer_id, revendedor_id, comprador_nome, comprador_email, subtotal_centavos, total_centavos,
                           resumo_aceito_em, termos_versao, status, pago_em, reembolsado_em, split_snapshot)
select v.id, (select id from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'), v.rev,
       'Fin Teste', 'fin@teste.com', v.total, v.total, now(), '2026-11-16', v.status, v.pago, v.reemb, v.snap::jsonb
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid, 10000, 'pago', '2020-03-10 15:00Z'::timestamptz, null::timestamptz,
   '{"resultado":{"produtorCentavos":8500,"indicadorCentavos":1000,"staypseCentavos":500,"taxaMeioCentavos":0,"comissaoDevidaCentavos":1000},"taxaMeioInformada":false}'),
  ('00000000-0000-0000-0000-0000000000a2'::uuid, null::uuid, 20000, 'pago', '2020-03-11 12:00Z'::timestamptz, null::timestamptz,
   '{"resultado":{"produtorCentavos":19000,"indicadorCentavos":0,"staypseCentavos":1000,"taxaMeioCentavos":0,"comissaoDevidaCentavos":0},"taxaMeioInformada":false}'),
  ('00000000-0000-0000-0000-0000000000a3'::uuid, null::uuid, 5000, 'reembolsado', '2020-03-10 16:00Z'::timestamptz, '2020-03-12 12:00Z'::timestamptz,
   '{"resultado":{"produtorCentavos":4750,"indicadorCentavos":0,"staypseCentavos":250,"taxaMeioCentavos":0,"comissaoDevidaCentavos":0},"taxaMeioInformada":false}')
) as v(id, rev, total, status, pago, reemb, snap);

:comoC
select teste.ok((public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'gmv_centavos')::int = 30000, 'financeiro: GMV soma só os pedidos pagos');
select teste.ok((public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'staypse_centavos')::int = 1500, 'financeiro: receita Staypse vem do snapshot (reembolsado fora)');
select teste.ok((public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'comissao_afiliados_centavos')::int = 1000, 'financeiro: comissão de afiliados');
select teste.ok((public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'liquido_lojas_centavos')::int = 27500, 'financeiro: líquido das lojas');
select teste.ok((public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'taxa_meio_informada_pedidos')::int = 0, 'financeiro: taxa da Lytex ainda não informada');
select teste.ok((public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'reembolsos_centavos')::int = 5000
                and (public.admin_fin_resumo('2020-03-01T00:00-03', '2020-04-01T00:00-03') ->> 'reembolsos_qtd')::int = 1, 'financeiro: reembolsos do período');
select teste.ok((public.admin_fin_resumo('2020-03-11T00:00-03', '2020-03-12T00:00-03') ->> 'pedidos')::int = 1, 'financeiro: o período filtra por dia de Brasília');
select teste.ok((select pedidos = 2 and receita_staypse_centavos = 1500 and modalidade = 'sem_modalidade'
                 from public.admin_fin_por_modalidade('2020-03-01T00:00-03', '2020-04-01T00:00-03')),
                'financeiro: admin vê taxa total, custo Lytex e receita por modalidade (pedido antigo sem modalidade)');
select teste.ok((select count(*) = 2 and sum(staypse_centavos) = 1500 from public.admin_fin_por_dia('2020-03-01T00:00-03', '2020-04-01T00:00-03')), 'financeiro: série por dia');
select teste.ok((select pedidos = 2 and vendido_centavos = 30000 and valor_centavos = 27500 and total_linhas = 1
                 from public.admin_fin_ranking('loja', '2020-03-01T00:00-03', '2020-04-01T00:00-03')), 'financeiro: ranking por loja');
select teste.ok((select pedidos = 1 and vendido_centavos = 10000 and valor_centavos = 1000 and nome = 'Bia Revendedora'
                 from public.admin_fin_ranking('afiliado', '2020-03-01T00:00-03', '2020-04-01T00:00-03')), 'financeiro: ranking por afiliado');
select teste.ok((select count(*) = 0 from public.admin_fin_ranking('vendedor', '2020-03-01T00:00-03', '2020-04-01T00:00-03')), 'financeiro: sem vendedor, ranking vazio');
select teste.ok((select count(*) = 1 from public.admin_fin_ranking('afiliado', '2020-03-01T00:00-03', '2020-04-01T00:00-03', 'bia')), 'financeiro: busca pelo nome');
select teste.ok((select count(*) = 0 from public.admin_fin_ranking('afiliado', '2020-03-01T00:00-03', '2020-04-01T00:00-03', '%zz_')), 'financeiro: busca com curinga não casa tudo');
select teste.bloqueia($$select * from public.admin_fin_ranking('banco', now(), now())$$, 'financeiro: tipo de ranking inválido');
select teste.bloqueia($$select * from public.admin_fin_ranking('loja', now(), now(), null, 0, 0)$$, 'financeiro: limite inválido');

-- saque da conta própria: registro antes/depois + aviso aos admins
select teste.bloqueia($$select public.admin_registrar_saque('antes', 0)$$, 'saque de valor zero recusado');
select public.admin_registrar_saque('antes', 5000);
select public.admin_registrar_saque('depois', 5000, false, 'lytex_http_400');
reset role;
select teste.ok((select count(*) = 2 from public.audit_log where acao in ('saque_staypse_antes', 'saque_staypse_depois')), 'saque: registro antes e depois no log');
select teste.ok((select count(*) = 1 from public.notificacoes where tipo = 'saque_staypse' and user_id = '00000000-0000-0000-0000-00000000000c'), 'saque: admin recebe o aviso');

-- quem não é admin não acessa nada do financeiro
:comoA
select teste.bloqueia($$select public.admin_fin_resumo('2020-03-01', '2020-04-01')$$, 'financeiro: não-admin não vê o resumo');
select teste.bloqueia($$select * from public.admin_fin_por_dia('2020-03-01', '2020-04-01')$$, 'financeiro: não-admin não vê a série');
select teste.bloqueia($$select * from public.admin_fin_ranking('loja', '2020-03-01', '2020-04-01')$$, 'financeiro: não-admin não vê o ranking');
select teste.bloqueia($$select public.admin_registrar_saque('antes', 100)$$, 'saque: não-admin não registra');
select teste.bloqueia($$select split_snapshot from public.orders$$, 'split_snapshot segue ilegível para usuário logado');
:comoAnon
select teste.bloqueia($$select public.admin_fin_resumo('2020-03-01', '2020-04-01')$$, 'financeiro: visitante não vê o resumo');
select teste.bloqueia($$select public.definir_admin_email('x@y.com')$$, 'visitante não define o admin_email');
:comoA
select teste.bloqueia($$select public.definir_admin_email('ana@teste.com')$$, 'usuário logado não define o admin_email');

-- trocar o e-mail do admin tira o papel de quem não é mais ele (o servidor não tem usuário logado)
:comoServidor
select public.definir_admin_email('ana@teste.com');
select teste.ok((select count(*) = 0 from public.user_roles where papel = 'admin'), 'trocar o admin_email remove o papel do antigo admin');
select public.definir_admin_email('caio@teste.com');
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000c', 'admin');
:comoC
select teste.ok(public.is_admin(), 'admin restaurado');

-- =========================================================================
-- 8b. Checkout com meio e parcelas; taxa da plataforma vista por loja e afiliado
-- =========================================================================
reset role;
update public.orders set cobranca_meio = 'pix', cobranca_parcelas = null, cobranca_pagamento = '{"pixCopiaECola":"000201"}'::jsonb where id = :'cb2';
select teste.ok((select cobranca_meio = 'pix' and cobranca_pagamento ->> 'pixCopiaECola' = '000201' from public.orders where id = :'cb2'),
                'pedido guarda o meio e o Pix devolvido pela fatura');
select teste.bloqueia($$update public.orders set cobranca_meio = 'dinheiro' where id = (select id from public.orders limit 1)$$, 'meio de pagamento inválido não grava');
select teste.bloqueia($$update public.orders set cobranca_parcelas = 13 where id = (select id from public.orders limit 1)$$, 'mais de 12 parcelas não grava');
update public.orders set split_snapshot = '{"resultado":{"taxaTotalCentavos":400,"taxaLojaCentavos":300,"taxaAfiliadoCentavos":100,"produtorCentavos":9000,"indicadorCentavos":2900}}'::jsonb
where id = :'cb2';
:comoA
select teste.bloqueia($$select cobranca_pagamento from public.orders$$, 'dados de Pix e boleto não são legíveis por usuário logado');
select teste.bloqueia($$select cobranca_meio from public.orders$$, 'meio da cobrança não é legível por usuário logado');
select teste.ok((select taxa_centavos = 300 and recebe_centavos = 9000 from public.loja_valores_pedidos(array[:'cb2']::uuid[])),
                'a loja vê só a taxa da plataforma (a parte dela) e o que recebe');
select teste.ok((select (public.painel_loja_taxas('2000-01-01', '2100-01-01') ? 'taxa_centavos')), 'resumo da loja traz a taxa da plataforma');
:comoD
select teste.ok((select count(*) = 0 from public.loja_valores_pedidos(array[:'cb2']::uuid[])), 'outra pessoa não vê os valores do pedido da loja');
:comoAnon
select teste.bloqueia($$select * from public.loja_valores_pedidos(array[gen_random_uuid()])$$, 'visitante não chama os valores da loja');
select teste.bloqueia($$select * from public.afiliado_valores_pedidos(array[gen_random_uuid()])$$, 'visitante não chama os valores do afiliado');

-- =========================================================================
-- 9. RLS ligado em TODAS as tabelas
-- =========================================================================
reset role;
select teste.ok(not exists (select 1 from pg_tables
                            where schemaname = 'public' and not rowsecurity),
                'RLS ativo em todas as tabelas do schema public');

-- =========================================================================
-- 10. Temas da loja v2 (migração 20261212): 8 modelos e blocos editáveis
-- =========================================================================
reset role;
select id as item_ana_v2 from public.items where nome = 'Aff Auto' \gset
select id as item_davi_v2 from public.items where nome = 'Produto do Davi' \gset
select user_id::text as uid_ana_v2 from public.producers where user_id = '00000000-0000-0000-0000-00000000000a' \gset

select teste.ok(public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}]}'), 'v2: tema no formato antigo continua válido');
select teste.ok(public.tema_loja_valido('{"modelo":"boutique","versao":2,"secoes":[{"tipo":"faq","visivel":true},{"tipo":"video","visivel":true},{"tipo":"colecoes","visivel":false}]}'), 'v2: os 8 modelos e os blocos novos são aceitos');
select teste.ok(not public.tema_loja_valido('{"modelo":"classico","secoes":[{"tipo":"depoimentos","visivel":true}]}'), 'v2: não existe bloco de depoimentos');
select teste.ok(not public.tema_loja_valido(format('{"modelo":"minimal","secoes":[{"tipo":"banner","visivel":true}],"banners":%s}', (select jsonb_agg('{"frase":"x"}'::jsonb) from generate_series(1, 6)))::jsonb), 'v2: mais de 5 banners são recusados');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"banner","visivel":true}],"banners":[{"frase":"x","url":"javascript:alert(1)"}]}'), 'v2: link de banner só https');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"banner","visivel":true}],"anuncio":{"visivel":true,"texto":"x","url":"http://a.com"}}'), 'v2: link do anúncio só https');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"video","visivel":true}],"video":{"plataforma":"youtube","id":"<script>x</script>","titulo":null}}'), 'v2: código de vídeo malformado é recusado');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"video","visivel":true}],"video":{"plataforma":"outra","id":"dQw4w9WgXcQ"}}'), 'v2: só YouTube e Vimeo');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"faq","visivel":true}],"faq":[{"p":"a","r":"b","html":"x"}]}'), 'v2: chave extra nas perguntas é recusada');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"faq","visivel":true}],"rodape":{"instagram":"a b/c"}}'), 'v2: usuário de rede social inválido é recusado');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"faq","visivel":true}],"rodape":{"whatsapp":"abc"}}'), 'v2: WhatsApp só com números');
select teste.ok(not public.tema_loja_valido('{"modelo":"minimal","secoes":[{"tipo":"faq","visivel":true}],"colecoes":[{"categoria":"Casa Nova","imagem":null}]}'), 'v2: categoria da coleção inválida é recusada');

:comoA
select public.salvar_minha_loja('ana-cosmeticos', 'Ana Cosméticos', 'Cosméticos naturais.', null, null, null, null, null,
  format('{"versao":2,"modelo":"fabrica","secoes":[{"tipo":"banner","visivel":true},{"tipo":"faq","visivel":true}],"banners":[{"imagem":"%s/b1.webp","celular":"%s/b1c.webp","frase":"Oferta","alt":null,"produto":"%s","url":null}],"anuncio":{"visivel":true,"texto":"Envio em 2 dias","url":"https://exemplo.com"},"faq":[{"p":"Prazo?","r":"2 dias"}],"video":{"plataforma":"youtube","id":"dQw4w9WgXcQ","titulo":null}}', :'uid_ana_v2', :'uid_ana_v2', :'item_ana_v2')::jsonb);
select teste.ok((select loja_tema ->> 'modelo' from public.producers where user_id = '00000000-0000-0000-0000-00000000000a') = 'fabrica', 'v2: a dona salva o tema novo com banners, anúncio, vídeo e perguntas');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  format('{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"banners":[{"frase":"x","produto":"%s"}]}', :'item_davi_v2')), 'v2: banner com produto de outra loja é recusado');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  '{"modelo":"classico","secoes":[{"tipo":"banner","visivel":true}],"banners":[{"frase":"x","imagem":"00000000-0000-0000-0000-0000000000ff/b.webp"}]}'), 'v2: imagem de banner na pasta de outro usuário é recusada');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  '{"modelo":"classico","secoes":[{"tipo":"sobre","visivel":true}],"sobre":{"titulo":"x","texto":"y","imagem":"00000000-0000-0000-0000-0000000000ff/s.webp"}}'), 'v2: imagem do Sobre na pasta de outro usuário é recusada');
select teste.bloqueia(format('select public.salvar_minha_loja(%L, %L, null, null, null, null, null, null, %L::jsonb)', 'ana-cosmeticos', 'Ana',
  format('{"modelo":"classico","secoes":[{"tipo":"colecoes","visivel":true}],"colecoes":[{"categoria":"casa","imagem":"00000000-0000-0000-0000-0000000000ff/c.webp"}]}')), 'v2: imagem de coleção na pasta de outro usuário é recusada');
reset role;

-- =========================================================================
-- 11. Correções das auditorias (migração 20261214): link externo, suspensão, estoque, recuperar link
-- =========================================================================
reset role;
select teste.ok(public.link_externo_permitido('https://www.mercadolivre.com.br/produto'), 'link externo legítimo continua aceito');
select teste.ok(not public.link_externo_permitido('https://evil.com\.shopee.com.br/x'), 'link externo com barra invertida no host é recusado');
select teste.ok(not public.link_externo_permitido('https://shopee.com.br/x y'), 'link externo com espaço é recusado');

-- suspensão vale no banco: a loja suspensa não lê a própria loja e a recebedora suspensa não conta como apta
select teste.ok((select count(*) from public.producers where user_id = '00000000-0000-0000-0000-00000000000a') = 1, 'suspensão: base (a dona vê a loja)');
update public.profiles set suspenso_em = now(), suspenso_motivo = 'teste de suspensão' where id = '00000000-0000-0000-0000-00000000000a';
:comoA
select teste.ok((select count(*) from public.producers where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'suspensão: usuário suspenso não lê mais as próprias linhas');
reset role;
select teste.ok(not public.recebedor_aprovado('00000000-0000-0000-0000-00000000000a', 'produtor'), 'suspensão: recebedor suspenso não é apto');
update public.profiles set suspenso_em = null, suspenso_motivo = null where id = '00000000-0000-0000-0000-00000000000a';
:comoA
select teste.ok((select count(*) from public.producers where user_id = '00000000-0000-0000-0000-00000000000a') = 1, 'suspensão: reativado volta a ver a loja');
reset role;

-- estoque reservado: a última unidade não é vendida duas vezes e volta quando o pedido é cancelado
select coalesce(sum(oi.quantidade), 0) as rsv from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.item_id = :'kit' and o.status = 'aguardando_pagamento' \gset
update public.items set estoque = :'rsv'::int + 1 where id = :'kit';
select codigo as rs1, token as rt1 from public.criar_pedido(:'kit', 1, 'retirada', null, null, 'Eli', 'eli@teste.com', '52998224725', null, null, '2026-11-18') \gset
select teste.bloqueia(format('select * from public.criar_pedido(%L, 1, %L, null, null, %L, %L, %L, null, null, %L)', :'kit', 'retirada', 'Eli', 'eli@teste.com', '52998224725', '2026-11-18'),
  'estoque: a mesma última unidade não é reservada duas vezes');
select teste.ok(public.desistir_do_pedido(:'rs1', :'rt1', null) = 'cancelado', 'estoque: pedido cancelado');
select teste.ok((select count(*) from public.criar_pedido(:'kit', 1, 'retirada', null, null, 'Eli', 'eli@teste.com', '52998224725', null, null, '2026-11-18')) = 1, 'estoque: cancelamento libera a reserva');

-- auto-indicação: o afiliado comprando pelo próprio link (mesmo CPF) não leva comissão
select codigo as ai1 from public.criar_pedido(:'curso', 1, 'digital', '00000000-0000-0000-0000-00000000000b', null, 'Bia', 'bia@teste.com', '52998224725', null, null, '2026-11-18') \gset
select teste.ok((select o.revendedor_id is null and oi.comissao_percentual = 0 from public.orders o join public.order_items oi on oi.order_id = o.id where o.codigo = :'ai1'),
  'auto-indicação: comprar com o próprio CPF zera a indicação');

-- recuperar link: depois de 5 tentativas no mesmo código, nem o e-mail certo gera link
update public.items set estoque = estoque + 10 where id = :'kit';
select codigo as rc1 from public.criar_pedido(:'kit', 1, 'retirada', null, null, 'Eli', 'eli@teste.com', '52998224725', null, null, '2026-11-18') \gset
select teste.ok(public.renovar_acesso_pedido(:'rc1', 'eli@teste.com', 'iphash') is not null, 'recuperar: código e e-mail certos geram link');
select public.renovar_acesso_pedido(:'rc1', 'x1@teste.com', 'iphash');
select public.renovar_acesso_pedido(:'rc1', 'x2@teste.com', 'iphash');
select public.renovar_acesso_pedido(:'rc1', 'x3@teste.com', 'iphash');
select public.renovar_acesso_pedido(:'rc1', 'x4@teste.com', 'iphash');
select teste.ok(public.renovar_acesso_pedido(:'rc1', 'eli@teste.com', 'iphash') is null, 'recuperar: limite por código bloqueia depois de 5 tentativas');

-- =========================================================================
-- 30. Preço final, parcelamento da loja, aviso prévio das taxas e pagamento (migração 20261213000001)
-- =========================================================================
reset role;
-- validação das chaves novas
select teste.ok(public.configuracao_valida('taxa_minima_centavos', '250') and public.configuracao_valida('pedido_minimo_centavos', '1000'), 'preço final: tarifa mínima e pedido mínimo inteiros são válidos');
select teste.ok(not public.configuracao_valida('taxa_minima_centavos', '2.5') and not public.configuracao_valida('taxa_minima_centavos', '-1')
                and not public.configuracao_valida('pedido_minimo_centavos', '6000') and not public.configuracao_valida('taxa_minima_centavos', '"250"'),
                'preço final: mínimo com centavo quebrado, negativo, acima de R$ 50 ou texto é recusado');
select teste.ok(public.configuracao_valida('taxas_vigencia_em', '"2026-12-24T12:00:00Z"') and not public.configuracao_valida('taxas_vigencia_em', '"amanhã"')
                and not public.configuracao_valida('taxas_vigencia_em', '20261224'), 'preço final: vigência só em texto ISO 8601');
select teste.ok(public.configuracao_valida('taxas_anteriores', '{"pix":{"percentual":1.5,"fixo_centavos":200},"boleto":{"percentual":1.5,"fixo_centavos":230},"cartao_1x":{"percentual":4.9,"fixo_centavos":50},"cartao_2a6":{"percentual":5.5,"fixo_centavos":50},"cartao_7a12":{"percentual":6.1,"fixo_centavos":50}}')
                and not public.configuracao_valida('taxas_anteriores', '{"pix":{"percentual":1.5,"fixo_centavos":200}}')
                and not public.configuracao_valida('taxas_anteriores', '{"pix":{"percentual":99,"fixo_centavos":200},"boleto":{"percentual":1.5,"fixo_centavos":230},"cartao_1x":{"percentual":4.9,"fixo_centavos":50},"cartao_2a6":{"percentual":5.5,"fixo_centavos":50},"cartao_7a12":{"percentual":6.1,"fixo_centavos":50}}'),
                'preço final: tabela anterior precisa das 5 modalidades com valores válidos');

-- padrões novos e tabela anterior guardada
select teste.ok((select valor from public.configuracoes where chave = 'taxa_total_pix') = '{"percentual": 1.5, "fixo_centavos": 230}'
                and (select valor from public.configuracoes where chave = 'taxa_total_cartao_1x') = '{"percentual": 5.6, "fixo_centavos": 80}'
                and (select valor from public.configuracoes where chave = 'taxa_total_cartao_7a12') = '{"percentual": 6.8, "fixo_centavos": 80}'
                and (select valor from public.configuracoes where chave = 'taxa_minima_centavos') = '250'
                and (select valor from public.configuracoes where chave = 'pedido_minimo_centavos') = '1000',
                'preço final: padrões novos de taxa, tarifa mínima e pedido mínimo');
select teste.ok((select valor -> 'pix' from public.configuracoes where chave = 'taxas_anteriores') = '{"percentual": 1.5, "fixo_centavos": 200}'
                and (select valor -> 'cartao_2a6' from public.configuracoes where chave = 'taxas_anteriores') = '{"percentual": 5.5, "fixo_centavos": 50}',
                'preço final: a tabela anterior fica guardada');
select teste.ok((select (valor #>> '{}')::timestamptz from public.configuracoes where chave = 'taxas_vigencia_em') > now() + interval '29 days'
                and (select (valor #>> '{}')::timestamptz from public.configuracoes where chave = 'taxas_vigencia_em') < now() + interval '31 days',
                'preço final: a vigência é 30 dias depois da publicação');

-- até a vigência valem as taxas anteriores (sem tarifa mínima); depois, as novas
:comoServidor
select teste.ok((public.taxas_vigentes() -> 'taxa_total_pix' ->> 'fixo_centavos')::int = 200
                and (public.taxas_vigentes() ->> 'taxa_minima_centavos')::int = 0
                and (public.taxas_vigentes() ->> 'pedido_minimo_centavos')::int = 0
                and (public.taxas_vigentes() -> 'taxa_total_cartao_1x' ->> 'percentual')::numeric = 4.9
                and (public.taxas_vigentes() -> 'custo_lytex_pix' ->> 'fixo_centavos')::int = 185,
                'vigência: antes da data, o pedido usa as taxas anteriores (custo Lytex não muda)');
reset role;
update public.configuracoes set valor = to_jsonb('2020-01-01T00:00:00Z'::text) where chave = 'taxas_vigencia_em';
:comoServidor
select teste.ok((public.taxas_vigentes() -> 'taxa_total_pix' ->> 'fixo_centavos')::int = 230
                and (public.taxas_vigentes() ->> 'taxa_minima_centavos')::int = 250
                and (public.taxas_vigentes() ->> 'pedido_minimo_centavos')::int = 1000
                and (public.taxas_vigentes() -> 'taxa_total_cartao_1x' ->> 'percentual')::numeric = 5.6,
                'vigência: depois da data, valem as taxas novas, a tarifa mínima e o pedido mínimo');
reset role;
update public.configuracoes set valor = to_jsonb(to_char((now() + interval '30 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) where chave = 'taxas_vigencia_em';
:comoAnon
select teste.bloqueia($$select public.taxas_vigentes()$$, 'visitante não lê as taxas em vigor');
:comoA
select teste.bloqueia($$select public.taxas_vigentes()$$, 'a loja não chama as taxas em vigor direto (só o servidor)');

-- aviso prévio: todas as lojas são notificadas, uma vez só, e o painel mostra a data
reset role;
select count(*) as n_lojas_taxas from public.producers \gset
:comoServidor
select teste.ok(public.anunciar_novas_taxas() = :n_lojas_taxas, 'aviso: a rotina notifica todas as lojas');
reset role;
select teste.ok((select count(*) from public.notificacoes where tipo = 'taxas_novas') = :n_lojas_taxas
                and (select count(*) from public.notificacoes where tipo = 'taxas_novas' and email_pendente) = :n_lojas_taxas
                and not exists (select 1 from public.notificacoes where tipo = 'taxas_novas' and link <> '/taxas'),
                'aviso: uma notificação por loja (e-mail pendente), com link para /taxas, sem duplicar ao repetir');
:comoA
select teste.ok((select count(*) from public.notificacoes where tipo = 'taxas_novas') = 1
                and (select titulo like 'Novas taxas a partir de %' from public.notificacoes where tipo = 'taxas_novas'),
                'aviso: a loja vê o próprio "Novas taxas a partir de DATA"');
select teste.ok((select count(*) from public.aviso_taxas_loja()) = 1 and not (select em_vigor from public.aviso_taxas_loja()),
                'aviso: o painel da loja mostra a data de vigência (ainda não em vigor)');
:comoB
select teste.ok((select count(*) from public.aviso_taxas_loja()) = 0, 'aviso: quem não é loja não vê o aviso');
:comoAnon
select teste.bloqueia($$select * from public.aviso_taxas_loja()$$, 'aviso: visitante não chama a função do painel');

-- parcelamento é política da loja
:comoServidor
select teste.ok((select parcelas_max = 12 and parcelas_sem_juros = 3 from public.politica_parcelas_item(:'cb_curso')),
                'parcelamento: padrão da loja é até 12x, 3x sem juros');
:comoA
select public.salvar_parcelamento(6, 2);
select teste.ok((select parcelas_max = 6 and parcelas_sem_juros = 2 from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'),
                'parcelamento: a loja define até 6x e 2x sem juros');
select teste.bloqueia($$select public.salvar_parcelamento(13, 3)$$, 'parcelamento: mais de 12 parcelas é recusado');
select teste.bloqueia($$select public.salvar_parcelamento(6, 7)$$, 'parcelamento: sem juros maior que o máximo é recusado');
select teste.bloqueia($$select public.salvar_parcelamento(6, 0)$$, 'parcelamento: sem juros menor que 1 é recusado');
select teste.bloqueia($$select public.salvar_parcelamento(0, 0)$$, 'parcelamento: máximo menor que 1 é recusado');
select teste.bloqueia($$update public.producers set parcelas_max = 1, parcelas_sem_juros = 1$$, 'parcelamento: a loja não altera as colunas direto (só pela função)');
:comoB
select teste.bloqueia($$select public.salvar_parcelamento(3, 1)$$, 'parcelamento: quem não tem loja não define');
:comoAnon
select teste.bloqueia($$select public.salvar_parcelamento(3, 1)$$, 'parcelamento: visitante não define');
select teste.ok((select parcelas_max = 6 and parcelas_sem_juros = 2 from public.politica_parcelas_item(:'cb_curso')),
                'parcelamento: a política da loja é pública (a página do produto mostra "até Nx sem juros")');
reset role;
select teste.ok(exists (select 1 from public.audit_log where acao = 'parcelamento_alterado' and (detalhes -> 'depois' ->> 'parcelas_max')::int = 6),
                'parcelamento: a alteração fica no log');
select teste.bloqueia($$update public.producers set parcelas_sem_juros = 9 where parcelas_max = 6$$, 'parcelamento: sem juros acima do máximo viola a regra do banco');

-- cobrança com acréscimo, cancelamento no provedor, pagamento tardio e divergência
:comoServidor
select id as t1, codigo as t1_cod, token as t1_tok from public.criar_pedido(:'cb_curso', 1, 'digital', null, null, 'Ivo', 'ivo@teste.com', '52998224725', null, null, '2026-11-18') \gset
select id as t2 from public.criar_pedido(:'cb_curso', 1, 'digital', null, null, 'Jade', 'jade@teste.com', '52998224725', null, null, '2026-11-18') \gset
select public.registrar_cobranca(:'t1', 'mock', 'mock_cob_tardio_1', '/x', '{}'::jsonb, 'cartao', 7, null, 386);
select teste.ok((select cobranca_acrescimo_centavos from public.orders where id = :'t1') = 386, 'acréscimo do parcelamento fica guardado no pedido');
select public.registrar_cobranca(:'t2', 'mock', 'mock_cob_tardio_2', '/y', '{}'::jsonb, 'pix', null, null);
select teste.ok((select cobranca_acrescimo_centavos from public.orders where id = :'t2') = 0, 'sem acréscimo, o pedido guarda zero');
:comoB
select teste.bloqueia($$select cobranca_acrescimo_centavos from public.orders$$, 'usuário logado não lê o acréscimo nem as colunas novas (só o servidor)');
select teste.bloqueia($$select pagamento_tardio_em from public.orders$$, 'usuário logado não lê o controle de pagamento tardio');
:comoServidor
-- divergência: o pedido NÃO é confirmado pelo banco; o servidor chama este registro e a notificação vai para o admin
select public.registrar_pagamento_divergente(:'t2', '{"esperado_centavos": 5000, "informado_centavos": 100}'::jsonb);
select teste.ok(exists (select 1 from public.audit_log where acao = 'pagamento_divergente' and entidade_id = :'t2' and (detalhes ->> 'informado_centavos')::int = 100)
                and (select status from public.orders where id = :'t2') = 'aguardando_pagamento', 'divergência de valor fica no log e o pedido segue aguardando pagamento');
-- pedido cancelado: a cobrança aberta entra na lista para cancelar no provedor
select teste.ok(public.desistir_do_pedido(:'t1_cod', :'t1_tok', null) = 'cancelado', 'cancelamento: desistência antes de pagar cancela o pedido');
select teste.ok((select count(*) from public.cobrancas_para_cancelar('mock') where pedido_id = :'t1') = 1
                and (select count(*) from public.cobrancas_para_cancelar('mock') where pedido_id = :'t2') = 0
                and (select count(*) from public.cobrancas_para_cancelar('lytex') where pedido_id = :'t1') = 0,
                'cancelamento: só pedido cancelado com cobrança aberta, do provedor certo, entra na lista');
select teste.ok((select count(*) from public.cobrancas_para_conciliar('mock') where pedido_id = :'t1') = 1, 'tardio: enquanto o cancelamento no provedor não foi confirmado, a conciliação consulta o pedido cancelado');
select public.registrar_cobranca_cancelada(:'t1', 'expirada');
select teste.ok((select count(*) from public.cobrancas_para_conciliar('mock') where pedido_id = :'t1') = 0, 'cancelada no provedor, o pedido sai da conciliação (a fatura não pode mais ser paga)');
select teste.ok((select count(*) from public.cobrancas_para_cancelar('mock') where pedido_id = :'t1') = 0
                and exists (select 1 from public.audit_log where acao = 'cobranca_cancelada_no_provedor' and entidade_id = :'t1'),
                'cancelamento: depois de cancelada no provedor, sai da lista e fica no log');
-- pagamento chega depois do cancelamento: a conciliação olha o pedido cancelado e o banco não ressuscita o pedido
select teste.ok(public.aplicar_status_cobranca('mock', 'mock_cob_tardio_1', 'paga', :'t1') = 'pago_em_pedido_cancelado'
                and (select status from public.orders where id = :'t1') = 'cancelado', 'tardio: pagamento em pedido cancelado não ressuscita o pedido');
select teste.ok(public.iniciar_pagamento_tardio(:'t1') and not public.iniciar_pagamento_tardio(:'t1'), 'tardio: o tratamento é reservado uma vez só (sem estorno em duplicidade)');
select public.registrar_pagamento_tardio(:'t1', 'estorno_solicitado', 'estorno_pendente');
select teste.ok(exists (select 1 from public.audit_log where acao = 'pagamento_tardio_estorno_solicitado' and entidade_id = :'t1'), 'tardio: estorno automático solicitado fica no log');
select public.registrar_pagamento_tardio(:'t1', 'fila_admin', 'provedor recusou');
select teste.bloqueia(format('select public.registrar_pagamento_tardio(%L, %L)', :'t1', 'qualquer'), 'tardio: resultado desconhecido é recusado');
:comoC
select teste.ok((select count(*) from public.notificacoes where tipo = 'pagamento_tardio') = 1
                and (select count(*) from public.notificacoes where tipo = 'pagamento_divergente') = 1,
                'tardio e divergência: o admin é avisado (fila de atenção)');
select teste.ok((select count(*) from public.admin_pagamentos_tardios() where pedido_id = :'t1' and resultado = 'fila_admin') = 1, 'tardio: o admin vê o caso na fila, com o resultado do último tratamento');
:comoA
select teste.bloqueia($$select * from public.admin_pagamentos_tardios()$$, 'tardio: a fila é só do admin');
:comoServidor
reset role;

-- loja assume a taxa do afiliado
:comoServidor
select teste.ok((select not assume_taxa_afiliado from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'), 'assume taxa: padrão desligado');
select teste.ok((public.dados_split_pedido(:'cb1', 'mock') ->> 'assume_taxa_afiliado')::boolean = false, 'assume taxa: dados do split trazem a opção desligada');
:comoA
select public.salvar_assume_taxa(true);
select teste.ok((select assume_taxa_afiliado from public.producers where user_id = '00000000-0000-0000-0000-00000000000a'), 'assume taxa: a loja liga a opção');
select teste.bloqueia($$select public.salvar_assume_taxa(null)$$, 'assume taxa: valor nulo é recusado');
select teste.bloqueia($$update public.producers set assume_taxa_afiliado = false$$, 'assume taxa: a loja não altera a coluna direto (só pela função)');
:comoB
select teste.bloqueia($$select public.salvar_assume_taxa(true)$$, 'assume taxa: quem não tem loja não define');
:comoAnon
select teste.bloqueia($$select public.salvar_assume_taxa(true)$$, 'assume taxa: visitante não define');
select teste.bloqueia($$select loja_paga_taxa from public.catalogo_afiliados()$$, 'assume taxa: visitante não abre o catálogo');
:comoF
select teste.ok((select loja_paga_taxa from public.catalogo_afiliados() where id = :'aff_auto'), 'assume taxa: no catálogo, a loja que paga a taxa leva o aviso');
:comoA
select public.salvar_assume_taxa(false);
:comoF
select teste.ok((select not loja_paga_taxa from public.catalogo_afiliados() where id = :'aff_auto'), 'assume taxa: desligada, o aviso some do catálogo');
:comoA
select public.salvar_assume_taxa(true);
:comoServidor
select teste.ok((public.dados_split_pedido(:'cb1', 'mock') ->> 'assume_taxa_afiliado')::boolean, 'assume taxa: dados do split trazem a opção ligada');
reset role;
select teste.ok(exists (select 1 from public.audit_log where acao = 'assume_taxa_afiliado_alterado' and (detalhes ->> 'depois') = 'true'), 'assume taxa: a alteração fica no log');

-- saques dos usuários (área financeira)
:comoServidor
insert into public.saques (user_id, papel, valor_centavos, custo_centavos, provedor, chave_idempotencia)
values ('00000000-0000-0000-0000-00000000000a', 'produtor', 5000, 280, 'mock', 'chave-saque-a1');
select teste.bloqueia($$insert into public.saques (user_id, papel, valor_centavos, provedor, chave_idempotencia)
  values ('00000000-0000-0000-0000-00000000000a', 'produtor', 1000, 'mock', 'chave-saque-a2')$$, 'saques: só 1 pendente por pessoa');
update public.saques set status = 'concluido' where chave_idempotencia = 'chave-saque-a1';
select teste.bloqueia($$insert into public.saques (user_id, papel, valor_centavos, provedor, chave_idempotencia)
  values ('00000000-0000-0000-0000-00000000000a', 'produtor', 1000, 'mock', 'chave-saque-a1')$$, 'saques: a mesma chave não cria outro saque (idempotência)');
select teste.bloqueia($$insert into public.saques (user_id, papel, valor_centavos, provedor, chave_idempotencia)
  values ('00000000-0000-0000-0000-00000000000a', 'produtor', 0, 'mock', 'chave-saque-a3')$$, 'saques: valor zero é recusado');
:comoA
select teste.ok((select count(*) = 1 from public.saques), 'saques: a pessoa vê o próprio saque');
select teste.bloqueia($$insert into public.saques (user_id, papel, valor_centavos, provedor, chave_idempotencia)
  values ('00000000-0000-0000-0000-00000000000a', 'produtor', 100, 'mock', 'chave-saque-a9')$$, 'saques: a pessoa não cria saque direto no banco');
select teste.bloqueia($$update public.saques set status = 'falhou'$$, 'saques: a pessoa não altera saque');
:comoB
select teste.ok((select count(*) = 0 from public.saques), 'saques: outra pessoa não vê saque alheio');
select teste.bloqueia($$select * from public.meu_extrato_financeiro('admin', now() - interval '1 day', now())$$, 'extrato financeiro: papel inválido recusado');
select teste.ok((select count(*) = 0 from public.meu_extrato_financeiro('produtor', now() - interval '30 days', now())), 'extrato financeiro: quem não tem loja não vê pedidos de outros');
:comoC
select teste.ok((select count(*) >= 1 from public.saques), 'saques: o admin vê os saques de todos');
:comoAnon
select teste.bloqueia($$select * from public.saques$$, 'saques: visitante não lê');
select teste.bloqueia($$select * from public.meu_extrato_financeiro('produtor', now() - interval '1 day', now())$$, 'extrato financeiro: visitante não executa');
reset role;

\o
\echo '>>> TODOS OS TESTES PASSARAM'
