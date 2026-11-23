# Estratégia: personalização de loja, vitrine, afiliação, vendedores e links

Pesquisa feita em 23/11/2026 (Nuvemshop, Shopify, Loja Integrada, Bagy, Yampi, Hotmart, Kiwify, Eduzz, Monetizze, Braip, Parceiro Magalu, Amazon, Shopee). Fontes no fim.

## Princípio que não muda

Todo clique termina na **loja oficial da marca dentro da Staypse**. O checkout é dela, e o valor é dividido ali pelo split da Lytex. Vale para o link do afiliado, o link do vendedor e o clique na vitrine. Por isso anúncio pago é permitido: o destino é sempre o site oficial.

## 1. Dois tipos de link (prioridade 1)

| Link | Endereço | Para quê |
|---|---|---|
| Página do produto | `/@ana/tenis-runner` | Conteúdo, Instagram, vitrine. A pessoa vê fotos, descrição, frete e loja. |
| Direto ao checkout | `/@ana/tenis-runner/comprar` | Anúncio, WhatsApp, quem já decidiu. Abre o "Finalizar compra" com o produto. |

- Os dois registram o clique e guardam quem indicou por 30 dias, com a regra do último clique por produto (já existe).
- Afiliados e vendedores veem os dois botões: "Copiar link da página" e "Copiar link do checkout".
- O mercado faz igual: a Hotmart tem link para a página e para o checkout, e o padrão citado em guias da Kiwify é checkout direto para ticket baixo e página para ticket alto.
- Parâmetros de campanha (`utm_source` e parecidos) são aceitos e repassados, para o afiliado medir os anúncios.

## 2. Personalização da loja: modelos prontos, sem "doideira"

O que todas as plataformas que funcionam têm em comum é tema pronto, logo, cores, fonte, banner, a ordem das seções (podendo ocultar), menu, rodapé e prévia ao vivo no celular.

A proposta para a Staypse é:

- **4 modelos próprios**, testados no celular e todos com a mesma estrutura, só com visual diferente:
  - Clássico: grade de produtos.
  - Vitrine: banner grande e destaques.
  - Catálogo: lista compacta, bom para muitos itens.
  - Editorial: fotos grandes, para moda e beleza.
- **O lojista edita só o que dá resultado:**
  - logo, cor principal e cor de destaque (o contraste é corrigido automaticamente, como já acontece hoje);
  - fonte, com 4 opções;
  - banner, com imagem e frase;
  - ordem das seções e o que fica oculto: destaques, mais vendidos, categorias, avaliações, sobre a loja e trocas;
  - produtos em destaque.
- **Prévia ao vivo** no celular e no computador, que já existe para cores e fonte.
- **Sem HTML ou CSS livre.** Isso evita loja quebrada, lenta ou inacessível; a Nuvemshop só libera CSS no plano mais caro.

Sobre "pegar modelos de outra plataforma": o tema Dawn, da Shopify, tem licença que **só permite uso em temas para a própria Shopify**. Temas da Nuvemshop, Yampi e outras são proprietários. Copiar daria problema jurídico. O caminho é fazer modelos próprios inspirados nos padrões de mercado (layout não tem dono; código e arte têm).

## 3. Vitrine do afiliado

Hoje a vitrine tem nome, @, bio, nicho, foto e "minhas cores". O próximo passo é:

- **Destaques:** até 4 produtos fixados no topo.
- **Coleções:** grupos como "Para presentear" e "Treino".
- **Ordem manual** dos produtos.
- **Selo de publicidade** e a regra de que o clique leva à loja vendedora, como já acontece hoje.

## 4. Onde o afiliado se afilia

O lugar continua o mesmo: **Catálogo** (`/painel/revendedor/catalogo`). As melhorias são:

- **Afiliação automática ou manual, escolhida pela loja em cada produto.** Hoje é sempre manual.
- **Link de convite por produto**, que a loja manda para um afiliado específico (padrão Hotmart e Kiwify).
- **No card do produto:** comissão em R$ e %, prazo de entrega, "materiais de divulgação" (fotos e textos prontos da loja) e regras de divulgação da loja.
- **Ordenar por mais vendidos nos últimos 7 dias**, como faz a Kiwify, mostrando só o ranking e sem expor números da loja.

## 5. Vendedor da loja

O caminho continua o **convite da loja** (aba Vendedores → link de convite → o vendedor cria a conta). Ele vira um "afiliado restrito à própria loja", que é o padrão dos apps da Nuvemshop. O que acrescentar:

- os **dois links** (página e checkout) para cada produto, no painel do vendedor;
- um **cupom do vendedor**, opcional e para depois, que atribui a venda mesmo sem link (útil na loja física e no WhatsApp).

## 6. Anúncios

- Afiliados e vendedores **podem anunciar** (Meta, Google, TikTok), sempre apontando para o link deles.
- **Regras padrão**, que a loja pode endurecer:
  - não comprar a **marca da loja** como palavra-chave no Google;
  - não se passar pela loja;
  - não prometer desconto ou brinde que a loja não oferece.
- Os textos ficam nos Termos e nas regras de divulgação da loja.

## Ordem de execução

1. Link direto ao checkout, com os dois botões em todos os painéis.
2. Escolha automática ou manual da afiliação, link de convite por produto e materiais de divulgação.
3. Modelos de loja (4) com banner, seções e destaques.
4. Vitrine com destaques e coleções.
5. Regras de anúncio nos Termos e por loja.

## O que a pesquisa avisa (armadilhas)

- Atribuição por cookie se perde quando a compra é feita em outro aparelho. O cupom do vendedor ajuda.
- Venda feita antes da aprovação da afiliação não comissiona (Eduzz): a tela precisa deixar isso claro.
- Mudar o endereço do checkout quebra links antigos: os links da Staypse são curtos e estáveis, e o destino é resolvido no clique.
- Cookie curto derruba conversão: a Staypse usa 30 dias.

## Fontes

- Nuvemshop: https://www.nuvemshop.com.br/recursos/layout-loja-virtual · https://www.nuvemshop.com.br/solucoes/novo-editor
- Shopify Horizon: https://changelog.shopify.com/posts/horizon-10-new-free-themes-by-shopify · licença do Dawn: https://raw.githubusercontent.com/Shopify/dawn/main/LICENSE.md
- Loja Integrada: https://lojaintegrada.com.br/loja-temas
- Hotmart: https://help.hotmart.com/pt-br/article/215829028 · https://help.hotmart.com/pt-br/article/216441767 · https://help.hotmart.com/pt-br/article/210874788
- Kiwify: https://help.kiwify.com/en/article/how-to-make-my-product-available-in-the-affiliate-marketplace-1yyvnx7
- Apps de vendedores na Nuvemshop: https://www.nuvemshop.com.br/loja-aplicativos-nuvem/managemate · https://www.nuvemshop.com.br/loja-aplicativos-nuvem/portal-de-afiliados
- Shopee (regras de divulgação): https://shopee.com.br/blog/?p=45141
- Amazon Influencer: https://affiliate-program.amazon.com/help/node/topic/GRQNGNJP89KNPBAG
