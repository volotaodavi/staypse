# Precificação da Staypse (taxas por modalidade)

Decisão de preço, com método de pricing-strategist (modelo por transação, faixa e não número único,
teste de mercado) e de marketing-skills:pricing (preço entre a alternativa e o valor percebido,
"escolha um preço de que se possa aprender", evitar o preço baixo demais). Valores em R$, 2026-11.

> **Atualização (dezembro de 2026):** a seção 10, "Decisão final", fixa as taxas por modalidade e substitui os valores das seções 3 a 6.
> Essas seções ficam como histórico da tabela anterior, que continua valendo para os pedidos até a data de vigência (aviso prévio de 30 dias).
> A seção 9 (parcelamento) já foi reescrita pela decisão do dono: o parcelamento é política da loja.

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

## 9. Parcelamento: política da loja, quem paga os juros e como mostrar

Decisão do dono: "A loja que vai decidir se assume os juros ou repassa. Podem definir até um quantitativo de vezes, ex.: até 3x sem juros."

- **Configuração da loja** (painel, Pagamentos): `parcelas_max` (1 a 12) e `parcelas_sem_juros` (1 até `parcelas_max`). Padrão: até 12x, 3x sem juros.
- **Até N sem juros:** a loja absorve a taxa da modalidade (2x a 6x ou 7x a 12x). O comprador paga só o preço.
- **Acima de N:** o comprador paga um acréscimo no total, calculado para a loja receber o MESMO que receberia no cartão à vista. O acréscimo cobre só a diferença
  entre a taxa da faixa e a do cartão à vista (a Staypse não lucra com juros). A taxa da loja e do afiliado nesse pedido é a do cartão à vista.
  Fórmula: `A = menor valor com A >= taxa_faixa(total + A) - taxa_1x(total)` (`src/lib/pagamentos/juros.ts`).
- **O comprador nunca vê "taxa da plataforma".** Vê cada parcela com "sem juros" ou "com juros", o total e, quando passa do limite, a linha "Juros do parcelamento".
  Na página do produto aparece "em até Nx sem juros" quando N > 1.
- **Tamanho do acréscimo** (tabela final): 2x a 6x cobra ~0,64% do total e 7x a 12x ~1,29% (R$ 150: R$ 0,95 e R$ 1,93; R$ 300: R$ 1,91 e R$ 3,86).
  É bem menos que os 3,49% a.m. que a Hotmart repassa (fonte de terceiros, seção 2).
- **Lytex:** o spec (`docs/lytex/openapi-v2-sandbox.json`) não tem campo de juros do parcelado (`mulctAndInterest` é multa e juros por ATRASO do boleto). O acréscimo entra no
  valor da fatura (`items[].value` e split somam o total cobrado). Pergunta registrada em `docs/lytex/PERGUNTAS.md` (53).
- **Quando o comprador escolhe na página da Lytex** ("Pagar agora" sem escolha prévia), a fatura aceita no máximo o limite sem juros da loja, então nunca há acréscimo.
- O total com juros aparece no resumo antes de pagar (CDC: informação clara do custo total).

## 10. Decisão final

Data: 2026-11-24. Valores em R$. Pedido do dono: "Revise os valores financeiros, não quero sentar a mão e também não quero tomar prejuízo. Use a curva de Laffer.
Veja como contadores, economistas e financeiros fazem." Métodos: `pricing-strategist` (modelo por transação, faixa e não número único, tabela de decisão por perfil, teste de
mercado) e `variance-analysis` (ponte de variância entre a tabela anterior e a final, em preço, volume e mix). Os modelos de cálculo usados estão descritos abaixo para serem refeitos.

### 10.1 Tabela final (taxa total cobrada da loja e do afiliado)

| Modalidade | Custo Lytex | Tabela anterior | **Taxa final** | Efetivo em R$ 150 | Hotmart (9,9% + 2,49) |
|---|---|---|---|---|---|
| Pix | R$ 1,85 | 1,5% + R$ 2,00 | **1,5% + R$ 2,30** | 3,0% | 11,6% |
| Boleto | R$ 1,85 | 1,5% + R$ 2,30 | **1,5% + R$ 2,60** | 3,2% | 11,6% |
| Cartão 1x | 3,39% | 4,9% + R$ 0,50 | **5,6% + R$ 0,80** | 6,1% | 11,6% |
| Cartão 2x a 6x | 3,89% | 5,5% + R$ 0,50 | **6,2% + R$ 0,80** | 6,7% | 11,6% |
| Cartão 7x a 12x | 4,29% | 6,1% + R$ 0,50 | **6,8% + R$ 0,80** | 7,3% | 11,6% |

