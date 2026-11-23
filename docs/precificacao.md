# Precificação da Staypse (taxas por modalidade)

Decisão de preço, com método de pricing-strategist (modelo por transação, faixa e não número único,
teste de mercado) e de marketing-skills:pricing (preço entre a alternativa e o valor percebido,
"escolha um preço de que se possa aprender", evitar o preço baixo demais). Valores em R$, 2026-11.

## 1. Quem paga e o que cada um vê

- **A loja (vendedor) paga a taxa**, descontada no repasse: loja recebe total, menos comissão, menos taxa total.
- **A taxa é de lojas e afiliados, rateada pela parte de cada um** (padrão Hotmart): a taxa do afiliado = taxa total × comissão ÷ total do pedido (para baixo); a loja paga o resto (centavo residual é dela). **Vendedor próprio da loja (folha ou split direto) não paga taxa**: recebe a comissão cheia e a loja paga a taxa inteira. Sem indicação, a loja paga tudo. Cada um vê só "Taxa da plataforma" e "Você recebe"; a divisão Lytex/Staypse é interna (`split_snapshot`: `taxaLojaCentavos`, `taxaAfiliadoCentavos`).
- **O comprador nunca vê taxa**: paga o preço do anúncio (+ frete). Sem "taxa de serviço" no checkout nem no pedido.
- **Loja e afiliado veem UM número**, "Taxa da plataforma" (percentual + fixo por modalidade). O custo Lytex e a receita Staypse
  são internos (só admin; `orders.split_snapshot` e `configuracoes` não são legíveis por usuário comum).
- A taxa incide sobre o total da transação (a Lytex cobra sobre o total, frete incluso). Arredondamento: taxa para baixo (a favor da loja), custo Lytex estimado para cima (a favor da Staypse na margem conservadora).

## 2. Mercado (taxas atuais, 4 a 6 buscas; fontes divergem, conferir antes de publicar comparativos)

| Plataforma | Taxa encontrada | Fonte |
|---|---|---|
| Hotmart | 9,9% + R$ 1,00; fixo vira R$ 2,49 desde 21/09/2026 (o oficial confirma a unificação, o valor 2,49 vem do blog Hotmart e de terceiros). Microvenda até R$ 10: 20%. Parcelado: 3,49% a.m. ao comprador | https://help.hotmart.com/pt-BR/article/quais-sao-as-tarifas-de-servico-cobradas-pela-hotmart-/208298448 , https://hotmart.com/pt-br/blog/diferenciais-da-hotmart |
| Kiwify | 8,99% + R$ 2,49 (só fontes de terceiros; oficial não encontrado) | https://herospark.com/guias/taxas-e-margem |
| Eduzz | 4,9% + R$ 1 a R$ 2,49 (fontes divergem; oficial não encontrado) | https://tactus.com.br/taxas-da-eduzz/amp/ |
| Monetizze | 7,9% a 9,89% + R$ 0,50 a R$ 1,50 (fontes divergem; oficial não encontrado) | https://viniensina.com.br/?p=4267 |
| Braip | 9,9% a 14,9%, fixo não detalhado (oficial não encontrado) | https://inteligenciasetorial.com.br/melhores-plataformas-para-vender-infoprodutos/ |
| Shopee (vendedor) | 20% + R$ 4 a 4,50 até R$ 79,99; 14% + R$ 16 a 26 acima (varia por fonte e mês) | https://ecommercenapratica.com/blog/taxa-shopee/ |
| Mercado Livre | Clássico 10% a 14%, Premium 15% a 19%, mais custo fixo por unidade abaixo de R$ 79 (hoje por peso/faixa; antes até R$ 6,75). Oficial não encontrado | https://blog.bling.com.br/taxas-mercado-livre/ |
| Nuvem Pago | Pix 0,99%; boleto R$ 2,39 (oficial). Cartão 3,59% a 4,69% + R$ 0,35 (terceiro) | https://atendimento.nuvemshop.com.br/pt_BR/minha-conta-nuvem-pago/quais-sao-as-taxas-e-tarifas-do-nuvem-pago |
| Yampi | 2,5% (grátis), 2% (R$ 147/mês), 1,5% (R$ 497/mês) por pedido pago, igual em qualquer meio; gateway à parte (não encontrado) | https://www.yampi.com.br/blog/yampi-checkout |

Leitura: infoprodutor e marketplace cobram 9% a 20% + fixo. Só o gateway puro (Nuvem Pago) fica em 1% a 4,7%, sem afiliados,
split nem vitrine. A Staypse vende split + afiliados + NF, então o teto de aceitação é o infoprodutor e o piso é o gateway.

## 3. Taxa total recomendada (cobrada da loja)

