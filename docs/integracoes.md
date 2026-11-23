# Integrações da Staypse: o que lojistas e produtores precisam

Pesquisa feita em 23/11/2026 em páginas oficiais quando acessíveis. Onde só achei fontes de terceiros ou nada, está marcado. Nenhum endpoint ou preço foi inventado: "não confirmado" significa que a fonte oficial não pôde ser lida. Esforço: P (até 1 semana), M (2 a 4 semanas), G (mais de 1 mês), contando só a Staypse (Next.js + Supabase).

## Resposta curta

1. A base de tudo é a **API pública + webhooks de saída**. Com ela, Zapier, Make, n8n, ERPs, áreas de membros e CRMs se conectam sem a Staypse construir um conector por sistema.
2. Os conectores nativos que mais pesam para o lojista são **frete (Melhor Envio)**, **ERP (Bling primeiro)** e **nota fiscal de volta**.
3. Produtos digitais se resolvem com o padrão "pedido pago -> webhook -> liberar acesso", que a própria Staypse já deve ter como evento.

## 1. ERP, gestão e estoque

| Sistema | Para quê | API/webhook | Custo | Auth | Esforço | Fonte |
|---|---|---|---|---|---|---|
| Bling | Produtos, estoque, pedidos, NF-e | API v3 REST (`api.bling.com.br`, rotas `/Api/v3`), sem sandbox. Rate limit existe (429), valor não confirmado. Callbacks de estoque e pedido existem (relatados por integradores), lista oficial de eventos não confirmada | API incluída no Bling; plano por assinatura do lojista (valor não confirmado) | OAuth2, app registrado | G | [blog Bling](https://blog.bling.com.br/api-bling/), [portal dev](http://developer.bling.com.br/home) (conteúdo não carregou) |
| Tiny (Olist ERP) | Idem | API v3 REST com Swagger, OAuth2. Webhooks de pedido/estoque na v3 não confirmados | não confirmado (página oficial retornou 403) | OAuth2 | G | [dev.olist.com](https://dev.olist.com/en/guides-and-tutorials/authentication/oauth2) |
| Omie | Idem, foco PME | API JSON em `app.omie.com.br/api/v1/`; o portal tem aba de webhooks, config. não confirmada | não confirmado | app_key + app_secret (sem OAuth) | M a G | [ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/5412721-caracteristicas-e-recomendacoes-das-apis-do-omie) |
| Conta Azul | Financeiro e vendas | API v2 REST, OpenAPI. Sem base de testes (blog 2023). Webhooks não confirmados | não confirmado | OAuth2 + PKCE (relato de terceiro) | G | [portal](https://contaazul.com/desenvolvedores/) |

Leitura: os quatro exigem OAuth2 ou chaves por loja, tratamento de rate limit e mapeamento de produto/SKU. Comece por um (Bling) e deixe os demais para quando houver demanda real.

## 2. Nota fiscal (NF-e / NFS-e)

| Sistema | Para quê | API/webhook | Custo | Auth | Esforço | Fonte |
|---|---|---|---|---|---|---|
| Emissão pelo ERP do lojista (Bling, Tiny etc.) | Lojista já emite lá | Via conector de ERP: ler número/chave/situação da NF do pedido | já pago pelo lojista | ver ERP | M (dentro do conector) | acima |
| Focus NFe | Emissor via API | REST JSON, webhooks, NF-e/NFS-e/NFC-e; só certificado A1 | Solo R$ 94,90/mês (100 notas, extra R$ 0,11); Start R$ 119,90; Growth R$ 572,00 | token por empresa (não confirmado no preço) | M | [preços](https://focusnfe.com.br/precos/) |
| NFE.io | Emissor via API | REST, webhooks com HMAC | preços inconsistentes nas páginas; confirmar | chave no header | M | [docs](https://nfe.io/docs/rest-api/) |
| eNotas, PlugNotas | Emissor via API | não confirmado | não confirmado | não confirmado | M | [PlugNotas](https://tecnospeed.com.br/en/plugdfe/plugnotas/) |

**Como receber número/chave/XML na Staypse** (hoje a loja digita):
- Caminho universal e barato: endpoint `PUT /v1/pedidos/{id}/nota-fiscal` na API pública (número, série, chave de 44 dígitos, URL do XML/DANFE). Qualquer emissor ou automação chama.
- Validar a chave (44 dígitos, dígito verificador) e opcionalmente conferir o CNPJ emissor com o da loja.
- Depois, o conector do ERP ou do emissor chama esse mesmo endpoint, em vez de ter caminho próprio.
- A Staypse não emite nota. Continua sendo responsabilidade da loja (consistente com o modelo).

## 3. Frete e logística

| Sistema | Para quê | API/webhook | Custo | Auth | Esforço | Fonte |
|---|---|---|---|---|---|---|
| Melhor Envio | Cotação, carrinho, pagar e gerar etiqueta, rastreio de vários transportadores | REST com sandbox. Webhooks `order.*` (posted, delivered etc.), assinatura `X-ME-Signature` HMAC-SHA256, 5 tentativas | API sem custo anunciado nas páginas lidas; frete pago do saldo do lojista | OAuth2 (app + autorização por loja) | M | [docs](https://docs.melhorenvio.com.br/), [webhooks](https://docs.melhorenvio.com.br/docs/webhooks) |
| Frenet | Agregador de cotação | token por loja (painel Frenet); docs oficiais não localizadas | não confirmado | token | P a M | [guia Vnda](https://intercom.help/interno-vnda/pt-BR/articles/5644322-integracao-com-frenet) (terceiro) |
| Correios (API oficial) | Preço, prazo, rastro | APIs Preço/Prazo para contrato "a faturar"; Rastro restrito a objetos do contrato do remetente (regras de 27/04/2026) | exige contrato comercial por CNPJ | token via `api.correios.com.br/token/autentica` | M | [manual Preço](https://www.correios.com.br/atendimento/developers/manuais/manual-api-preco-1), [token](https://www.correios.com.br/atendimento/developers/manuais/manual-uso-da-api-token) |
| Jadlog | Inclusão, cancelamento, tracking | REST (PDF v2.1, 2023) | contrato com a Jadlog | código de franquia + token | M | [PDF](https://www.jadlog.com.br/jadlog/arquivos/api_integracao.pdf) |
| Loggi | Cotação, envio, status | docs em `docs.api.loggi.com`, não lida em detalhe | contrato | não confirmado | M | [Loggi](https://www.loggi.com/conteudos/inovacao/integracoes-loggi/) |
| Kangu | (descontinuada) | o Melhor Envio informa o fim da plataforma e das integrações | n/a | n/a | **não investir** | [Melhor Envio](https://melhorenvio.com.br/blog/ecommerce-e-marketplace/fim-da-kangu-o-que-aconteceu) |

Leitura: Melhor Envio concentra a maior parte dos transportadores com um só OAuth, o que o torna o melhor custo-benefício. Correios direto só vale para lojas com contrato; trate como fase 3. Rastreio automático = webhook do Melhor Envio gerando `pedido.enviado` e atualizando o status.

## 4. Produtos digitais e área de membros

| Sistema | Para quê | API/webhook | Custo | Auth | Esforço | Fonte |
|---|---|---|---|---|---|---|
| Padrão Staypse "pedido pago -> acesso" | Liberar curso/ebook/licença | Webhook de saída `pedido.pago` com itens digitais | zero | HMAC | P | seção Arquitetura |
| Memberkit | Área de membros | API REST com cadastro de webhooks (`POST /api/v1/hooks`, chave de API); eventos e payload não confirmados | não confirmado | chave de API | M | [ref.](https://ajuda.memberkit.com.br/referencia-api/post-hooks) |
| Cademí | Área de membros | só encontrei webhook de certificado emitido (terceiro); API de liberação não confirmada | não confirmado | não confirmado | M | [Voxuy](https://intercom.help/voxuy/pt-BR/articles/12055597-cademi) (terceiro) |
| Kiwify (referência) | Concorrente com API pública | `public-api.kiwify.com/v1`, Bearer token + `x-kiwify-account-id`. Não é destino de entrega da Staypse | n/a | Bearer | n/a | [docs](https://docs.kiwify.com.br/) |
| Hotmart (referência) | Padrão de postback | webhook de compra aprovada cria a conta na área externa | n/a | n/a | n/a | [Hotmart](https://help.hotmart.com/pt-br/article/215827858/como-integro-a-minha-area-de-membros-externa-com-a-hotmart-) |

Padrão recomendado: produto digital na Staypse tem um **destino de entrega** configurável: (a) área nativa (link/arquivo assinado, expira), (b) URL de webhook do produtor (Memberkit, Cademí, n8n), (c) e-mail com credencial. O evento `pedido.pago` dispara a liberação e `pedido.reembolsado` a revoga. Hotmart/Kiwify servem só como referência do padrão.

## 5. Marketing e atribuição

| Sistema | Para quê | API/webhook | Custo | Auth | Esforço | Fonte |
|---|---|---|---|---|---|---|
| Meta Pixel + Conversions API | Otimizar anúncios com compras | CAPI recebe eventos do servidor; em geral sem taxa de setup. Deduplicação por `event_id` (detalhe não confirmado na página lida) | grátis | access token por pixel | M | [Meta](https://developers.facebook.com/docs/marketing-api/conversions-api/) |
| TikTok Pixel + Events API | Idem | recomendada junto do pixel com deduplicação | grátis | access token | M | [TikTok](https://ads.tiktok.com/help/article/getting-started-events-api?lang=en) |
| Google Tag / GA4 | Métricas de funil | GTM/gtag no site (docs oficiais não lidas nesta pesquisa) | grátis | ID de medição | P | não confirmado |
| Google Merchant Center | Feed de produtos (Shopping) | Content API for Shopping encerrada em 18/08/2026; usar **Merchant API** (ou feed por arquivo/URL) | grátis | OAuth2/service account | M | [sunset](https://developers.google.com/shopping-content/guides/deprecation-and-sunset) |

Regras: cada **loja informa o próprio ID de pixel** (nunca um da Staypse nas lojas dela); o loja oficial pode ter pixel próprio. Por haver afiliados, atribuir a comissão é função da Staypse (link/cookie próprio), separado do pixel de anúncios.

**LGPD:** hoje o site não tem analytics. Pixels de anúncio são cookies não essenciais. O [guia da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/processo-guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf) trata consentimento como base mais adequada para publicidade. Então: banner com opção de recusar, scripts só carregam após aceite, CAPI server-side só para quem consentiu, e dados hasheados (e-mail/telefone) com base legal registrada. Confirmar com o jurídico (ver `docs/conformidade-juridica.md`).

## 6. Comunicação

| Sistema | Para quê | API/webhook | Custo | Auth | Esforço | Fonte |
|---|---|---|---|---|---|---|
| WhatsApp Cloud API (Meta) | Avisos de pedido, carrinho | REST + webhooks de status/mensagem; templates aprovados | cobrança por mensagem entregue desde 01/07/2025; valores em BRL na tabela da Meta (não lida); 1.000 conversas de serviço grátis/mês por número | token OAuth da Meta | G | [pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) |
| Resend (e-mail transacional) | Confirmação, acesso, rastreio | API REST; webhooks não confirmados | grátis: 3.000/mês, 100/dia; Pro US$ 20 (50 mil/mês), valores a confirmar | API key (Staypse, em env) | P | [docs](https://resend.com/docs/knowledge-base/account-quotas-and-limits) |
| RD Station Marketing | Lista, automação | OAuth2 + API key para conversões; webhooks de conversão (limite de 10, de terceiro) | não confirmado | OAuth2 | M | [dev RD](https://developers.rdstation.com/) |
| Brevo, Mailchimp | Listas/newsletter | não verificados nesta pesquisa | não confirmado | API key | M | não encontrado |

Observação: lista de marketing exige consentimento específico do comprador, que não pode ser presumido a partir da compra. E-mails transacionais da Staypse saem pelo domínio dela; os da loja (rastreio etc.) idealmente com o nome da loja.

## 7. Automação genérica (Zapier, Make, n8n)

| Sistema | Para quê | API/webhook | Custo | Esforço | Fonte |
|---|---|---|---|---|---|
| Zapier | Lojista sem programador | consome webhooks/REST | grátis ~100 tarefas/mês; Professional ~US$ 20 (anual) (terceiro) | P (reaproveita API) | [Zapier](https://zapier.com/blog/zapier-pricing/) |
| Make | Idem | idem | grátis 1.000 operações (terceiro, confirmar) | P | não confirmado oficial |
| n8n | Idem, auto-hospedável | idem | community grátis (hospedagem à parte) | P | não confirmado oficial |

Esses três não exigem conector por parte da Staypse: bastam **webhooks de saída** e **API REST documentada** (OpenAPI). Zapier/Make com app público próprio ficam para depois.

## 8. Marketplaces (Shopee, Mercado Livre)

- Mercado Livre: API com OAuth2 e notificações por tópico (orders, items, messages) ([docs](https://developers.mercadolivre.com.br/produto-receba-notificacoes)). Shopee Open Platform: API v2 com assinatura HMAC-SHA256 e Partner ID/Key, aprovação como parceiro (fonte de terceiros, não confirmado oficialmente).
- **Recomendação: não fazer agora.** O dono quer a loja oficial como destino. Importar catálogo de marketplace é útil só para onboarding (trazer produtos), enquanto sincronizar pedidos/estoque de volta cria disputa de canal, taxas de terceiros e conflito com o split da Lytex. Se houver demanda, oferecer apenas **importação de catálogo por CSV** (esforço P) e avaliar API depois (G).

## 9. Atendimento / CRM

| Sistema | Para quê | API/webhook | Custo | Esforço | Fonte |
|---|---|---|---|---|---|
| Chatwoot | Caixa de entrada omnicanal, open source | REST + webhooks, token `api_access_token`, auto-hospedável | gratuito self-hosted; planos pagos na nuvem | M | [Chatwoot](https://www.chatwoot.com/use-cases/conversation-infra) |
| Zendesk | Tickets | API REST | de terceiro: a partir de ~US$ 55/agente/mês (confirmar) | M | [comparativo](https://www.chatwoot.com/compare/zendesk) (terceiro) |
| Octadesk | Atendimento BR | não encontrado | não encontrado | M | não encontrado |

Para a própria Staypse: webhooks e API já permitem ligar qualquer um. Chatwoot é bom candidato para o suporte interno (disputas, reembolsos), não para a Staypse construir conector para lojistas.

---

## Arquitetura recomendada

**(a) Webhooks de saída assinados (HMAC)**
- Eventos: `pedido.criado`, `pedido.pago`, `pedido.enviado`, `pedido.cancelado`, `pedido.reembolsado`, `produto.atualizado` (depois: `pedido.entregue`, `nota_fiscal.registrada`, `estoque.baixo`).
- Assinatura no cabeçalho (ex.: `X-Staypse-Signature` = HMAC-SHA256 do corpo com secret por endpoint, com timestamp para evitar replay). Modelo parecido com o do Melhor Envio.
- Envio assíncrono por fila (tabela `webhook_entregas` + job), retentativas com backoff exponencial (ex.: 5 tentativas, depois desativa e avisa a loja), timeout curto, **idempotência** por `event_id`, e log consultável (status HTTP, tentativa, payload reenviável).
- O payload do pedido vai só para a **loja vendedora**; afiliado recebe apenas comissão e identificador, sem dados pessoais do comprador.
- Webhook do Lytex continua separado (entrada, valida pagamento). `pedido.pago` só nasce depois de pagamento confirmado pela Lytex.

**(b) API pública REST com token por loja**
- Prefixo `/v1`, documentação OpenAPI. Tokens gerados no painel da loja, mostrados uma vez, guardados só como hash.
- Escopos: `pedidos:ler`, `pedidos:atualizar` (rastreio, NF), `produtos:ler/escrever`, `estoque:escrever`, `webhooks:gerenciar`.
- Isolamento: toda consulta filtrada pelo `loja_id` do token (e RLS no Supabase como segunda barreira). Nunca aceitar `loja_id` do cliente.
- LGPD: dados do comprador (nome, CPF, endereço) só para a loja vendedora, o mínimo para despachar e emitir nota; log de acesso; rate limit por token.
- Endpoints do MVP: listar/buscar pedido, atualizar rastreio, registrar nota fiscal (número, série, chave, XML), atualizar estoque.

**(c) Conectores nativos priorizados**: Melhor Envio, Bling, emissor de NF (Focus NFe), pixels/CAPI. Cada conector é um módulo sobre a mesma camada de eventos e API (nada de lógica duplicada). Ver Roadmap.

**(d) Credenciais**
- Tokens OAuth, API keys e certificados **por loja** ficam no banco **criptografados** (Supabase Vault ou criptografia de aplicação com chave em env), em tabela sem acesso pelo cliente (RLS fechada, só service role no servidor). Nunca no código nem em logs.
- Refresh de tokens por job; marcar a conexão como "reautorizar" quando falhar e avisar a loja.
- Chaves **da Staypse** (client secret do app Melhor Envio/Bling, Resend, secret de assinatura mestre) só em variáveis de ambiente do deploy.
- Certificado digital A1 do lojista: não armazenar. Usar o emissor (Focus NFe etc.) ou o ERP.

---

## Roadmap priorizado

Confirmação da sugestão inicial: Melhor Envio, entrega digital por webhook e webhooks de saída ficam no MVP. **Bling sai do MVP**: é o item mais caro (G), tem OAuth2, mapeamento de SKU e rate limit, e eventos de webhook não confirmados oficialmente. No lugar, o MVP entrega o endpoint de nota fiscal na API, que atende o "Bling/qualquer emissor" via Make/n8n desde o dia um.

| Fase | Item | Impacto no lojista | Esforço |
|---|---|---|---|
| **1. MVP de lançamento** | Webhooks de saída assinados + log + retentativa | Base de tudo; libera Zapier/Make/n8n | M |
| | API pública mínima (token por loja, pedidos, rastreio, NF, estoque) | Fim da digitação de NF; automação | M |
| | Melhor Envio (cotação no checkout, etiqueta, rastreio automático) | Maior dor do físico: frete e despacho | M |
| | Entrega digital: área nativa + webhook de liberação/revogação | Resolve digitais sem depender de terceiro | P a M |
| | E-mail transacional (Resend) | Já previsto | P |
| **2. Até 90 dias** | Bling (pedidos, estoque, NF de volta) | Quem tem ERP evita redigitar | G |
| | Emissor de NF via API (Focus NFe, a validar com lojistas) | NF automática para quem não tem ERP | M |
| | Pixel Meta/TikTok/GA4 por loja com banner de consentimento + CAPI | Lojista rodar anúncios | M |
| | Feed Google Merchant (Merchant API ou arquivo) | Tráfego Shopping | M |
| | Importação de produtos por CSV | Onboarding | P |
| **3. Depois** | Tiny, Omie, Conta Azul (conforme demanda) | Cobertura de ERP | G cada |
| | WhatsApp Cloud API (avisos de pedido) | Conversão e recompra; custo por mensagem | G |
| | Correios direto, Jadlog, Loggi | Lojas com contrato próprio | M cada |
| | RD Station/Brevo/Mailchimp, Chatwoot | Marketing e suporte | M |
| | App público no Zapier/Make; API de marketplaces | Conveniência | M a G |

## Riscos

- **LGPD:** compartilhar dados do comprador com terceiros (ERP, transportadora, emissor) exige finalidade clara e contrato; a Staypse é operadora/controladora conjunta conforme o caso, e isto deve ser validado pelo jurídico. Pixels e e-mail marketing dependem de consentimento. Logs de webhook contêm dado pessoal: definir retenção curta.
- **Custos por chamada:** WhatsApp cobra por mensagem entregue; NF por nota (Focus NFe a partir de R$ 0,11 excedente); Zapier/Make cobram o lojista por tarefa. Decidir quem paga cada um.
- **Dependência de terceiros:** APIs mudam (Content API do Google foi encerrada em 18/08/2026, Kangu foi descontinuada, Correios restringiu o Rastro em 2026). Isolar cada conector em uma interface e monitorar erros por conexão.
- **Segurança:** tokens por loja são alvo; hash, escopos mínimos, rotação, rate limit e auditoria. Webhook de entrada com validação de assinatura e idempotência.
- **Escopo:** cada ERP é um produto de manutenção contínua. Começar pela API pública reduz a pressão por conectores.
- **Fiscal:** a Staypse não emite nota; evitar qualquer funcionalidade que a faça parecer emissora ou recebedora.

## Perguntas para o dono

1. Quais ERPs/emissores os primeiros lojistas realmente usam? (decide Bling x Tiny x Omie e Focus NFe x ERP)
2. Prefere que a Staypse tenha **contrato próprio** com Melhor Envio (um app só) ou cada loja conecta a sua conta? (recomendo conexão por loja)
3. Frete é pago pelo comprador no checkout ou subsidiado pela loja? Entra no split da Lytex?
4. Produtores digitais usam área de membros própria (Memberkit, Cademí) ou querem uma nativa na Staypse?
5. Aceita lançar sem analytics/pixels e entrar com consentimento só na fase 2?
6. Haverá cobrança por integração/API (plano premium) ou é gratuita para toda loja?
7. Afiliados poderão ver algum dado do comprador? (recomendação: não)
8. A importação de catálogo de Shopee/Mercado Livre é desejada, ou a loja oficial deve ser o único destino?
9. Qual o volume esperado de lojas e pedidos nos 6 primeiros meses? (dimensiona fila de webhooks e custo de Resend/WhatsApp)