- **Tarifa mínima de R$ 2,50** por pedido na taxa total (vale só para vendas abaixo de ~R$ 47 no Pix) e **pedido mínimo de R$ 10,00**. Chaves `taxa_minima_centavos` e `pedido_minimo_centavos`.
- **Plano Pro** (R$ 79/mês, percentual menor): só **opção futura**, não implementado e fora desta decisão (seção 10.9).
- Valores gravados em `configuracoes` pela migração `20261213000001_preco_final_parcelamento.sql`; o admin troca sem deploy. A migração só troca quem ainda está no padrão antigo.
- **Vigência:** 30 dias depois da publicação (`taxas_vigencia_em`). Até lá os pedidos usam a tabela anterior, guardada em `taxas_anteriores`. Ver 10.8.

### 10.2 Margem da Staypse nas 25 células (pior caso: afiliado com 30%, 3 repasses; `calcularSplit`, o mesmo código da produção)

Célula: taxa total cobrada | custo Lytex estimado | **margem bruta**. A margem bruta ainda não desconta imposto, buffer de chargeback e subconta (seção 10.5).

| Modalidade | R$ 30 | R$ 80 | R$ 150 | R$ 300 | R$ 800 |
|---|---|---|---|---|---|
| Pix | 2,75 / 2,25 / **0,50** | 3,50 / 2,72 / **0,78** | 4,55 / 3,39 / **1,16** | 6,80 / 3,83 / **2,97** | 14,30 / 3,96 / **10,34** |
| Boleto | 3,05 / 2,24 / **0,81** | 3,80 / 2,72 / **1,08** | 4,85 / 3,39 / **1,46** | 7,10 / 3,83 / **3,27** | 14,60 / 3,96 / **10,64** |
| Cartão 1x | 2,50 / 1,42 / **1,08** | 5,28 / 3,58 / **1,70** | 9,20 / 6,61 / **2,59** | 17,60 / 12,12 / **5,48** | 45,60 / 29,29 / **16,31** |
| Cartão 2x a 6x | 2,66 / 1,57 / **1,09** | 5,76 / 3,97 / **1,79** | 10,10 / 7,34 / **2,76** | 19,40 / 13,62 / **5,78** | 50,40 / 33,30 / **17,10** |
| Cartão 7x a 12x | 2,84 / 1,69 / **1,15** | 6,24 / 4,29 / **1,95** | 11,00 / 7,94 / **3,06** | 21,20 / 14,81 / **6,39** | 55,20 / 36,51 / **18,69** |

**Margem mínima: R$ 0,50** (Pix de R$ 30 com afiliado a 30%), contra R$ 0,20 na tabela anterior. No pedido mínimo de R$ 10 com afiliado a 30% a margem é R$ 0,35 no Pix.
Nenhuma célula fica negativa, com ou sem afiliado. O código recusa a venda que não cobre o custo (`taxa_menor_que_o_custo`). Se a Lytex não cobrar o repasse da parte da Staypse, a margem sobe R$ 0,10.
Contrato Lytex vale até 17/04/2027: refazer esta tabela em fev/2027 (se o Pix voltar a 0,99% com mínimo de R$ 1,89, a margem do Pix de R$ 800 com afiliado ainda passa de R$ 4).

### 10.3 Curva de Laffer: como foi escolhido o ponto

**Ideia.** Receita de taxa = taxa × volume que continua passando pela plataforma. Subir a taxa aumenta o ganho por pedido e reduz o volume (a loja migra para Hotmart, Kiwify, Pix
direto ou maquininha). O ponto de máxima RECEITA fica onde a elasticidade da demanda é 1; o de máximo LUCRO fica antes, onde (taxa menos custo) ÷ taxa = 1 ÷ elasticidade (regra de Lerner).
Contadores e financeiros fazem o mesmo em planilha: fixam um teto pelo preço de referência do mercado, estimam elasticidade por segmento e escolhem o ponto robusto, não o de máximo teórico.

