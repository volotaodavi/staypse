# Avaliação da landing da Staypse

Método: `marketing-skills:cro` (valor em 5 s, headline, CTA, hierarquia, prova, objeções, fricção) e `marketing-skills:copywriting` (clareza, especificidade, teste de troca, sem afirmação que não se prove). Capturas em `docs/benchmark/landing-*.webp` (390 e 1440 px, primeira dobra; mais uma rolagem para Kiwify, Hotmart, Nuvemshop e Braip). Complementa o `docs/benchmark-ux.md`.

Limites: a Yampi respondeu só a verificação de segurança do Cloudflare (sem captura). A Monetizze e a Braip abriram, mas a primeira dobra é pouco informativa. O Parceiro Magalu abre direto em escolha de perfil (Influenciador ou Empresa).

## O que cada concorrente faz bem

| Concorrente | O que faz bem | O que não copiar |
|---|---|---|
| Hotmart | Promessa clara no título, duas ações ("Comece gratuitamente" e "Entrar"), seção "Taxa" no menu, FAQ no fim, selo de comunidade. | "Você ganha mais desde o primeiro dia" é promessa de ganho. |
| Kiwify | Hero curtíssimo ("Venda seu curso online") com UM botão, mosaico de telas do produto ao lado, preço dito sem rodeio ("8,99% + R$ 2,49"), FAQ, "Quanto custa?" na página. | Prêmios (viagem), depoimentos e números que a Staypse não tem. |
| Eduzz | Menu por etapa (Vender, Entregar, Gerir, Crescer), um painel único como ideia central. | Hero institucional e longo, sem ação óbvia na dobra. |
| Monetizze | Porta de entrada por perfil no menu (físico, digital, loja, afiliado, influencer). | "Lucro" no título; primeira dobra sem prova nem demonstração. |
| Braip | Números grandes e app. | Números que a Staypse não pode ter ainda. |
| Nuvemshop | Fotografia de pessoa real, dois botões claros ("Criar loja grátis" e "Falar com Vendas"), seções com um assunto cada, comparação por situação ("Já vende em rede social / loja física / marketplace"). | Excesso de produtos no mesmo scroll. |
| Shopify Brasil | Demonstração do produto em tela, títulos curtos por recurso. | Linguagem de IA genérica. |
| Parceiro Magalu | Duas portas claras (Influenciador, Empresa), comissão máxima escrita. | "Renda extra" no título da aba. |

Padrões que funcionam e a Staypse pode usar honestamente: demonstração do produto em tela, um botão principal repetido, preço/taxa dita com franqueza, seção por perfil, FAQ com objeções reais.

## Antes (landing de pré-lançamento anterior)

Medições: Lighthouse mobile contra `next dev` (dev penaliza desempenho): desempenho 74, acessibilidade 100, boas práticas 100, SEO 100, CLS 0, LCP 0,9 s. Rolagem horizontal: nenhuma de 360 a 1440. Alvos menores que 44 px: só os links do rodapé (28 px).

| Critério | Nota | Justificativa |
|---|---|---|
| Clareza da proposta em 5 s | 7 | A frase da marca é vaga, mas o subtítulo diz "plataforma de afiliados para produtos físicos e digitais". Falta dizer para quem em uma linha. |
| Hierarquia e estrutura | 6 | Quatro faixas de público idênticas e longas empurram o formulário para depois de seis seções. Poucas quebras de ritmo. |
| Prova e credibilidade (honesta) | 6 | Regras claras são boas, mas não há demonstração visual do painel nem comparação do que muda. |
| CTA e fricção do formulário | 7 | CTA único e barra fixa no celular. Formulário aparece tarde e sem resumo do que acontece depois de entrar. |
| Objeções e FAQ | 7 | Nove perguntas boas. Falta dado e privacidade. |
| Design e modernidade | 6 | Limpo e coerente, mas faixas repetidas dão cara de modelo pronto. |
| Mobile | 8 | Sem rolagem horizontal, botão fixo. Página muito comprida. |
| Velocidade e acessibilidade | 9 | A11y 100, CLS 0. Links do rodapé com 28 px. |
| Diferenciação vs concorrentes | 5 | Não mostra o que muda em relação ao jeito atual de ter afiliados (planilha, link solto, acerto manual). |
| Conformidade | 9 | Sem promessa de ganho, Lytex e "nunca recebe" presentes. |
| **Geral** | **7,0** | Boa base honesta; falta estrutura de venda, demonstração e comparação. |