| Modalidade | Custo Lytex (contrato) | **Taxa total** | Staypse (bruto) |
|---|---|---|---|
| Pix | R$ 1,85 | **1,5% + R$ 2,00** | 1,5% + R$ 0,15 |
| Boleto | R$ 1,85 | **1,5% + R$ 2,30** | 1,5% + R$ 0,45 |
| Cartão 1x | 3,39% | **4,9% + R$ 0,50** | 1,51% + R$ 0,50 |
| Cartão 2x a 6x | 3,89% | **5,5% + R$ 0,50** | 1,61% + R$ 0,50 |
| Cartão 7x a 12x | 4,29% | **6,1% + R$ 0,50** | 1,81% + R$ 0,50 |

"Bruto" é antes do custo de repasse (split). O repasse custa 1% do valor repassado (mín. R$ 0,10, máx. R$ 1,00) por recebedor:
loja, afiliado ou vendedor (split direto) e a própria Staypse (modelado de forma conservadora, ver seção 4).

## 4. Margem Staypse por cenário (pior caso: afiliado com 30% de comissão, 3 repasses)

Célula: taxa total cobrada | custo Lytex estimado | **margem da Staypse** (calculado por `calcularSplit`, mesmo código da produção).

| Modalidade | R$ 30 | R$ 80 | R$ 150 | R$ 300 | R$ 800 |
|---|---|---|---|---|---|
| Pix | 2,45 / 2,25 / **0,20** | 3,20 / 2,73 / **0,47** | 4,25 / 3,39 / **0,86** | 6,50 / 3,84 / **2,66** | 14,00 / 3,96 / **10,04** |
| Boleto | 2,75 / 2,25 / **0,50** | 3,50 / 2,72 / **0,78** | 4,55 / 3,39 / **1,16** | 6,80 / 3,83 / **2,97** | 14,30 / 3,96 / **10,34** |
| Cartão 1x | 1,97 / 1,42 / **0,55** | 4,42 / 3,58 / **0,84** | 7,85 / 6,62 / **1,23** | 15,20 / 12,13 / **3,07** | 39,70 / 29,23 / **10,47** |
| Cartão 2x a 6x | 2,15 / 1,57 / **0,58** | 4,90 / 3,98 / **0,92** | 8,75 / 7,36 / **1,39** | 17,00 / 13,62 / **3,38** | 44,50 / 33,24 / **11,26** |
| Cartão 7x a 12x | 2,33 / 1,69 / **0,64** | 5,38 / 4,30 / **1,08** | 9,65 / 7,96 / **1,69** | 18,80 / 14,82 / **3,98** | 49,30 / 36,45 / **12,85** |

**Margem mínima: R$ 0,20 (Pix R$ 30 com afiliado, com a taxa rateada entre loja e afiliado)**; todas as 25 células ficam positivas. Sem afiliado, a margem é igual ou maior.
Peso real: o fixo carrega as vendas pequenas, o percentual carrega as grandes. Pedido abaixo de ~R$ 3 (sem afiliado) ou ~R$ 10 (com afiliado) não cobre o custo do Pix (o código recusa
com `taxa_menor_que_o_custo`; recomendado pedido mínimo de R$ 10 no anúncio). Se a Lytex não cobrar o repasse da parte da Staypse, a margem sobe R$ 0,10.
Validade do contrato: 17/04/2027. Depois, se voltar o padrão (Pix 0,99% mín. R$ 1,89; boleto R$ 1,89), o Pix de R$ 800 com afiliado ainda deixa ~R$ 4. Revisar em fev/2027 pelo admin (`custo_lytex_*`), sem deploy.

## 5. Comparação com as grandes (taxa efetiva total para a loja)

| Venda | Staypse Pix | Staypse cartão 1x | Hotmart (9,9% + 2,49) | Shopee | Nuvem Pago cartão* |
|---|---|---|---|---|---|
| R$ 80 | 3,20 (4,0%) | 4,42 (5,5%) | 10,41 (13,0%) | 27,20 (34,0%) | ~3,23 (4,0%) |
| R$ 150 | 4,25 (2,8%) | 7,85 (5,2%) | 17,34 (11,6%) | 41,00 (27,3%) | ~5,75 (3,8%) |
| R$ 300 | 6,50 (2,2%) | 15,20 (5,1%) | 32,19 (10,7%) | 68,00 (22,7%) | ~11,15 (3,7%) |

*Estimado com 3,6% + R$ 0,35 (fonte de terceiros). Resultado: a Staypse cobra de 20% a 47% do que Hotmart e Kiwify (Pix a cartão) e de 16% a 22% do
Shopee, acima do gateway puro, que não tem split, afiliados nem vitrine. Não espanta, e o cartão fica perto do que o lojista já aceita.

## 6. Curva de Laffer: por que este ponto