**Teto (preço de referência das grandes).** A taxa efetiva (taxa total ÷ pedido, ponderada pelo mix de meios do perfil) fica abaixo de 50% da Hotmart no mesmo ticket. Isso mantém a
mensagem "metade do infoprodutor" e deixa folga também para Kiwify (8,99% + R$ 2,49) e Shopee (14% a 20% + fixo). A escolha respeita esse teto em todos os perfis.

**Elasticidade por perfil** (estimada, sem pesquisa primária; elasticidade = queda % do volume para cada 1% de aumento da taxa efetiva):

| Perfil | Peso nos pedidos | Ticket | Elasticidade | Por quê |
|---|---|---|---|---|
| Loja física pequena | 35% | R$ 80 | 1,8 | compara com maquininha e Pix direto; sente o fixo |
| Loja média (físico e digital) | 25% | R$ 150 | 1,1 | compara com Nuvem Pago e Mercado Pago |
| Fábrica (B2B leve) | 15% | R$ 400 | 1,5 | negocia; sente o percentual; usa mais boleto |
| Infoprodutor | 25% | R$ 150 | 0,5 | compara com Hotmart (9,9%); paga 5% a 6% sem reclamar |

**Resultado do modelo.** Demanda de elasticidade constante por perfil, sobre a taxa efetiva do mix do perfil, teto de 50% da Hotmart, buscando em grade as taxas de Pix e boleto (percentual e fixo) e as do cartão
(boleto = Pix + R$ 0,30; 2x a 6x = 1x + 0,6 p.p.; 7x a 12x = 1x + 1,2 p.p., que repassa o custo da Lytex por faixa). Escolha por mínimo arrependimento entre 6 cenários (elasticidade x 0,7, 1,0 e 1,3; Simples Anexo III e V).

- O máximo teórico do modelo (Pix 3,0% + R$ 2,75; cartão 5,25% + R$ 0,75) encosta no teto e **perde 31% do GMV**. Dá 2,33 de lucro por pedido-base contra 1,89 da tabela final, mas só se a elasticidade estimada estiver certa:
  com o dobro dela empata (1,64 contra 1,66) e com o triplo perde (1,20 contra 1,47), retendo só 37% do GMV. Isso é "sentar a mão": ganha no papel e depende de um número que não foi medido.
- Com a restrição de **não perder mais de ~12% do GMV no cenário base**, o modelo escolhe manter o percentual do Pix em 1,5% (as lojas pequenas e as fábricas sentem o percentual), mexer pouco no fixo
  e pôr o aumento no **cartão**, onde está o infoprodutor (elasticidade baixa) e onde a taxa final ainda é cerca de metade da Hotmart.
- A tabela final arredonda essa região (Pix R$ 2,30; boleto R$ 2,60; cartão 5,6% + R$ 0,80). Ela fica a ~80% do lucro do máximo teórico no cenário base, em troca de reter 88% do GMV (contra 69%), e **é a melhor das duas se a elasticidade for 2x a estimada ou mais**. Taxa efetiva do mix de cada perfil: 5,4% (loja pequena), 4,8% (média), 3,4% (fábrica) e 5,4% (infoprodutor), todas abaixo de 50% da Hotmart.

**Sensibilidade (lucro por pedido-base, depois do imposto do Anexo III; 1,00 = tabela anterior):**

| Elasticidade (x estimada) | 0,7 | 1,0 | 1,3 | 2,0 | 3,0 |
|---|---|---|---|---|---|
| Lucro por pedido-base, anterior | 1,40 | 1,40 | 1,40 | 1,40 | 1,40 |
| Lucro por pedido-base, **final** | 1,96 | **1,89** | 1,82 | 1,66 | 1,47 |
| Variação | +40% | **+35%** | +30% | +19% | +5% |
| GMV retido | 91% | **88%** | 84% | 77% | 68% |

