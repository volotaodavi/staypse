# Conformidade jurídica: checklist (Staypse, pré-lançamento)

> Levantamento técnico feito sobre o código em 2026-12-03 (versão dos textos `2026-12-03.1`; contrato do produtor `2026-12-03.1`).
> **Não é aconselhamento jurídico.** Veja a seção "Revisão de advogado recomendada" no fim.
> Legenda: ✅ em conformidade | ⚠️ parcial ou depende do dono / de terceiro | ❌ faltava (e foi corrigido, quando marcado "corrigido").

## Leis e normas consideradas (fontes oficiais)

| Norma | Fonte |
|---|---|
| LGPD, Lei 13.709/2018 | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm |
| Marco Civil da Internet, Lei 12.965/2014 (arts. 15, 19 e 21) | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm |
| CDC, Lei 8.078/1990 (arts. 18, 26, 31, 35 a 37, 49) | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm |
| Decreto 7.962/2013 (comércio eletrônico) | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm |
| Lei 14.181/2021 (superendividamento) | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14181.htm |
| Direitos autorais, Lei 9.610/1998 | https://www.planalto.gov.br/ccivil_03/leis/l9610.htm |
| Propriedade industrial (marcas), Lei 9.279/1996 | https://www.planalto.gov.br/ccivil_03/leis/l9279.htm |
| Economia popular (pirâmide), Lei 1.521/1951, art. 2º, IX | https://www.planalto.gov.br/ccivil_03/leis/l1521.htm |
| ECA, Lei 8.069/1990 | https://www.planalto.gov.br/ccivil_03/leis/l8069.htm |
| Código Civil, Lei 10.406/2002 (arts. 3º, 4º, 5º, 20, 1.634) | https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm |
| Apostas, Lei 14.790/2023 (só em produtos proibidos; não se aplica à Staypse) | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14790.htm |
| ANPD: Guia orientativo de cookies (2022) | https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf |
| ANPD: Resolução CD/ANPD nº 2/2022 (agentes de pequeno porte) | https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-regulamento-para-pequenas-empresas |
| ANPD: página institucional (guias, enunciados, canal do titular) | https://www.gov.br/anpd/pt-br |
| CONAR: Guia de Publicidade por Influenciadores (2021) | http://www.conar.org.br/ |

(Confirme os links e a redação vigente antes de citar: normas e guias mudam.)

## 1. Itens pedidos pelo dono