- **Alto demais (acima de ~8% no cartão):** a loja compara com Hotmart/Kiwify (já pesados) e Nuvem Pago, e migra ou vende por fora (Pix direto). Volume cai mais que a taxa sobe.
- **Baixo demais (Pix a 0,99% sem fixo):** não cobre o custo fixo de R$ 1,85 mais o split, a Staypse perde em cada venda pequena.
- **Ponto escolhido:** ~1,5 a 1,8 ponto percentual sobre o custo no cartão, e fixo logo acima do custo no Pix/boleto. Margem de 0,5% a 1,6% do GMV
  (R$ 0,21 a R$ 13 por venda): sustentável e perto do piso do mercado. Escala (GMV) paga a empresa, não a margem unitária.
- **Pesquisa:** o preço baixo demais atrai cliente que não paga depois (efeito do "$9", marketing-skills:pricing); este preço aprende com a venda real.
- **Lançamento (opcional):** para os primeiros 100 lojistas, nos primeiros 90 dias, 0,5 ponto percentual a menos no percentual de cada modalidade
  (o fixo não muda). A margem mínima cai para ~R$ 0,06 (Pix R$ 30 com afiliado), ainda positiva. Operação: o admin edita o percentual na tela e volta depois. Ainda não há mecanismo automático por loja.
- **Testar:** com 20 a 30 lojistas, medir conversão do cadastro à 1ª venda e churn; subir só o percentual do cartão em 0,3 p.p. se ninguém reclamar em 60 dias.

## 7. Perfis e reação a preço

| Perfil | Sensibilidade | O que pesa | Reação |
|---|---|---|---|
| Loja física pequena (ticket R$ 30 a 150) | Alta ao fixo | Compara com maquininha (2% a 4%) e Nuvem Pago | Pix e fixo baixo seguram; R$ 2 em R$ 30 já incomoda, daí o pedido mínimo |
| Fábrica (ticket R$ 300 a 800, B2B leve) | Alta ao percentual | Volume; negocia | Pix/boleto a 1,5% é bem aceito; sem teto, pode pedir taxa menor |
| Infoprodutor | Baixa (compara com 9,9%) | Afiliados e checkout | Paga 5% a 6% sem reclamar; é o perfil de maior margem |
| Afiliado iniciante | Muito alta | Quer comissão cheia | Não paga taxa: nada a rejeitar, só renda |
| Comprador mobile de Pix | Zero (não vê taxa) | Preço final e velocidade | Pix padrão no checkout; sem acréscimo por meio |

Limitação: sem pesquisa primária. Perfis e reações são hipóteses de mercado (fontes da seção 2); validar com entrevistas dos primeiros lojistas.

## 8. Subcontas (R$ 10 criação + R$ 2/mês, por recebedor)

- Custo por recebedor: R$ 10 + R$ 24/ano = R$ 34 no primeiro ano. Com ~R$ 1 de margem por venda, é preciso ~34 vendas por recebedor para empatar.
- **Decisão:** criar a subconta só quando necessário: loja no 1º produto aprovado e publicado (não no cadastro); afiliado e vendedor split direto na
  1ª venda atribuída a ele (não na afiliação). Cadastro sem venda não gera custo. Vendedor "na folha" não tem subconta.
- Absorver a criação como custo de aquisição (R$ 10) e não embutir no fixo (encareceria toda venda pequena). Acompanhar no admin quem está sem venda há 90 dias.
- **Desativação no spec** (`docs/lytex/openapi-v2-sandbox.json`): há `SubAccountsController_create_v2`, `SubAccountsController_list_v2`, `SubAccountsController_get_v2` e
  `SubAccountsController_update_v2` (PUT /v2/sub-accounts/{id}). O PUT só altera dados cadastrais (nome, e-mail, endereço, contas, etc.); **não encontrado**
  campo ou operação para desativar/encerrar. Perguntar à Lytex se a manutenção de R$ 2 cobra subconta parada e como encerrar (registrar em docs/lytex/PERGUNTAS.md).

## 9. Parcelamento: quem paga os juros e como mostrar

- **Padrão:** sem juros para o comprador. A loja absorve, dentro da taxa total da faixa (2x a 6x ou 7x a 12x). O comprador vê só "12x de R$ X sem juros".
- **Opção para a loja (7x a 12x):** repassar o custo ao comprador como "juros do parcelamento", acréscimo de financiamento informado com valor total e parcelas (CDC),
  nunca rotulado como taxa da Staypse e sem margem Staypse embutida. Se a Lytex suporta cobrar juros do pagador: **não verificado** (conferir antes de ofertar).
- Hotmart repassa 3,49% a.m. ao comprador (fonte de terceiros, seção 2); a Staypse prefere não repassar, para não espantar o comprador.
- Hoje o comprador escolhe meio e parcelas na página da Lytex. O split nasce na criação da cobrança, antes da escolha, então o código usa a modalidade
  padrão `cartao_2a6` (`MODALIDADE_PADRAO` em cobrancas.ts). Próximo passo: perguntar meio e parcelas no checkout e passar a modalidade real (sem mostrar taxa).
