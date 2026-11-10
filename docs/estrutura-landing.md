# Landing page Staypse: esqueleto (Etapa 1: estratégia e conteúdo)

**Objetivo da página:** lista de espera.
1. Principal: cadastrar afiliados.
2. Secundário: cadastrar fábricas.

**Posicionamento:** "Indicar é emprestar seu nome." A Staypse só aceita produto que vale esse nome.

**Tom:** direto, humano, brasileiro. Sem "liberdade", "renda extra fácil", "fique rico". Sem números ou depoimentos inventados.

**Lógica da ordem:** sentir → entender → confiar → agir. O CTA principal do afiliado aparece 3 vezes, sempre com o mesmo texto. A fábrica tem atalho na abertura e um bloco próprio, com CTA e formulário separados.

---

## 1. Abertura (hero)
- **Objetivo:** em 5 segundos, o afiliado pensa "isso é pra mim".
- **Mensagem:** "Indicar é emprestar seu nome. Aqui só entra produto que vale o seu."
- **CTA:** "Quero entrar na lista" (afiliado). Link discreto: "Tem uma fábrica? Veja aqui" (leva à seção 9).
- **Por que aqui:** é onde se decide se a pessoa continua. O posicionamento vem antes de qualquer explicação. O link da fábrica atende o público secundário sem dividir o destaque.

## 2. Espelho (a dor)
- **Objetivo:** o afiliado se sentir entendido: produto milagroso, cliente reclamando no direct, vergonha de ter indicado.
- **Mensagem:** "Você já indicou algo que não usaria e sentiu o peso disso depois."
- **CTA:** nenhum.
- **Por que aqui:** conexão emocional antes da explicação técnica. Sem ela, a seção 4 vira só mais uma plataforma.

## 3. A virada (manifesto curto)
- **Objetivo:** transformar o cansaço em escolha.
- **Mensagem:** "Seu nome vale mais que uma comissão."
- **CTA:** nenhum.
- **Por que aqui:** ponte entre a dor e a solução. Dá ao afiliado uma identidade para assumir.

## 4. O que é a Staypse
- **Objetivo:** explicar de forma simples o que é.
- **Mensagem:** "Uma plataforma de afiliados com produtos físicos de pequenas fábricas brasileiras, feitos por gente de verdade, para você indicar sem medo."
- **CTA:** nenhum.
- **Por que aqui:** a pessoa só quer saber o que é depois de sentir que é para ela.

## 5. Como escolhemos os produtos
- **Objetivo:** provar a promessa sem inventar números. Mostrar o filtro: o que entra e, principalmente, o que não entra.
- **Mensagem:** "Não entra qualquer produto, e a gente mostra o porquê."
- **CTA:** "Quero indicar produtos assim".
- **Por que aqui:** responde à desconfiança natural ("todo mundo diz isso"). Sustenta o posicionamento inteiro.

## 6. Como funciona pra você
- **Objetivo:** tirar o atrito. Mostrar que é simples e que a pessoa continua no controle.
- **Mensagem:** "Você escolhe o que indica, do seu jeito, nos canais que já usa."
  Três passos: entra na lista → escolhe os produtos → indica no Instagram, TikTok, WhatsApp ou tráfego pago.
- **CTA:** nenhum (a próxima seção já é o formulário).
- **Por que aqui:** depois de "quero isso", a dúvida seguinte é "dá trabalho?".

## 7. Pra quem é (e pra quem não é)
- **Objetivo:** reforçar a identidade e afastar quem só quer dinheiro rápido.
- **Mensagem:** "Se você quer vender qualquer coisa a qualquer custo, aqui não é o seu lugar."
- **CTA:** nenhum.
- **Por que aqui:** logo antes do formulário, faz quem se identifica sentir que está entrando num grupo seleto.

## 8. Formulário do afiliado (conversão principal)
- **Objetivo:** cadastrar e dizer com honestidade o que acontece depois (ex.: "a gente avisa quando abrir").
- **Mensagem:** "Entre agora e seja um dos primeiros afiliados da Staypse."
- **CTA:** "Entrar na lista de espera". Poucos campos: nome, contato e canal principal.
- **Por que aqui:** o visitante já passou por emoção, explicação, prova e facilidade.

## 9. Bloco das fábricas
- **Objetivo:** a fábrica entender que vai ter afiliados que indicam o produto com cuidado, não de qualquer jeito.
- **Mensagem:** "Seu produto merece ser indicado por quem acredita nele."
- **CTA:** "Quero cadastrar minha fábrica", com formulário separado e campos próprios.
- **Por que aqui:** depois da conversão principal, para não competir com ela, mas com título bem marcado e atalho na abertura. CTA e formulário diferentes evitam confusão entre os públicos.

## 10. Perguntas frequentes
- **Objetivo:** derrubar as últimas objeções: quando lança, se é pago, se precisa de muitos seguidores, que tipo de produto entra.
- **Mensagem:** respostas curtas e diretas.
- **CTA:** nenhum.
- **Por que aqui:** quem chegou até aqui está interessado, mas ainda tem uma dúvida.

## 11. Fechamento
- **Objetivo:** última chance de conversão, retomando a frase âncora.
- **Mensagem:** "Indicar é emprestar seu nome. Empreste para quem merece."
- **CTA:** "Entrar na lista" (afiliado).
- **Por que aqui:** fecha o ciclo emocional que começou na abertura.

---

## Primeira versão: essencial ou opcional

**Essenciais:** 1 Abertura · 2 Espelho · 4 O que é · 5 Como escolhemos · 6 Como funciona · 8 Formulário do afiliado · 9 Bloco das fábricas

**Opcionais:**
- **3 Manifesto:** pode virar uma frase no fim da seção 2.
- **7 Pra quem não é:** forte para o posicionamento, mas dá para pular no começo.
- **10 Perguntas frequentes:** só com respostas já decididas.
- **11 Fechamento:** barata de fazer; vale incluir se der.

## Pendências antes de publicar
No código, procure por `PROPOSTA` (texto escrito, falta confirmar) e `PENDENTE` (falta decidir).

1. **Critérios de curadoria** (seção 5): há uma proposta no `index.html`. Confirme ou troque cada item, porque viram promessa pública.
2. **Passo 2 de "Como funciona"**: confirmar que o afiliado vai ver quem fabrica, onde e o que o produto entrega.
3. **Bloco das fábricas**: confirmar a frase "Estamos montando a primeira seleção de produtos" e os campos do formulário.
4. **Perguntas sem resposta**: "É pago para entrar?" e "Preciso ter muitos seguidores?" estão escondidas até haver resposta.
5. **Política de privacidade** (`privacidade.html`): preencher razão social, CNPJ, e-mail de contato e data. Ideal: revisão de um advogado.
6. **Supabase**: criar o projeto e preencher `js/config.js` (ver `docs/supabase-setup.md`).
7. **Etapa visual**: identidade (cores, fontes), imagem de compartilhamento (`og:image`) e domínio.