Leitura: mesmo se a demanda for três vezes mais sensível que a estimada, a tabela final não perde dinheiro em relação à anterior (+5%). No Anexo V os valores são menores, mas o sinal é o mesmo (1,26 contra 1,70 no cenário base).
A proposta de `docs/viabilidade-financeira.md` (Pix e boleto +R$ 0,50 no fixo, cartão +0,4 p.p.) fica em 1,74 (+25%) e perde 9% do GMV: é mais cautelosa, mas deixa ~8% de lucro na mesa no cenário base. **A final pega mais no cartão e menos no Pix**, que é onde a demanda é menos sensível.

### 10.4 Comparação com as grandes (taxa efetiva total para a loja)

| Venda | Staypse Pix | Staypse cartão 1x | Hotmart | Kiwify | Shopee |
|---|---|---|---|---|---|
| R$ 30 | 9,2% (R$ 2,75) | 8,3% (R$ 2,50) | 18,2% | 17,3% | 35,0% |
| R$ 80 | 4,4% | 6,6% | 13,0% | 12,1% | 34,0% |
| R$ 150 | 3,0% | 6,1% | 11,6% | 10,7% | 24,7% |
| R$ 300 | 2,3% | 5,9% | 10,7% | 9,8% | 19,3% |
| R$ 800 | 1,8% | 5,7% | 10,2% | 9,3% | 16,0% |

Fontes da seção 2 (valores de terceiros, conferir antes de publicar comparativos). **Exceção a registrar:** no pedido de exatamente R$ 10 a tarifa mínima (R$ 2,50) é maior que a microvenda da Hotmart (20%, R$ 2,00); acima de R$ 10,01 a Hotmart cobra R$ 3,48 ou mais.
A Staypse fica abaixo de todas as grandes em todos os tickets da tabela, e acima do gateway puro (Nuvem Pago, 1% a 4,7%), que não tem split, afiliados nem vitrine.

### 10.5 Impostos, buffer e custos fora do split

- **Imposto sobre a taxa (a receita da Staypse é só a taxa):** Simples Nacional Anexo III (6% na 1ª faixa) se o **fator R** (folha com pró-labore >= 28% da receita dos 12 meses) for atendido; senão Anexo V (15,5%).
  Cenários: Anexo III = base; Anexo V = pessimista. A diferença é de ~R$ 0,19 por pedido de R$ 150 depois do imposto (1,87 contra 1,68). **Quem decide o enquadramento é o contador** (CNAE, fator R, base de cálculo): confirmar antes do lançamento.
- **Buffer de chargeback e inadimplência:** 0,15% do GMV de cartão e 0,02% do GMV de Pix e boleto (estimativa, E). O risco contratual do chargeback é da loja; o buffer cobre o que a Staypse pode ter de arcar (tarifa de contestação, cobrança que a Lytex debite da conta principal). Em R$ 150 no cartão são R$ 0,23 contra R$ 2,59 de margem bruta.
  Inadimplência de comprador não existe para a Staypse: a taxa sai do split no ato do pagamento, sem crédito concedido. Gatilho: chargeback sustentado acima de 1% do GMV de cartão exige revisão.
- **Subconta:** R$ 10 + R$ 2/mês por recebedor. Amortizada em ~R$ 0,10 por pedido (loja com ~25 pedidos/mês no primeiro ano). Só se cria no 1º produto aprovado (loja) ou na 1ª venda (afiliado e vendedor): ver seção 8.
- **Margem de contribuição por pedido** (média do mix de meios; afiliado em 50% dos pedidos a 20%; já com buffer e subconta; depois do imposto):

| Ticket | Anterior (III / V) | **Final (III / V)** |
|---|---|---|
| R$ 80 | 0,51 / 0,46 | **1,05 / 0,94** |
| R$ 150 | 1,13 / 1,01 | **1,87 / 1,68** |
| R$ 300 | 3,07 / 2,76 | **4,28 / 3,85** |

- **Ponto de equilíbrio** (ticket R$ 150, mix de `docs/viabilidade-financeira.md`, sem pró-labore): custo fixo de R$ 410 (fase 0) = **218 pedidos/mês** no Anexo III (243 no V); R$ 1.900 (fase 1) = **~1.010** (~1.130 no V);
  R$ 5.200 (fase 2) = **~2.770** (~3.090 no V). Na tabela anterior a fase 1 pedia ~1.690 pedidos (Anexo III), então a final reduz o ponto de equilíbrio em ~40%.

