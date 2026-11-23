# Acessibilidade da Staypse

Meta: WCAG 2.2 nível AA (base legal: Lei Brasileira de Inclusão 13.146/2015, art. 63, e eMAG) e Lighthouse mobile de acessibilidade >= 95.
Data da auditoria: 2026-11-23. Ferramentas: axe-core 4.x via Playwright (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, mais best-practice nas checagens manuais), Lighthouse mobile, scripts de teclado.

## Resultado por rota (axe, 390px e 1280px)

Rotas varridas nos dois tamanhos: 21 públicas e 39 logadas (loja, afiliado, vendedor, admin), 116 varreduras por rodada.

| Rota | Violações antes | Depois | Notas |
|---|---|---|---|
| /painel/produtor/loja (editor da loja) | 7 + 7 (serious, label-content-name-mismatch) | 0 | Botão "Ocultar/Mostrar" da seção tinha aria-label sem o texto visível; agora o nome começa com o texto visível |
| Demais públicas: /, /lista/[código], /entrar, /cadastro, /termos, /privacidade, /cookies, /atendimento, /pedido, /denunciar, /loja/demo-casa-aurora, produto, /comprar, /@demo-bia-achados e outras vitrines, contrato, produtos proibidos, 404 | 0 | 0 | Já em conformidade no axe; ajustes manuais abaixo |
| Painel da loja e abas, produtor, frete, meus-dados | 0 | 0 | idem |
| Afiliado, catálogo, links, vitrine, organizar | 0 | 0 | idem |
| Vendedor | 0 | 0 | idem |
| Admin e todas as filas | 0 | 0 | idem |

Total de violações axe: antes 14 (serious), depois 0.
/pedido/[código] redireciona para /pedido sem o código de acesso (comportamento esperado); /painel/produtor/cadastro e /painel/revendedor redirecionam para o painel do perfil já aprovado.

## Lighthouse mobile (build de produção, porta 3100)

| Página | Acessibilidade | Desempenho (informativo) |
|---|---|---|
| / | 100 | 96 |
| Loja demo | 100 | 93 |
| Produto | 100 | 99 |
| Checkout | 100 | 99 |
| /entrar | 100 | 100 |
| Painel da loja | não medido (exige login) | coberto por axe, 0 violações |

## O que foi corrigido

- Editor da loja: botão de ocultar/mostrar seção com nome acessível "Ocultar seção X"/"Mostrar seção X" (inclui o texto visível, WCAG 2.5.3); removido aria-pressed redundante com rótulo que muda.
- Alvos de toque: abas "Com senha"/"Link por e-mail" (36 para 44px), botão "Entendi" do aviso de cookies (36 para 44px), botão padrão "Copiar link" (38 para 44px), opções de idade no cadastro com área maior (WCAG 2.5.8 e regra de 44px do projeto).
- Lista de espera: ao falhar a validação, um resumo "Há N campos para corrigir." é anunciado (role=alert) e o foco vai ao primeiro campo inválido (já existia), com aria-invalid e aria-describedby.
- Ilustração da página inicial: `<figure role="img">` trocado por `<div role="img">` (aria-allowed-role).
- Teste unitário novo `src/lib/tema.test.ts`: 729 cores do lojista (extremos inclusive, branco, preto, amarelo, cinzas médios) mantêm contraste AA em links, botões e destaque (usa preto/branco automático em lib/tema.ts).

## Verificado manualmente (já em conformidade)

- "Pular para o conteúdo" é o primeiro Tab e leva ao main (`#conteudo`); lang pt-BR; landmarks e títulos em ordem (axe best-practice sem achados).
- Tab/Shift+Tab em 27 páginas (formulários da lista, entrar, cadastro, checkout, atendimento, editor da loja, organizar vitrine, tabelas do admin): ordem lógica, nenhum elemento focado sem anel visível (outline 3px; ciano sobre fundo petróleo).
- Erros: entrar anuncia por role=alert e recebe foco; lista foca o primeiro inválido; atendimento e checkout usam validação nativa que foca o primeiro inválido.
- Editor da loja: subir/descer/ocultar acionáveis por Enter/Espaço, com região role=status anunciando o resultado.
- Imagens: decorativas com alt=""; produto com nome e número da foto; logo com alt.
- Texto ciano sobre branco: nenhum caso (axe de contraste sem achados); prefers-reduced-motion zera animações e transições em globals.css.

## E2E

lista, pedidos e admin passam. A etapa4 só passou depois de adaptar uma cópia do script para marcar o novo campo obrigatório "Sua idade" do cadastro (mudança de conteúdo do outro agente, fora do meu escopo); o script original em `scratchpad/e2e-etapa4.mjs` precisa desse ajuste. tsc, eslint, test:unit (45) e build passam.

## Limitações

- Testes automáticos cobrem cerca de 30% dos problemas; falta teste com leitores de tela reais (NVDA, VoiceOver, TalkBack) e zoom a 200%/400%.
- Lighthouse do painel logado não foi medido; usa-se o axe.
- Dados de demonstração: fluxos com estados raros (erros de pagamento, pedidos em todos os status) foram só parcialmente varridos.
- Validação nativa do navegador (atendimento, checkout) depende do idioma do navegador para a mensagem; vale migrar para mensagens próprias em português com aria-describedby.
- Textos jurídicos e campos dos formulários não foram alterados.