| # | Item | Lei / base | Status | Evidência (arquivo) | Correção feita ou pendência |
|---|---|---|---|---|---|
| 1 | Política de privacidade | LGPD arts. 6º, 9º, 18, 41 | ✅ corrigido | `src/app/(site)/privacidade/page.tsx` | Cada dado agora tem finalidade, base legal **e prazo de retenção**. Entraram: denúncias, fotos publicadas, CEP/BrasilAPI, registros de acesso, aceite de idade, links externos. Encarregado e canal explicitados. |
| 2 | Termos de uso | CDC, Marco Civil, Decreto 7.962 | ✅ corrigido | `src/app/(site)/termos/page.tsx` | Novas seções: direitos de imagem e aviso de infração, avaliações falsas, idade mínima, publicidade (CONAR). Links para `/reembolso`. |
| 3 | Aviso de cookies | LGPD; Guia ANPD cookies | ✅ | `src/components/AvisoCookies.tsx` | Aviso informativo (só cookies próprios). Texto agora diz que não há publicidade nem rastreamento de terceiros. Comentário no código: se entrar analytics/pixel/embed, vira opt-in. |
| 4 | Política de cookies | Guia ANPD | ✅ corrigido | `src/app/(site)/cookies/page.tsx` | Tabela com nome, finalidade, duração e tipo de **cada** cookie: sessão Supabase (até 400 dias, antes dito "sessão"), verificador PKCE (faltava), `staypse_atrib`, preferência local. Seção "conteúdo de terceiros". |
| 5 | Política de reembolso | CDC arts. 18, 26, 35, 49; Decreto 7.962 art. 5º | ❌ → ✅ corrigido | `src/app/(site)/reembolso/page.tsx` (nova); linkada em rodapé do site e da loja, checkout, página do pedido, atendimento, sitemap | Arrependimento 7 dias (físico: do recebimento; digital: da contratação/acesso), como pedir, reembolso total pelo mesmo meio via Lytex, devolução sem custo, defeito (30/90 dias), não entrega, chargeback, quem responde. |
| 6 | Consentimento nos formulários | LGPD arts. 7º, 8º | ✅ corrigido | `lista/FormLista.tsx`; `cadastro/FormCadastro.tsx`; `comprar/FormCompra.tsx` | Lista de espera: caixa **não pré-marcada**, específica, com versão e data gravadas (`waitlist.consentimento_versao/_em`) e aviso de que pode retirar. Cadastro e checkout (execução de contrato): aceite explícito de Termos e Privacidade, gravado com data e versão (`terms_acceptances`, `orders.termos_versao`). Atendimento e denúncia: aviso de finalidade com link. |
| 7 | Só os dados necessários | LGPD art. 6º, III | ⚠️ | `comprar/acoes.ts`; `lista-schema.ts` | Idade: só declaração, sem data de nascimento. CPF no checkout é obrigatório para todos os produtos (nota fiscal e pagamento): ver revisão de advogado. WhatsApp da lista é obrigatório só para lojas e afiliados (opcional nos demais); CNPJ opcional; telefone do checkout opcional. |
| 8 | Embeds de terceiros | LGPD; Guia ANPD | ✅ corrigido | `src/lib/publico.ts`; `FormCompra.tsx` | Não há `<script>` externo, iframe, analytics, pixel nem Google Fonts em runtime (`next/font` instala a fonte no próprio site). Achados: (a) BrasilAPI no checkout: avisado no formulário e na Privacidade; (b) **imagens de Shopee/ML/TikTok carregadas no navegador do visitante**: removidas (a vitrine mostra o nome da plataforma). |
| 9 | Rastreamento / analytics | LGPD; Guia ANPD; Marco Civil | ⚠️ | `src/app/ir/**`, `src/lib/atribuicao.ts` | Nenhum analytics. Cliques gravados com IP em hash. Cookie `staypse_atrib` é first-party mas **não essencial**: base de legítimo interesse documentada, com direito de oposição; risco anotado para o advogado. |
| 10 | Sem avaliação falsa | CDC arts. 36, 37; Lei 9.279 art. 195 | ✅ | busca em `src` por estrelas, depoimentos, avaliações e números de vendas: nenhum | A landing usa mockup com formas e legenda "Ilustrativo" (`inicio.tsx`). Seed demo usa só formas geradas (não rodar em produção). Termos e contrato proíbem avaliação falsa, comprada, "cliente" inventado e números falsos. |
| 11 | Direito das imagens | Lei 9.610; Lei 9.279; CC art. 20; Marco Civil arts. 19 e 21 | ✅ corrigido | Termos (`#direitos-imagem`), contrato, `denunciar/page.tsx`, `arquivos.tsx`, formulários de loja e vitrine | Lojista/afiliado declara direito sobre fotos, textos, marcas e imagem de pessoas; aviso e remoção (notice-and-takedown, contra-manifestação, ordem judicial, art. 21). Dicas nos uploads. Imagens do site: só `public/brand` (marca própria) e imagens geradas por código. |
| 12 | Leis locais | CF art. 24; ISS/ICMS; Procon | ⚠️ | n/a | Fora do código: ver revisão de advogado (alvará e ISS em Maricá/RJ, MEI, produtos regulados, Procon-RJ). Foro: domicílio do consumidor (CDC art. 101), Maricá/RJ nos demais casos. |
| 13 | Outros riscos legais | vários | ⚠️ | ver seção 3 | Lista abaixo. |

## 2. Checklist por lei

### LGPD (Lei 13.709/2018)

| Exigência | Status | Evidência | Nota |
|---|---|---|---|
| Bases legais por tratamento (art. 7º) | ✅ | Privacidade, tabela por finalidade | Consentimento só na lista de espera. |
| Finalidade e minimização (art. 6º, I e III) | ⚠️ | idem | Ver item 7. |
| Retenção definida | ✅ corrigido | `apagar_dados_vencidos()` (migração `20261203000001_juridico.sql`) | Clicks 24 meses, erros 90 dias, atendimentos 5 anos, registros de acesso 6 meses. Depende do `pg_cron` ativo no Supabase. Lista de espera "12 meses após o lançamento" não tem rotina automática. |
| Direitos do titular (art. 18) | ✅ | `painel/meus-dados`; atendimento com assuntos LGPD; resposta em 15 dias | Exportação JSON (`meus_dados()`) não inclui os registros de acesso. |
| Encarregado (art. 41) e Res. ANPD 2/2022 | ⚠️ corrigido | Privacidade, `#canal-lgpd` | Canal existe (conta, atendimento, e-mail). **O e-mail está como placeholder** e não é mais exibido (pendência do dono). |
| Compartilhamento e operadores | ✅ | Privacidade | Supabase, Vercel, Resend, Lytex, BrasilAPI, produtores. |
| Transferência internacional (art. 33) | ⚠️ | Privacidade | Resend e Vercel podem tratar fora do Brasil. Falta formalizar DPA e cláusulas-padrão (Res. CD/ANPD 19/2024). |
| Registro das operações (art. 37) | ⚠️ | esta tabela serve de base | Manter ROPA simples. |
| Incidentes (art. 48) | ⚠️ | n/a | Não há plano escrito de resposta a incidente. |
| Crianças e adolescentes (art. 14) | ✅ | Privacidade, cadastro, lista | Ver decisão de idade abaixo. |

