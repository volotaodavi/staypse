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

Medições: Lighthouse mobile contra `next dev` (sem build; desempenho de dev subestima a produção): desempenho 73–74 (era 74), acessibilidade 100, boas práticas 100, SEO 100, CLS 0, LCP 0,9–1,0 s. Nenhum JavaScript de cliente novo (só componentes de servidor), então a produção não deve regredir; medir com build quando o outro agente liberar. axe em 390 e 1440: nenhuma violação. Sem rolagem horizontal de 360 a 1440. Nenhum alvo abaixo de 44 px. E2E da lista: tudo OK.

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