### 10.6 Ponte de variância (variance-analysis): tabela anterior para a final, por pedido-base, Anexo III, elasticidade estimada

| Passo | Efeito |
|---|---|
| Lucro por pedido-base, tabela anterior | 1,40 |
| Efeito preço (mais taxa por pedido que permanece, ×86% do volume) | **+0,68** |
| Efeito volume (14% dos pedidos migram; mix e elasticidade do modelo) | **-0,19** |
| **Lucro por pedido-base, tabela final** | **1,89** (+0,49, +35%) |

Verificação: 1,40 + 0,68 - 0,19 = 1,89. Anexo V: 1,26 + 0,61 - 0,17 = 1,70. O efeito volume é o que a análise de sensibilidade (10.3) testa contra elasticidades maiores.

### 10.7 Incertezas (explícitas)

1. **Elasticidades:** estimadas por perfil, sem pesquisa primária e sem dado de venda. É a maior incerteza. Cada ponto da elasticidade muda o lucro final em ~5%.
2. **Taxas dos concorrentes:** de terceiros em boa parte (Kiwify, Eduzz, Monetizze, Braip, Nuvem Pago cartão). Conferir antes de qualquer comparativo público.
3. **Mix de meios** (45% Pix, 8% boleto, 17% cartão 1x, 30% parcelado): hipótese. Muda a margem em ~R$ 0,3 por pedido.
4. **Tributos e fator R:** dependem do contador.
5. **Chargeback e tarifas Lytex não listadas** (prazo, estorno, subconta parada): perguntas em `docs/lytex/PERGUNTAS.md`.
6. **Pedidos por loja** e custo fixo: faixa de erro de +/- 30% (viabilidade).

**Como validar (90 dias):** acompanhar conversão do cadastro à 1ª venda, churn de lojas, GMV por loja, mix de meios e pedidos pagos por fora (Pix direto). **Gatilhos para reverter:** perda de GMV acima de 20% em 60 dias sem queda
de pedidos de lojas novas, ou churn de lojas ativas acima de 8% ao mês: voltar o cartão 1x para 5,2% + R$ 0,60 (meio caminho). **Gatilho para subir mais:** nenhuma reclamação e GMV estável em 60 dias: +0,3 p.p. só no cartão.

### 10.8 Aviso prévio e vigência

- As lojas já aceitaram a tabela de taxas "informada antes da publicação de cada produto". Por decisão do dono não há novo aceite: há **aviso prévio de 30 dias**.
- Notificação para todas as lojas ("Novas taxas a partir de DATA", link `/taxas`, também por e-mail), aviso no painel da loja e na página `/taxas` (tabela atual e nova lado a lado até a data).
- `configuracoes.taxas_vigencia_em` (padrão: 30 dias depois da publicação), `taxas_anteriores` (a tabela anterior). Até a data, `dados_split_pedido` entrega as taxas anteriores (sem tarifa mínima e sem pedido mínimo); depois, as novas.
- Contrato do produtor e Termos: cláusula "alteração de taxas com aviso prévio de 30 dias; continuar usando depois da vigência é aceite" (versões 2026-12-13.1, sem forçar novo aceite).
- **Antes de publicar em produção:** o contador e o jurídico revisam a tabela e a cláusula; a data de vigência vale a partir da aplicação da migração em produção.

### 10.9 Plano Pro (opção futura, não implementado)

Da `docs/viabilidade-financeira.md`: R$ 79/mês para lojas de maior volume, com percentual menor (ex.: Pix 1,0%), API, webhooks e conectores. Ponto de virada contra a tabela final no Pix: com taxa 0,5 p.p. menor, a loja economiza R$ 79 acima de ~R$ 15.800 de GMV
em Pix por mês. Só faz sentido com lojas acima desse volume e com dado real de uso. Não entra no escopo atual.


## 11. Decisão do dono (24/11/2026)

Mantida a tabela anterior, mais acessível: Pix 1,5% + R$ 2,00; boleto 1,5% + R$ 2,30; cartão 1x 4,9% + R$ 0,50; 2 a 6x 5,5% + R$ 0,50; 7 a 12x 6,1% + R$ 0,50. Aumento agendado cancelado; sem tarifa mínima; pedido mínimo de R$ 10 mantido. Revisar com 3 meses de dados reais.
