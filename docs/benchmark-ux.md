# Benchmark de UX/UI para a Staypse

Pesquisa de padrões em páginas públicas (sem login, sem formulários), em 23/11/2026. Imagens em `docs/benchmark/`: celular 390 px (primeira dobra à esquerda, após rolagem à direita) e computador 1440 px (primeira dobra). Só padrões de UX; nada de arte ou código foi copiado.

## Limites desta pesquisa (leia antes)

- **Checkout:** não foi capturado. O único produto testado estava sem estoque e checkout exige ação em fluxo de compra. As recomendações de checkout vêm de padrões vistos na página de produto e de conhecimento geral, e estão marcadas como hipótese.
- **Painéis (loja/afiliado/vendedor):** são privados nos concorrentes; não foram vistos. Seção de painéis é hipótese a validar.
- **Não capturados:** Kiwify (sem página pública de afiliados), Yampi (bloqueio Cloudflare), Loja Integrada (só home institucional), Amazon storefront (sem URL pública de exemplo confirmada), Magazine Você (captcha), demos oficiais de Nuvemshop (domínios de demo inativos; usei a loja real Pareô, que roda em Nuvemshop). Horizon (Shopify) está atrás de senha; usei a demo Dawn "OS 2.0".
- Os cookies da Hotmart cobrem parte das capturas deles.

## 1. Loja / home

**Pareô (Nuvemshop):** faixa de topo com "5% de desconto no PIX", cabeçalho enxuto (menu, busca, conta, carrinho), foto grande e rodapé com WhatsApp flutuante. Ver `nuvemshop-pareo-home-390.webp` e `nuvemshop-pareo-home-1440.webp`.
**Dawn (Shopify):** anúncio curto, logo centralizado, hero e coleções. Ver `shopify-dawn-home-390.webp` e `shopify-dawn-home-1440.webp`.

Padrões em comum: barra de anúncio com benefício único; navegação reduzida; busca sempre visível; um destaque por dobra.

## 2. Produto

**Pareô** (`nuvemshop-pareo-produto-390.webp`, `-1440.webp`): na mesma dobra aparecem preço de, preço por, "4 x de R$55,30 sem juros", "R$210,14 com Pix", selo "30% OFF" na foto, tamanho, botão Comprar largo, blocos recolhíveis "Meios de pagamento" e "Meios de envio" com campo de CEP. Miniaturas verticais no computador; carrossel com contador no celular.
**Dawn** (`shopify-dawn-produto-390.webp`, `-1440.webp`): ícone de lupa para zoom na galeria, marca acima do título, "Shipping calculated at checkout", estoque de retirada, botão secundário "Add to cart" e primário de pagamento rápido, "Você pode gostar também".

Padrões em comum: parcelamento e preço à vista junto do preço; frete por CEP antes do carrinho; variações como botões; ação principal com cor cheia. **Nenhum dos dois mostrou botão de compra fixo no celular** (o botão sai da tela ao rolar). Aqui a Staypse pode ficar à frente. Também não vi avaliações nem selo de loja no Pareô durante a dobra.

## 3. Checkout

Sem captura (ver limites). Hipótese: manter etapas curtas, resumo do pedido sempre visível, Pix primeiro, e reforçar confiança no ponto de pagamento.

## 4. Catálogo do afiliado (como o produto é apresentado a quem divulga)

- **Hotmart** (`hotmart-afiliados-390.webp`, `-1440.webp`; `hotmart-marketplace-*.webp`): promessa "ganhe até 80% por venda" no título, cadastro gratuito ao lado do texto no computador, vitrine de criadores em destaque. O catálogo com comissão por produto fica atrás de login e não foi visto.
- **Parceiro Magalu** (`parceiromagalu-home-*.webp`): duas portas claras, "autônomo com renda extra" e "loja online", com a comissão máxima escrita ("até 12%").
- **Shopee** (`shopee-afiliados-1440.webp`): uma única ação (Entrar), conta de afiliado ligada à conta de comprador.
- **Eduzz** (`eduzz-home-*.webp`): página institucional; pouco a aproveitar sobre catálogo.

Padrão: perfil de entrada em duas portas, número de comissão no topo e cadastro sem fricção. Cuidado: "ganhe até X%" e "renda extra" são promessas que a Staypse **não** deve copiar. Mostre a comissão como fato do produto ("comissão do produto: X%"), sem prometer ganhos.

## 5. Vitrine do criador

**Linktree** (`linktree-perfil-390.webp`, `-1440.webp`, `linktree-home-*.webp`): coluna única centrada, foto e nome, ícones sociais, selo "Verified", abas "Links" e "Shop", cartões grandes tocáveis, compartilhar no canto. No computador a coluna fica estreita no meio da tela.
Magazine Você: bloqueado por captcha; não avaliado.

## 6. Painéis

Não observados. Hipótese: números do período no topo, uma ação principal por tela, tabelas com filtro. Validar com usuários reais da Staypse.

## Melhorias priorizadas

Esforço: P pequeno, M médio, G grande. Regras de copy: a Staypse não "recebe" dinheiro; sem "saldo", "carteira", "sacar", "transferir"; sem promessa de ganhos; prova social só real.

