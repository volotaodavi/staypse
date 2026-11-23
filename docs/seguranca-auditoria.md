# Auditoria de segurança (somente leitura)

Escopo: webhook e conciliação de pagamentos, simulador, checkout e `criar_pedido`, atribuição (cookie, link curto, proxy), RLS e funções SECURITY DEFINER, server actions, tokens, headers e logs.
Método: leitura do código e das migrações em `supabase/migrations/*.sql`. Nada foi executado e nenhum código foi alterado. Lytex é TODO, então os achados sobre ela são requisitos para antes de ligar a integração.

## Resumo

| Severidade | Qtd |
|---|---|
| Crítica | 0 |
| Alta | 2 |
| Média | 10 |
| Baixa | 9 |

## Alta

### A1. `simuladorAtivo()` falha aberto fora da Vercel
- Local: `src/lib/pagamentos/index.ts:12` e `:25-26`.
- Problema: `nomeDoProvedor()` devolve `mock` sempre que `VERCEL !== "1"` e `PAYMENTS_PROVIDER` não está definido. `simuladorAtivo()` só bloqueia quando `VERCEL_ENV === "production"`. Em qualquer hospedagem que não seja a Vercel (VPS, Docker, Railway, Render) com `NODE_ENV=production`, o simulador fica ligado. O mesmo vale para um ambiente personalizado da Vercel (`VERCEL_ENV` diferente de `production`) com `PAYMENTS_PROVIDER=mock`.
- Exploração: com `COMPRAS_ABERTAS=1`, qualquer visitante cria um pedido e cai em `/simulador-pagamentos/cobranca/mock_cob_...`. Lá clica em "Pagar com Pix". As ações em `src/app/(site)/simulador-pagamentos/cobranca/[id]/acoes.ts:28` e `:75-77` assinam o webhook com o segredo do servidor e o pedido vira `pago`, sem pagamento. Se o pedido tem afiliado, a comissão fica "a receber". Com produto digital, o acesso é liberado na hora. As rotas `/api/webhooks/pagamentos/mock` e `/api/conciliacao` seguem a mesma regra.
- Correção:
  - Exigir `NODE_ENV !== "production"` além do `VERCEL_ENV`.
  - Exigir opt-in explícito, por exemplo `SIMULADOR_PAGAMENTOS=1`, que nunca é definido em produção.
  - Em produção sem `PAYMENTS_PROVIDER` definido, assumir `lytex` (fail closed) em vez de `mock`.
  - Falhar o boot se `NODE_ENV=production` e o provedor for `mock`.

### A2. Webhook `paga` não confere valor nem moeda
- Locais: `src/lib/pagamentos/tipos.ts` (tipo `EventoPagamento` sem valor), `src/lib/pagamentos/eventos.ts:48`, `supabase/migrations/20261206000001_cobranca.sql:231-234` (`aplicar_status_cobranca`).
- Problema: o evento só informa `provedorId`, `status` e `pedidoId`. Qualquer evento `paga` autêntico chama `confirmar_pagamento`, mesmo que o valor pago seja menor que `orders.total_centavos`. Isso inclui pagamento parcial, cobrança editada ou valor de outra moeda.
- Exploração (com a Lytex real): se a Lytex aceitar pagamento parcial, o comprador paga R$ 1 e o pedido é confirmado. A loja envia o produto e as comissões entram como "a receber".
- Correção: adicionar `valorPagoCentavos` e `moeda` ao evento. Passar o valor a `aplicar_status_cobranca` e recusar (erro registrado e alerta) se `valor < total` ou se o split snapshot não bater. Na conciliação, comparar o valor retornado por `consultarCobranca`.

## Média

### M1. `recuperarLink` permite tomar o link de um pedido, sem rate limit
- Locais: `src/app/(site)/pedido/[codigo]/acoes.ts:70-76`, `supabase/migrations/20261124000001_pedidos_checkout.sql:280-288`.
- Problema: código do pedido (10 caracteres hexadecimais, cerca de 40 bits) mais e-mail geram um token novo, devolvido direto na resposta (não enviado por e-mail). O token antigo é invalidado. Não há limite de tentativas. A mensagem de erro funciona como oráculo de "código e e-mail existem".
- Exploração:
  - Quem conhece o código e o e-mail (a loja, um vazamento, um atendimento) vê CPF, endereço e acesso digital, e derruba o link legítimo.
  - Um robô pode forçar o código com um e-mail conhecido, sem bloqueio.
  - Qualquer um pode invalidar o link de outro comprador sabendo apenas o código e o e-mail.