## Depois (landing redesenhada)

O que mudou: hero com a frase exata, subtítulo que diz como o negócio funciona e três faixas de confiança sob o botão; comparação "como costuma ser hoje" x "com a Staypse" (sem citar concorrente); "Como funciona" em 3 passos; quatro cartões por papel (loja com 4 modelos de loja oficial, afiliado com vitrine e código de indicação, vendedor de loja, comprador com 7 dias); demonstração do painel da loja marcada "Ilustrativo", sem valor de ganho; regras; formulário com resumo do que esperar (grátis, só o necessário, exclusão de dados); FAQ em duas colunas com pergunta nova sobre dados; CTA repetido (hero, após os cartões, fecho, cabeçalho e barra fixa no celular). Formulário, schema, ações e antispam intactos. Rodapé e logo com alvo de 44 px.

Medições: Lighthouse mobile contra `next dev` (sem build; desempenho de dev subestima a produção): desempenho 73 a 74 (era 74), acessibilidade 100, boas práticas 100, SEO 100, CLS 0, LCP 0,9 a 1,0 s. Nenhum JavaScript de cliente novo (só componentes de servidor), então a produção não deve regredir; medir com build quando o outro agente liberar. axe em 390 e 1440: nenhuma violação. Sem rolagem horizontal de 360 a 1440. Nenhum alvo abaixo de 44 px. E2E da lista: tudo OK.

| Critério | Antes | Depois | Justificativa |
|---|---|---|---|
| Clareza da proposta em 5 s | 7 | 9 | Subtítulo diz o mecanismo (loja define a comissão, afiliado divulga, pagamento já dividido) e a faixa de confiança reforça. A frase da marca segue exigida. |
| Hierarquia e estrutura | 6 | 9 | Ordem de venda: promessa, o que muda, como funciona, papéis, produto, regras, formulário, FAQ. Cartões 2x2 no lugar de quatro faixas. |
| Prova e credibilidade (honesta) | 6 | 8 | Demonstração do painel (ilustrativa), regras, Lytex, CNPJ, nota fiscal. Sem clientes ainda, então não passa de 8. |
| CTA e fricção do formulário | 7 | 8 | CTA repetido e único; resumo ao lado do formulário. O formulário em si não mudou. |
| Objeções e FAQ | 7 | 8 | Dez perguntas, agora com dados pessoais. Taxa ainda sem percentual (a definir antes da abertura). |
| Design e modernidade | 6 | 8 | Ritmo de seções claras e petróleo, cartões, mockup. Preso à identidade fixa e sem foto real. |
| Mobile | 8 | 8 | Sem rolagem horizontal e alvos de 44 px. A página continua longa (cerca de 9.600 px). |
| Velocidade e acessibilidade | 9 | 9 | Mesmos números; falta medir em produção. |
| Diferenciação vs concorrentes | 5 | 8 | Comparação honesta e foco em split na Lytex, vitrine própria e comissão visível. |
| Conformidade | 9 | 9 | Sem promessa de ganho, sem "saldo", "carteira", "sacar" nem "transferir"; "nunca recebe nem guarda" mantido. |
| **Geral** | **7,0** | **8,4** | Subiu por estrutura, demonstração e comparação. O que falta para passar disso depende de fatos que ainda não existem: clientes reais, fotos de produto e taxas publicadas. |

## Rodada 3: tirar a cara de IA

### Crítica (design-critique) da landing anterior