| # | Tela | Melhoria | Por quê (evidência) | Esforço |
|---|------|----------|---------------------|---------|
| 1 | Produto (celular) | Barra de compra fixa no rodapé com preço e botão Comprar, visível ao rolar | Pareô e Dawn perdem o botão ao rolar (capturas `-390`); oportunidade de diferenciar | M |
| 2 | Produto | Parcelamento e preço à vista (Pix) junto do preço, sem abrir nada | Pareô mostra "4 x de R$55,30 sem juros" e "com Pix" na primeira dobra | P |
| 3 | Produto | Calculadora de frete por CEP com prazo, na dobra do produto | Pareô: bloco "Meios de envio" com CEP; Dawn só avisa "calculado no checkout" (pior) | M |
| 4 | Produto | Selo "Loja oficial" com nome da marca ao lado do título | Dawn destaca a marca acima do título; reforça confiança no modelo de lojas oficiais | P |
| 5 | Produto | Bloco "Troca e devolução" visível (resumo em uma linha + link para a política) | Padrão de confiança ausente nas capturas; lacuna a ocupar | P |
| 6 | Produto/Checkout | Linha "Pagamento processado pela Lytex" perto do botão e do Pix | Confiança no ponto de pagamento; copy sem dizer que a Staypse recebe | P |
| 7 | Produto | Galeria com zoom (lupa), contador "1/6" e deslizar no celular, miniaturas no computador | Dawn: lupa e contador; Pareô: miniaturas verticais | M |
| 8 | Produto | Variações como botões de tamanho, com indisponível riscado | Pareô e Dawn usam botões; Pareô sinalizou produto sem estoque só ao tocar | P |
| 9 | Produto | Prova social só real: avaliações de compradores verificados com pedido concluído; sem avaliação, não exibir nota | Nenhum concorrente mostrou na dobra; evita risco legal de avaliação falsa | G |
| 10 | Loja/home | Barra de anúncio com um benefício verdadeiro (ex.: Pix, frete) | Pareô: "5% de desconto no PIX" | P |
| 11 | Loja/home | Cabeçalho enxuto: menu, busca, conta, carrinho; marca da loja no centro | Pareô e Dawn repetem o padrão | P |
| 12 | Vitrine do criador | Coluna única, nome, foto, selo "Perfil verificado" (só se houver verificação real) e cartões tocáveis | Linktree: selo e coluna única | M |
| 13 | Vitrine do criador | Abas "Links" e "Produtos" para separar conteúdo e compras | Linktree: abas Links/Shop | M |
| 14 | Vitrine do criador | Botão de compartilhar e copiar link da vitrine no topo | Linktree: ícone de compartilhar no canto | P |
| 15 | Vitrine/Checkout | Cupom do afiliado/vendedor visível na vitrine e campo de cupom no checkout, para atribuir venda em outro aparelho | Link some entre celular e computador; cupom é a atribuição que sobrevive (hipótese de produto, a validar) | M |
| 16 | Catálogo do afiliado | Cartão do produto com comissão em %, preço e prova de que é loja oficial | Magalu e Hotmart destacam a comissão; evitar "até X%" como promessa | M |
| 17 | Catálogo do afiliado | Duas portas na entrada ("Divulgar produtos" e "Vender pela minha loja") | Parceiro Magalu: duas portas claras | P |
| 18 | Catálogo do afiliado | Ordenação e filtro por categoria e comissão; ranking/temperatura só com dados reais de vendas | Hotmart usa ranking por criador; ranking falso seria prova social falsa | G |
| 19 | Catálogo do afiliado | Materiais do produto (fotos, texto sugerido) com botão "Copiar link" | Padrão de programas de afiliados; não observado atrás de login (hipótese) | M |
| 20 | Afiliado/Produtor | Cadastro com poucos campos e uma ação por tela | Shopee: um botão de entrada; Hotmart: cadastro ao lado do texto | M |
| 21 | Produto | Botão de WhatsApp para dúvidas da loja, discreto | Pareô: botão flutuante; cuidado para não cobrir a barra de compra (#1) | P |
| 22 | Checkout | Resumo do pedido, Pix primeiro, mensagens de erro claras (hipótese; checkout não capturado) | Prática comum no Brasil, a confirmar com teste de uso | M |
| 23 | Painéis | Números do período no topo e uma ação principal por tela (hipótese; painéis não vistos) | Sem evidência pública; validar com usuários | M |
| 24 | Todas | Aviso de cookies compacto que não cubra o conteúdo nem o botão de compra | Hotmart: faixa cobre a dobra inteira no celular | P |

## Regras de copy para aplicar nas telas acima

- Diga "pagamento processado pela Lytex"; nunca "a Staypse recebe".
- Evite "saldo", "carteira", "sacar", "transferir". Use termos como "comissão do pedido" e "repasse conforme regras da loja", sem prometer valores ou prazos de ganho.
- Nada de "renda extra", "ganhe até" ou números de ganhos de terceiros.
- Selo, nota e ranking só quando o dado existir e for verificável.

## Índice das imagens

`shopify-dawn-{home,produto}-{390,1440}`, `nuvemshop-pareo-{home,produto}-{390,1440}`, `hotmart-{marketplace,afiliados}-{390,1440}`, `eduzz-home-{390,1440}`, `shopee-afiliados-1440`, `parceiromagalu-home-{390,1440}`, `linktree-{home,perfil}-{390,1440}` (todas `.webp`, até 66 KB). Imagem 390 = dobra inicial + rolagem lado a lado.