### Marco Civil (Lei 12.965/2014)

| Exigência | Status | Evidência | Correção |
|---|---|---|---|
| Guarda de registros de acesso por 6 meses (art. 15) | ❌ → ✅ corrigido | A Privacidade já prometia, mas **nada era gravado**. Agora: `src/lib/acesso.ts`, tabela `registros_acesso`, chamado em login, cadastro, link de e-mail e criação de pedido; só admin lê; apagado aos 6 meses; testes em `rls_test.sql` | Interpretação adotada: eventos de acesso autenticado e transações, não cada pageview. Validar com advogado. Aplicar a migração em produção (não foi aplicada). |
| Retirada de conteúdo (arts. 19 e 21) | ✅ corrigido | Termos `#direitos-imagem`; botão Denunciar em loja, produto e vitrine | Cumpre ordem judicial; remove conteúdo íntimo no aviso; remoção voluntária por violação aos Termos. |

### CDC e Decreto 7.962/2013

| Exigência | Status | Evidência | Nota |
|---|---|---|---|
| Arrependimento 7 dias (CDC 49) e meios (Decreto art. 5º) | ✅ | botão "Desistir" no pedido (`pedido/[codigo]/page.tsx`), `/reembolso` | Digital também é aceito (o banco permite se pago e dentro do prazo). **Falta e-mail de confirmação do pedido e da desistência** (Decreto art. 4º, VII, e art. 5º, § 3º): hoje só há confirmação na tela. |
| Identificação do fornecedor (Decreto art. 2º, I) | ⚠️ | `src/config/empresa.ts`; rodapés | **Endereço está incompleto ("Maricá, RJ") e e-mail/WhatsApp são placeholders.** Pendência do dono. Placeholders não aparecem mais ao público: mostra o atendimento no lugar. |
| Resumo do contrato antes da compra (art. 4º, I) e informação clara (CDC 6º, III; 31) | ✅ | `FormCompra.tsx` (resumo com preço, frete, prazos, vendedor, desistência) | |
| Atendimento facilitado (art. 4º, IV) | ✅ | `/atendimento` com protocolo e prazo | |
| Publicidade enganosa / identificada (CDC 36, 37; CONAR) | ✅ corrigido | vitrine marcada "Publicidade"; cartões de links externos: "Publicidade" + "confira o preço lá"; Termos e `anuncios.ts` pedem "publicidade"/"#publi" e proíbem promessa de ganho | Preço de link externo é do dia do cadastro: risco de desatualização, avisado. Termos exatos do Guia CONAR a conferir. |
| Vício e garantia (CDC 18, 26) | ✅ | `/reembolso` | Responsabilidade da loja; a Staypse pode ter responsabilidade solidária como integrante da cadeia (art. 7º, parágrafo único): ver advogado. |
| Lei 14.181 (superendividamento) | ➖ não se aplica hoje | | Só se houver crédito/parcelamento oferecido pela Staypse (hoje é da Lytex). |

### Direito autoral, marcas, pirâmide, menores, publicidade

| Norma | Status | Nota |
|---|---|---|
| Lei 9.610 / Lei 9.279 | ✅ | Declaração do lojista, notice-and-takedown, produtos proibidos (réplicas, pirataria). |
| Lei 1.521/51, art. 2º, IX | ✅ | Só comissão sobre vendas próprias; sem recrutamento (Termos, contrato, FAQ); "renda garantida" proibida. |
| ECA / idade mínima | ⚠️ | Decisão abaixo. |
| CONAR, Guia de Influenciadores 2021 | ✅ | Orientação "Publicidade"/"#publi" nos Termos, vitrine e regras de anúncio. |
| Lei 14.790/2023 | ➖ | Só aparece na lista de produtos proibidos. |

## 3. Decisão do dono: idade mínima

Decisão registrada: **16 anos para afiliado e vendedor da loja**, com declaração de autorização dos responsáveis para 16 e 17 anos (Código Civil art. 4º, I, relativamente incapaz; art. 1.634, VII); **responsável de loja (CNPJ): 18 anos ou emancipado**, porque representa pessoa jurídica e assina o contrato do produtor; **comprador**: menor de 18 só com o responsável (menor de 16 apenas por meio dele). O dono vai tratar a idade mínima de recebimento com a Lytex.