- Correção: enviar o novo link só ao e-mail do pedido (não devolver na tela) e responder sempre com mensagem neutra. Limitar por IP e por código (reaproveitar o padrão de `codigo_indicacao_tentativas`). Considerar não invalidar o token antigo.

### M2. Criação de pedidos sem limite por IP ou captcha
- Local: `src/app/(lojas)/loja/[slug]/[produto]/comprar/acoes.ts:117` (só existe honeypot em `:55` e limite de código inválido em `:97-107`).
- Problema: cada confirmação grava um pedido com PII (CPF, e-mail, endereço) e chama `provedor.criarCobranca` (cota e custo na Lytex). Nada limita a taxa.
- Exploração:
  - Script cria milhares de pedidos `aguardando_pagamento`. Isso polui o painel da loja e o do afiliado (ver B8) e esgota a cota da API do provedor.
  - Cria cobranças em nome de CPFs e e-mails alheios (um CPF válido qualquer é aceito).
- Correção: limite por IP (hash) e por e-mail ou CPF na função `criar_pedido`, no mesmo molde de `validar_codigo_indicacao`. Adicionar Turnstile ou similar. Limitar pedidos pendentes por CPF.

### M3. `recebedor_aprovado` falha aberto quando o provedor não devolve o documento
- Local: `supabase/migrations/20261127000001_recebedores_lytex.sql:151` (`r.documento_provedor is null or ...`). Relacionado: `src/app/(site)/painel/recebimento/acoes.ts:31-32` (afiliado e vendedor informam o documento livremente).
- Problema: se o webhook ou a consulta da Lytex vier sem `documento` (`aplicar_status_recebedor` grava `null`), a conferência CPF/CNPJ é pulada. Para afiliado e vendedor, o CPF do cadastro é digitado livremente, então a "conferência" depende só da Lytex.
- Exploração: afiliado informa o CPF de terceiro. Se o payload não trouxer documento, ele é aprovado e passa a receber split como esse CPF.
- Correção: exigir `documento_provedor is not null and = documento` para considerar aprovado. Tratar a ausência do campo como "em análise".

### M4. Payload bruto do webhook guardado sem minimização nem retenção
- Locais: `src/lib/pagamentos/eventos.ts:15` (`payload: JSON.parse(corpo)`), `supabase/migrations/20261127000001_recebedores_lytex.sql:214-230`, `supabase/migrations/20261203000001_juridico.sql:26-33` (limpeza diária não cobre `eventos_pagamento`).
- Problema: o corpo completo é gravado, para sempre, em `eventos_pagamento`. O payload real da Lytex deve trazer nome, CPF, e-mail e dados do pagador, e possivelmente dados do meio de pagamento. O acesso é só do admin por RLS, mas o volume de PII fica fora da política de retenção (LGPD, minimização).
- Exploração: vazamento de backup ou da conta admin expõe todo o histórico de pagadores. Contradiz o princípio da Staypse de não guardar dados de pagamento.
- Correção: gravar só campos de allowlist (ids, tipo, status, valor), ou o hash do corpo mais campos mínimos. Adicionar `delete from eventos_pagamento where recebido_em < now() - interval '...'` em `apagar_dados_vencidos`.

### M5. Pedido cancelado ou expirado continua com cobrança pagável no provedor
- Locais: `supabase/migrations/20261124000001_pedidos_checkout.sql:357-363` (`expirar_pedidos`, 3 dias), `:310-318` (`desistir_do_pedido`), `20261206000001_cobranca.sql:235-237` (`pago_em_pedido_cancelado`).
- Problema: ao cancelar por expiração ou desistência, a cobrança não é cancelada na Lytex. Se o comprador pagar depois (Pix antigo), o dinheiro entra, o pedido fica `cancelado` e o split já foi distribuído direto aos recebedores. Não há alerta nem estorno automático, só o efeito `pago_em_pedido_cancelado`, que o admin precisa achar manualmente.
- Exploração: cenário operacional, sem atacante. Pode ser provocado: o comprador cancela e paga o Pix já gerado, depois contesta (chargeback).
- Correção: expirar e cancelar também no provedor (`cancelarCobranca` na interface). Tratar `pago_em_pedido_cancelado` como evento de alerta e criar fila de estorno automático.