Sinais de "feito por IA" encontrados:

1. Blocos empilhados iguais: sete faixas de largura total, cada uma com título à esquerda e conteúdo à direita, alternando claro e petróleo em ritmo previsível.
2. Títulos genéricos: "Como funciona", "Onde você se encaixa", "O que muda quando a venda por afiliados tem regras", "As regras, sem letra miúda", "Perguntas frequentes".
3. Tabela "como costuma ser hoje x com a Staypse", o clichê de comparação de SaaS.
4. Mockup de painel de loja (tabela de produtos, status "Aprovado") que ninguém pediu para ver.
5. Simetria e proporções repetidas: grade 0,8fr/1,2fr em quase toda seção, cartões de mesmo tamanho.
6. Excesso de explicação: cada papel recebia três frases, o hero tinha subtítulo, três faixas de confiança e aviso.
7. Vocabulário de startup: "plataforma de afiliados", "split", "vitrine", "painel", sem nenhuma cena de comércio real.
8. Frases de efeito e microcopy de modelo ("sem letra miúda", "tudo o que dá para responder").
9. Cores chapadas, sem textura, sem objeto do mundo real; nenhuma fotografia nem peça física.
10. Dois hero visuais genéricos (cartão branco com barra de split), sem personalidade.
11. Quatro CTAs idênticos repetidos por obrigação.

### Direção escolhida: etiqueta e recibo

O balcão da loja de bairro. O link da afiliada vira uma etiqueta de preço pendurada num barbante (ciano com código de barras, o preço em Outfit 800) e a venda vira um recibo térmico de papel com borda serrilhada, números em mono e pontilhado até o valor, escrito como exemplo. É a única "coisa memorável" da página e fica no hero. O resto é quieto: Outfit pesado em títulos grandes, parágrafos curtos, uma lista de regras com divisórias tracejadas de recibo, e um fecho em ciano chapado. Textura: pontilhado fino (perfuração de impressora) no hero, e a própria etiqueta e o recibo, feitos só com CSS e SVG (sem imagem, sem JavaScript novo). Identidade intacta: Petróleo, Ciano (só como fundo de botão e da etiqueta, nunca texto sobre branco), Gelo, Branco, Outfit e o logo SVG oficial.

Copy: exemplos concretos (a Lia vende tênis em Recife, a Ana posta o link no Instagram), frases curtas e longas misturadas, sem "revolucione", "potencialize", "ecossistema".

### O que mudou

Mudança do dono no meio da rodada: as pessoas já podem criar conta e usar a plataforma. Então o CTA principal é Criar conta (/cadastro) e o secundário Entrar (/entrar), no cabeçalho, no hero, no fecho e na barra fixa do celular; a lista de espera saiu da landing (a rota /lista/[codigo] continua para quem já tem link). /entrar e /cadastro ficaram indexáveis e entraram no sitemap. Seções: hero, como funciona (3 passos reais), quatro perfis (âncoras mantidas), regras (a Staypse nunca encosta no dinheiro), FAQ de 9 perguntas, fecho. Saíram: tabela comparativa, mockup de painel, formulário e resumo da lista. Rodapé ganhou o link Taxas. "Pagamentos processados pela Lytex" no hero e no fecho; valores do recibo (R$ 250,00 = 165 + 65 + 20) marcados como exemplo, sem promessa de ganho.

### Medições (build de produção, `npm start -p 3100`, Lighthouse mobile)

Desempenho 100 e 96 (duas rodadas), acessibilidade 100, CLS 0, LCP 0,8 s. axe em 390 e 1440: nenhuma violação. Sem rolagem horizontal; nenhum alvo abaixo de 44 px. Altura da página: 6.189 px no celular (era 8.277) e 4.586 px no desktop (era 5.785). Prints em scratchpad/prints-landing3 (antes-*, depois-*). E2E novo: e2e-landing.mjs (o e2e-lista.mjs cobria o formulário da landing, que saiu).