Implementação: cadastro com declaração de faixa (`idade`: "18 ou mais/emancipado" ou "16 a 17 com autorização"), **sem data de nascimento**, validada no servidor (`cadastro/acoes.ts`); produtor só com "18 ou mais"; declaração guardada em `raw_user_meta_data.declaracao_idade`; contrato do produtor pede a declaração de 18 anos e poderes; checkout inclui "18 anos ou mais ou compro com autorização do responsável"; lista de espera: "16 anos ou mais (menor de 18 com autorização)"; Termos e Privacidade atualizados.

**Risco:** conta de relativamente incapaz sem assistência pode ser anulável (CC art. 171, I) e a Lytex pode recusar o cadastro de recebimento (hoje exige, em geral, maioridade ou conta de menor). A declaração é autodeclarada e não verificada; o consentimento dos responsáveis não é comprovado. Se a Lytex não aprovar menores, afiliados de 16 e 17 anos ficam sem poder receber: ajustar o texto.

## 4. Pendências do dono (dados que só ele tem)

1. E-mail de atendimento, WhatsApp e e-mail do encarregado (`src/config/empresa.ts`, hoje `[e-mail]`/`[WhatsApp]`).
2. Endereço completo (rua, número, CEP) do cartão CNPJ.
3. Confirmar com a Lytex: prazos reais de reembolso por meio de pagamento, regras de idade e quem processa o estorno (o texto de `/reembolso` não promete prazo numérico).
4. Aplicar a migração `20261203000001_juridico.sql` em produção (não foi aplicada) e confirmar que `pg_cron` roda `apagar_dados_vencidos()`.
5. DPA com Supabase, Vercel e Resend; aceite do contrato de operador da Lytex.
6. Decidir se envia e-mail de confirmação de pedido e de desistência (Decreto 7.962, art. 4º, VII).
7. Cada produtor já aprovado precisará aceitar de novo o contrato (versão `2026-12-03.1`).

## 5. Revisão de advogado recomendada

1. **Idade mínima de 16 anos** (seção 3): validade da declaração de autorização, anulabilidade, responsabilidade pelos pais, compatibilidade com as regras da Lytex; e a diferença entre capacidade para criar conta e para receber dinheiro.
2. **Natureza jurídica**: MEI como operador de plataforma (CNAE, limite de faturamento, intermediação); responsabilidade solidária da Staypse na cadeia de consumo (CDC arts. 7º, parágrafo único, e 25, § 1º) mesmo sem receber o dinheiro.
3. **Cookie `staypse_atrib`**: legítimo interesse ou consentimento (Guia ANPD de cookies); necessidade de LIA escrita. Se virar opt-in, o atribuição por link muda.
4. **Registros de acesso (art. 15)**: escopo (só login/cadastro/pedido, não cada pageview) e se a Staypse é "provedor de aplicações" obrigado; guarda de IP puro vs. minimização.
5. **CPF obrigatório** no checkout inclusive para produto digital: necessidade (nota fiscal e pagamento) e quem é controlador (loja ou Staypse).
6. **Produto digital e arrependimento**: manter reembolso mesmo com acesso liberado (posição atual: sem exceção) vs. regras da Lytex.
7. **Classificação como agente de pequeno porte** (Res. ANPD 2/2022) e dispensa de encarregado nominal; modelo de ROPA e plano de incidentes.
8. **Transferência internacional**: Vercel e Resend (cláusulas-padrão, Res. CD/ANPD 19/2024).
9. **Contrato do produtor**: vendedores "folha" vs. "split direto" (vínculo CLT art. 9º), cláusula de regresso, foro em Maricá/RJ para empresas.
10. **Texto do CONAR** (termos aceitos para identificar publicidade) e responsabilidade da Staypse por anúncios de afiliados.
11. **Leis locais**: alvará, ISS/ICMS, produtos regulados (alimentos, cosméticos, suplementos) e regras do estado e município; Procon-RJ.
12. **Aviso de infração**: formulário mínimo, prazos de resposta e política de reincidência (Lei 9.610 e Marco Civil).
13. **Publicidade de preço em links externos** (CDC art. 31 e 37): preço do dia do cadastro com aviso é suficiente?

## 6. Arquivos alterados nesta revisão

`src/config/empresa.ts` (versões, `CONTATO`), `src/app/(site)/{privacidade,termos,cookies,contrato-produtor,produtos-proibidos,atendimento,denunciar,convite,pedido}`, `src/app/(site)/reembolso/` (novo), `cadastro/`, `entrar/acoes.ts`, `lista/FormLista.tsx`, `comprar/`, `src/components/{Rodape,AvisoCookies,arquivos,publico}.tsx`, `src/app/(lojas)/{layout,v/[slug]/page}.tsx`, `src/lib/{acesso,publico,anuncios,email-conteudo}.ts`, `src/app/auth/confirmar/route.ts`, `src/app/sitemap.ts`, `supabase/migrations/20261203000001_juridico.sql`, `supabase/tests/rls_test.sql`.