### M6. Cookie stuffing ainda possível na primeira indicação
- Local: `src/app/ir/[afiliado]/[produto]/abrir.ts:66-68`.
- Problema: `podeGravar = toqueDaPessoa || !outraIndicacao || ...`. Se o visitante ainda não tem indicação para o produto, qualquer navegação, mesmo disparada por script de outro site (redirect automático, `window.open`), grava o cookie. A proteção vale só para quem já tem outro afiliado no cookie. O ramo `!sec-fetch-site` também aceita qualquer cliente que omita o cabeçalho.
- Exploração: site de terceiros redireciona visitantes por `/@atacante/produto` sem clique. Se o visitante comprar depois, o atacante ganha a comissão. Requer ser afiliado aprovado do produto.
- Correção:
  - Só gravar quando `sec-fetch-site` for `none`, `same-origin` ou `same-site`, ou `sec-fetch-user: ?1`.
  - Aceitar a ausência do cabeçalho só para user agents conhecidos.
  - Registrar `sec-fetch-*` nos cliques para a loja auditar origem suspeita.

### M7. `link_externo_permitido` aceita barra invertida no host (bypass do CHECK por API direta)
- Local: `supabase/migrations/20261122000001_revisao_seguranca.sql:40-60` (`host_de` captura `[^/?#]+`; o filtro só barra `@` e `:`).
- Problema: `https://evil.com\.shopee.com.br/x` passa na constraint do banco (o host capturado termina em `.shopee.com.br`). Os navegadores tratam `\` como `/` em URLs `https`, então o destino é `evil.com`. A validação do app (`src/lib/previa-link.ts`, via `new URL`) bloqueia, mas o afiliado autenticado pode inserir direto em `external_links` pelo PostgREST com a chave pública e o próprio JWT (o grant de insert existe).
- Exploração: afiliado coloca link de phishing que parece de Shopee na vitrine `/v/slug` da Staypse. Visitantes saem para `evil.com` achando que vão ao marketplace.
- Correção: no banco, recusar `\`, espaços, caracteres de controle e `%` no host (`h ~ '^[a-z0-9.-]+$'`). Validar também a URL completa com `url !~ '[\\\s]'`. Manter o `rel="nofollow sponsored noopener noreferrer"`, que já existe.

### M8. Logs de erro guardam tokens do caminho e deixam passar telefone e CNPJ
- Local: `src/instrumentation.ts:27` (`caminho: request.path.split("?")[0]`) e `:11-16` (`limpar`).
- Problema: o filtro (`limpar`) só atua na mensagem. O caminho entra sem filtro, e `/convite/[token]` e `/afiliar/[token]` carregam o token secreto no path (64 hex, válido 14 a 30 dias). `/pedido/[codigo]` guarda o código do pedido. Na mensagem, `limpar` não cobre telefone, CNPJ, nome e endereço (erros do Postgres podem trazer `Key (...)=(...)`).
- Exploração: quem acessa `/admin/erros` (ou um backup de `erros_app`) obtém convites ainda válidos e pode aceitá-los, se tiver o e-mail confirmado correspondente (a função exige o mesmo e-mail, o que limita o risco, mas o token vaza). Também obtém códigos de pedido.
- Correção: aplicar `limpar()` e uma regex de token (`[0-9a-f]{32,}`) também ao `caminho`; ou normalizar com `contexto.routePath` (`/convite/[token]`) em vez de `request.path`. Estender `limpar` para telefone e CNPJ (14 dígitos) e para as sequências `Key (...)`.

### M9. Suspensão de usuário só vale na aplicação, não no banco
- Locais: `supabase/migrations/20261128000001_admin.sql:257-290` (apenas marca `profiles.suspenso_*`); `src/lib/papeis.ts` (`exigirPapel` redireciona). Nenhuma política RLS nem função usa `suspenso_em` (a única checagem de suspensão no banco é `producers.status_verificacao`).
- Problema: o usuário suspenso mantém o JWT, e a chave publicável (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) é pública. Ele pode chamar o PostgREST direto, por exemplo `minhas_comissoes`, `orders` (se produtor, com dados de compradores), `external_links`, `storefronts`. O link curto e `criar_pedido` continuam atribuindo vendas ao afiliado suspenso.
- Exploração: afiliado ou produtor suspenso por fraude continua vendendo e lendo dados pelo API.
- Correção: banir também na Auth (`auth.admin.updateUserById(id, { ban_duration })` e revogar sessões). Em RLS e funções, exigir `not public.usuario_suspenso()`. Em `abrir_link_afiliado`, `resolver_codigo_indicacao` e `criar_pedido`, ignorar afiliado suspenso.

### M10. Auto-indicação: o afiliado pode comprar pelo próprio link
- Locais: `supabase/migrations/20261205000001_codigo_indicacao.sql:96` e `:194` (só compara `p_comprador_id` quando o comprador está logado).
- Problema: compra como convidado (sem login) com CPF e e-mail próprios não é bloqueada. O afiliado ganha comissão sobre a própria compra (desconto efetivo). Para vendedor próprio "split_direto", é mais grave se o vendedor for a própria pessoa.
- Exploração: afiliado abre o próprio link, compra sem login e recebe a comissão. A desistência em 7 dias estorna, mas o abuso funciona depois do prazo. Também funciona com conta secundária.
- Correção: comparar também `comprador_documento` (CPF) com o documento do recebedor do afiliado (`recebedores.documento`) e o e-mail com o do afiliado; se baterem, zerar a atribuição (`v_afiliado := null`). Registrar a tentativa em `audit_log`.

## Baixa

### B1. Token do pedido sem expiração e `acesso_hash` legível
- Locais: `supabase/migrations/20261124000001_pedidos_checkout.sql:244-275`; `20261206000001_cobranca.sql:36-44` (grant de colunas só exclui `split_snapshot` e `cobranca_url`).
- O token (dois UUID v4, sha256 no banco) vale para sempre. A função `pedido_do_comprador` só verifica o hash. Os papéis com RLS (comprador, loja, admin) podem ler `acesso_hash` do `orders`. É um hash de segredo de alta entropia, então é inofensivo hoje, mas é desnecessário.
- Correção: excluir `acesso_hash` do grant de colunas. Expirar o token após N dias do fim do pedido, com renovação por e-mail (M1).

### B2. Webhook: corpo lido inteiro antes do limite, sem rate limit, concorrência no mesmo evento
- Local: `src/app/api/webhooks/pagamentos/[provedor]/route.ts:18-19`; `src/lib/pagamentos/eventos.ts:19-24`.
- `request.text()` lê o corpo todo antes do teste de 100 KB (a Vercel limita em 4,5 MB, então o risco é baixo). Duas entregas simultâneas do mesmo `evento_id` entram as duas no "reprocessar" (`processado_em` ainda nulo); a função do banco é idempotente (`for update`), então não há efeito duplo.
- Correção: checar `Content-Length` antes; para a Lytex, exigir timestamp assinado com tolerância (anti-replay, que hoje só existe como idempotência por `evento_id`) e, se possível, allowlist de IP. Manter a comparação em tempo constante já existente (`src/lib/pagamentos/mock.ts:90` está correta).

### B3. Evento `recebedor.status` sem validação de `status` na camada TS
- Local: `src/lib/pagamentos/mock.ts:87-95` (só valida `cobranca.status`).
- Status inválido vai ao banco, bate no CHECK e o webhook responde 500 em loop (o provedor reenvia). Sem impacto de segurança direto, mas gera ruído e DoS lógico.
- Correção: validar `status` contra a lista e `provedorId` não vazio em `validarWebhook`.

### B4. IP vindo de `x-forwarded-for` sem garantia fora da Vercel
- Locais: `src/lib/ip.ts:25`, `src/lib/acesso.ts:17`.
- Usa o primeiro item do cabeçalho; fora da Vercel o cliente pode forjá-lo e fugir do limite de 8 tentativas de código e do limite de cliques. Sem cabeçalho, todos caem no balde `"desconhecido"`.
- Correção: confiar só no cabeçalho do proxy conhecido (na Vercel, `x-vercel-forwarded-for` ou o último item) e tratar `desconhecido` com limite próprio.

### B5. Preço do resumo não amarrado ao pedido; estoque não reservado
- Locais: `src/app/(lojas)/loja/[slug]/[produto]/comprar/acoes.ts:84-86` e `:117-142`; `supabase/migrations/20261124000001_pedidos_checkout.sql:221-236` (`greatest(estoque - qtd, 0)`).
- `criar_pedido` recalcula o preço no banco (correto: o preço não vem do cliente), mas não compara com o total que o comprador aceitou. Se a loja alterar o preço entre o resumo e a confirmação, o comprador paga outro valor. O estoque só é baixado no pagamento, então pode haver venda acima do estoque.
- Correção: enviar `total_esperado_centavos` ao `criar_pedido` e recusar se diferir. Reservar estoque na criação do pedido (com expiração).

### B6. `recebedor_aprovado` executável por qualquer usuário logado para qualquer `user_id`
- Local: `supabase/migrations/20261127000001_recebedores_lytex.sql:147-155` (grant a `authenticated`).
- Permite descobrir quem tem recebimento aprovado (e para qual papel). Informação de baixo valor, mas desnecessária.
- Correção: restringir ao `service_role` ou ignorar `p_user` diferente de `auth.uid()` quando não for admin.

### B7. CSP sem `script-src`
- Local: `next.config.ts:28`.
- A CSP só tem `frame-ancestors`, `base-uri` e `form-action`. Não há contenção de XSS caso algum dia surja uma falha de renderização. Não foram encontrados `dangerouslySetInnerHTML` nem sinks óbvios, então é defesa em profundidade.
- Correção: adotar CSP com nonce (ou `strict-dynamic`) via proxy, compatível com o Next 16, começando em modo `Report-Only`.

### B8. Dados do comprador visíveis em pedidos não pagos
- Locais: `supabase/migrations/20261207000001_frete_e_comprador.sql:111-124` (`comprador_nome` em todo status); `src/app/(site)/painel/loja/pedidos/[codigo]/page.tsx:66-73` (CPF e telefone da loja em qualquer status).
- O afiliado vê o nome informado em pedidos `aguardando_pagamento` e `cancelado`, que não foram verificados. Um pedido falso com nome ofensivo aparece no painel do afiliado. A regra pede "só nome e valor pago" (cumprida: sem e-mail, CPF, telefone ou endereço).
- Correção: mostrar o nome do comprador ao afiliado só após o pagamento (`status in ('pago',...)`), preferindo o primeiro nome. A loja não precisa de CPF e telefone antes do pagamento.

### B9. `form-action 'self'` pode quebrar o redirecionamento ao checkout da Lytex sem JavaScript
- Local: `next.config.ts:28`.
- Observação funcional, com efeito de segurança neutro: no envio de formulário sem JS, o redirecionamento após o POST para o domínio da Lytex pode ser bloqueado pela CSP em alguns navegadores. Validar na integração real. Se necessário, incluir o domínio do checkout no `form-action`.

## Verificado e sem achado

- Webhook: o HMAC compara em tempo constante com checagem de tamanho (`mock.ts:88-90`). A rota exige simulador ligado para `mock`, Lytex responde 501, e o corpo é limitado. A idempotência por `unique (provedor, evento_id)` com reprocessamento de eventos com erro funciona.
- Conciliação: `CRON_SECRET` com mínimo de 16 caracteres, comparação por hash com `timingSafeEqual`, rota fechada (503) sem segredo (`src/app/api/conciliacao/route.ts`).
- Simulador: todas as páginas e ações checam `simuladorAtivo()`. O retorno `volta` é validado por regex (`VOLTA_VALIDA` e `/^\/painel\/[a-z/-]*$/`), sem open redirect. (Ver A1 sobre o fail-open.)
- Checkout: preço, frete e total vêm de `cotar_pedido` no banco. Quantidade validada entre 1 e 99 no app e no banco. O código de indicação é conferido no banco, com mensagem neutra e limite de 8 inválidos por hora por IP. `criar_pedido` só pode ser chamada pelo `service_role`. A afiliação aprovada é conferida de novo no banco.
- Cookie `staypse_atrib`: HMAC com `timingSafeEqual`, httpOnly, sameSite lax, validade conferida. Proxy e links curtos: regexes restritas, destino montado a partir do banco, sem open redirect. `proximoSeguro` cobre `//`, `\` e caracteres de controle.
- RLS e funções: todas as SECURITY DEFINER têm `set search_path = ''` e `revoke` de `public/anon`; as sensíveis só para `service_role`. `split_snapshot` e `cobranca_url` fora do grant de `orders`. O afiliado não lê `orders` (só a RPC `minhas_comissoes`, com nome e valor pago). `eventos_pagamento` só para admin.
- Server actions: todas as de painel e admin chamam `exigirPapel` e usam o cliente do usuário (RLS) ou RPCs que conferem `is_admin()`. As rotas CSV e relatórios também. IDOR: `pedido/[codigo]`, `atendimento/[protocolo]`, `convite/[token]` e `afiliar/[token]` exigem token de alta entropia guardado como sha256; convites têm expiração.
- Headers e segredos: HSTS, X-Frame-Options, nosniff, Referrer-Policy e `no-referrer` nas rotas com token. `poweredByHeader` desligado. Nenhum segredo no código ou no histórico do git: `.env.local` está ignorado e `.env.example` só tem placeholders. A chave secreta só é usada em módulos `server-only`.
