# Viabilidade financeira da Staypse

Data: 2026-11-23. Valores em R$. Base: `docs/precificacao.md` (taxas e margens por célula), `docs/integracoes.md` (custos de ferramentas) e contrato Lytex.
Convenção: **(E)** = estimativa minha, sem fonte verificada. **(C)** = a confirmar (Lytex, contador ou fornecedor). Não sou contador nem advogado: tributos e contratos exigem validação profissional.
Limite desta análise: a busca web não estava disponível, então o mix de meios de pagamento abaixo é uma hipótese (E), sem fonte citada. Validar com dados reais dos primeiros 200 pedidos.

## Atualização de 2026-11-24: taxa final decidida (ver `docs/precificacao.md`, seção 10)

O dono pediu para revisar os valores "sem sentar a mão e sem tomar prejuízo", pela curva de Laffer. O resultado substitui os ajustes sugeridos na seção 6 deste documento:

| Item | Sugestão da seção 6 | **Decisão final** | Por quê |
|---|---|---|---|
| Pix e boleto | +R$ 0,50 no fixo (R$ 2,50 e R$ 2,80) | **R$ 2,30 e R$ 2,60**, percentual 1,5% igual | loja pequena e fábrica são as mais sensíveis ao Pix; o ganho vem do cartão |
| Cartão | +0,4 p.p. (5,3%, 5,9%, 6,5%) | **5,6%, 6,2% e 6,8%** + R$ 0,80 | infoprodutor (pouca sensibilidade) concentra o cartão; ainda ~metade da Hotmart |
| Tarifa mínima | R$ 3,00 | **R$ 2,50** | cobre o custo e o buffer em vendas de R$ 10 a R$ 47 sem passar da microvenda das grandes |
| Pedido mínimo | R$ 10 | **R$ 10** | abaixo disso nem o Pix cobre o custo |
| Plano Pro (R$ 79) | recomendado | **opção futura, não implementado** | sem dado de uso real; ponto de virada só acima de ~R$ 15.800 de Pix por mês |

Efeito (modelo da seção 10 de precificacao.md, ticket R$ 150, mix desta análise, buffer de chargeback e subconta incluídos, depois do imposto):

- Margem de contribuição por pedido: **R$ 1,13 para R$ 1,87** no Simples Anexo III e **R$ 1,01 para R$ 1,68** no Anexo V (fator R não atendido).
- Ponto de equilíbrio da fase 1 (custo fixo ~R$ 1.900): de ~1.690 para **~1.010 pedidos/mês** (Anexo III) e ~1.130 (Anexo V). Fase 0: **218 pedidos/mês**. Fase 2: ~2.770.
- Margem mínima por célula (pior caso com afiliado): **R$ 0,50** (antes R$ 0,20). Chargeback: buffer de 0,15% do GMV de cartão e 0,02% de Pix e boleto, mais ~R$ 0,10 por pedido de subconta.
- Risco de volume: o modelo perde ~12% do GMV no cenário base (elasticidades estimadas, sem pesquisa primária). Mesmo com demanda 3x mais sensível, o lucro não cai abaixo da tabela anterior (+5%).
- Parcelamento passou a ser política da loja (até Nx sem juros; acima, o comprador paga só a diferença de taxa da faixa): a taxa de 2x a 6x e de 7x a 12x pesa para a loja só nas parcelas sem juros que ela escolhe oferecer.
- Aviso prévio de 30 dias às lojas antes da vigência; até lá, taxas anteriores. As tabelas das seções 1 a 6 abaixo usam a tabela anterior e ficam como histórico.

## Resumo em 5 linhas

- A taxa proposta cobre o custo Lytex e deixa ~0,75% a 1,0% do GMV de margem bruta (R$ 0,71 a R$ 3,00 por pedido). É um piso, não um negócio.
- Com o mix abaixo e o custo fixo recomendado, o ponto de equilíbrio é ~360 pedidos/mês na fase 1 e ~2.500 na fase 2 (sem pró-labore).
- O maior risco não é a taxa: é o **enquadramento tributário**. No Anexo V do Simples (15,5%) quase toda a margem some.
- Em 12 meses, só o cenário otimista chega a zero com a taxa atual. Com os 3 ajustes (seção 6), o cenário base fica positivo.
- A taxa continua 40% a 60% abaixo de Hotmart e Kiwify mesmo após os ajustes, então há espaço para subir.

## 1. Unit economics por pedido

Mix de meios (E, loja de físicos e digitais, Brasil): Pix 45%, boleto 8%, cartão 1x 17%, 2 a 6x 20%, 7 a 12x 10%.
Margem usa o **pior caso** do doc de precificação (afiliado com 30%, 3 repasses). Sem afiliado, a margem é igual ou até R$ 0,2 maior (C: depende de a Lytex cobrar o repasse da própria Staypse).

| Por pedido (média ponderada) | R$ 80 | R$ 150 | R$ 300 |
|---|---|---|---|
| Taxa cobrada da loja (receita bruta Staypse) | 3,99 | 6,33 | 11,33 |
| Take rate (taxa / ticket) | 5,0% | 4,2% | 3,8% |
| Custo Lytex (processamento + split) | 3,28 | 5,19 | 8,33 |
| **Margem de contribuição** | **0,71** | **1,13** | **3,00** |
| Margem / GMV | 0,89% | 0,75% | 1,00% |

Quem fica com quanto, com afiliado a 20% (comissão típica de 10% a 30%, E):

| Ticket | Comprador paga | Afiliado | Taxa total | (do qual Lytex) | (do qual Staypse) | **Loja recebe** | Loja, % do ticket |
|---|---|---|---|---|---|---|---|
| R$ 80 | 80,00 | 16,00 | 3,99 | 3,28 | 0,71 | **60,01** | 75,0% |
| R$ 150 | 150,00 | 30,00 | 6,33 | 5,19 | 1,13 | **113,67** | 75,8% |
| R$ 300 | 300,00 | 60,00 | 11,33 | 8,33 | 3,00 | **228,67** | 76,2% |

Leitura: de cada R$ 100 vendidos com afiliado a 20%, a loja leva ~R$ 76, o afiliado R$ 20, a Lytex ~R$ 3,5 e a Staypse ~R$ 0,8 a R$ 1,0. A Staypse fica com a menor fatia da cadeia, e ainda assume o risco operacional. Sem afiliado, a loja leva ~R$ 95,8.
Custos que **não** estão na margem: nota fiscal Lytex (R$ 0,99 por NF), e-mail (R$ 0,15), SMS (R$ 0,25), WhatsApp (R$ 0,59), saque (R$ 2,80 ou R$ 6,20), criação de subconta (R$ 10) e imposto. Cada um deles, se aplicado por pedido, consome de 15% a 90% da margem (seção 3).

## 2. Custos fixos mensais e ponto de equilíbrio

Câmbio (E): US$ 1 = R$ 5,5. Vercel Hobby é de uso não comercial (C: confirmar termos), então o plano Pro é o recomendado ao lançar.

| Item | Fase 0 (0 a 100 lojas) | Fase 1 (100 a 1.000) | Fase 2 (1.000+) |
|---|---|---|---|
| Vercel (Pro US$ 20 por membro, mais uso) | 110 | 300 | 500 |
| Supabase (Pro US$ 25, mais compute/banco) | 140 | 400 | 800 |
| Resend (grátis até 3.000/mês; Pro US$ 20 a Scale) | 0 | 110 | 400 |
| Domínio e DNS | 4 | 4 | 4 |
| Contador | 0 (MEI) | 500 (E, ME Simples) | 1.000 (E) |
| DAS do MEI | 86 (E) | 0 | 0 |
| Subcontas ociosas (R$ 2 cada, E: 10 / 100 / 500) | 20 | 200 | 1.000 |
| Ferramentas (monitoramento, suporte, e-mail, backup, NF) | 50 | 400 | 1.500 |
| **Total (sem pessoal)** | **~410** | **~1.900** | **~5.200** |

Faixa de erro: +/- 30% (E). Fora do total: pró-labore, dev, suporte humano, jurídico, marketing, e imposto sobre receita a partir da fase 1.
Se ficar nos planos gratuitos até validar, a fase 0 cai para ~R$ 100, com risco de pausa do Supabase e do termo comercial da Vercel.

Ponto de equilíbrio (margem de contribuição após imposto, ticket R$ 150, mix acima):

| Situação | Margem por pedido | Fase 0 | Fase 1 | Fase 2 |
|---|---|---|---|---|
| Taxa atual, MEI (fase 0) ou Anexo III 6% | 1,13 / 0,75 | 363 pedidos (GMV R$ 54 mil) | 2.533 (R$ 380 mil) | 6.933 (R$ 1,04 mi) |
| Taxa atual, Anexo V 15,5% | 0,15 | n/a | ~12.700 (R$ 1,9 mi) | ~34.700 (R$ 5,2 mi) |
| Taxa ajustada (seção 6), Anexo III | 1,68 / 1,27 | 244 (R$ 37 mil) | 1.496 (R$ 224 mil) | 4.094 (R$ 614 mil) |

Com pró-labore de R$ 3.000 (E), some ~4.000 pedidos/mês ao equilíbrio atual e ~2.400 ao ajustado. Pense nisso antes de decidir viver só da Staypse.

## 3. Contabilidade e tributos (consultar contador)

**MEI hoje.** Limite R$ 81 mil/ano (R$ 6.750/mês). Passar até 20% (R$ 97.200) gera DAS complementar; acima disso, o enquadramento muda retroativamente a janeiro (C: regra vigente). Como a Staypse só fatura a própria taxa, 6,33 por pedido de R$ 150 significa que o MEI estoura com ~12.800 pedidos/ano, ~1.070/mês, GMV ~R$ 160 mil/mês. No cenário base (seção 6) isso ocorre por volta do mês 9 a 11.
Pontos a confirmar com contador **antes do lançamento**: (a) se o CNAE de intermediação/agenciamento de serviços é permitido ao MEI; (b) se a atividade de plataforma/marketplace cabe no MEI; (c) se a receita bruta da Staypse é a taxa cheia (incluindo o custo Lytex) ou só a parte líquida. Hipótese conservadora: taxa cheia.

**Migrar para ME (Simples Nacional).** Planejar a migração a ~R$ 55 mil de faturamento acumulado no ano, não no limite. Anexo III (6% na primeira faixa) exige fator R: folha (inclui pró-labore) de pelo menos 28% da receita bruta dos últimos 12 meses. Abaixo disso, Anexo V (15,5% na primeira faixa). Qual anexo se aplica depende do CNAE (tecnologia, intermediação, agenciamento: C). Sensibilidade: sobre R$ 100 mil de taxa, a diferença III contra V é ~R$ 9.500 por ano. O pró-labore para chegar a 28% da receita é custo real, mas costuma compensar.
ISS: municipal, normalmente dentro do DAS no Simples; intermediação pode ter retenção por tomador. Reforma tributária (CBS/IBS) entra gradualmente: pedir ao contador o impacto 2027 em diante (C).

**Nota fiscal da Staypse.** Emitir NFS-e **sobre a taxa**, não sobre o GMV. Por pedido, o custo Lytex de R$ 0,99 consome 88% da margem do ticket de R$ 150. Recomendação: NF **mensal consolidada por loja** (uma nota com a soma das taxas), emitida pelo emissor do contador ou prefeitura (C: obrigatoriedade para MEI quando o tomador é PF; para PJ é obrigatória a emissão).

**O que NÃO é receita da Staypse:** valor do produto da loja, comissão do afiliado, frete e demais valores de terceiros no split. A Staypse não os recebe: a Lytex os liquida direto para as subcontas. Só a taxa da plataforma (parte Staypse) entra como receita. Guardar o extrato do split por pedido (`orders.split_snapshot`) como prova para fiscalização e contador. O custo Lytex pago por repasse pode ser dedutível ou não conforme o regime (C): no Simples, em regra, o imposto incide sobre a receita bruta, sem desconto.
Cada loja e afiliado emite a própria NF/RPA sobre o que recebe. Afiliado PF com pagamentos recorrentes: imposto de renda do afiliado é dele, mas confirmar se a Staypse tem obrigação de informar (DIRF/EFD-Reinf: C).

## 4. Gestão financeira

**Chargeback e estorno.** Prática de mercado: o risco fica com a loja, que é quem vende e entrega. Política recomendada nos termos: valor contestado e taxa de contestação debitados do saldo da loja (e da comissão do afiliado, proporcional); taxa da Staypse e custo Lytex **não devolvidos** (custo afundado). C: como a Lytex trata chargeback no contrato (quem é debitado, tarifa, prazo de contestação de até 120 dias no cartão, devolução de tarifa em estorno). Se a Lytex debitar a conta Staypse e não a subconta da loja, a Staypse vira garantidora: nesse caso exigir reserva (retenção de 5% a 10% do repasse por 30 dias nas lojas novas, se a Lytex permitir).
Reserva própria sugerida (E): R$ 2.000 a R$ 5.000 na fase 0, ou 1% do GMV mensal depois. Chargeback de cartão sustentado acima de ~1% do volume é sinal de alerta para a Lytex e para as bandeiras. Digitais: direito de arrependimento de 7 dias (CDC art. 49) gera reembolso legítimo; produto digital precisa de política clara de revogação de acesso (ver `pedido.reembolsado`).

**Fluxo de caixa.** Prazos de liquidação da Lytex por modalidade: **a confirmar com a Lytex** (Pix e boleto costumam ser D+0 a D+2 no mercado; cartão à vista costuma ser D+30; parcelado conforme parcela: tudo E, não da Lytex). Impacto: a Staypse recebe a taxa na mesma data do split, então não financia o caixa de ninguém. A despesa sai antes da receita (Vercel, Supabase e Lytex são cobrados na hora). Manter caixa mínimo de 3 meses de custos fixos (~R$ 1.200 na fase 0).

**Saques da conta Staypse.** Custo R$ 6,20 a partir do 6º saque (C: por mês ou por período). Política: **1 saque por semana ou quinzenal**, e só acima de R$ 200 (para o custo ficar abaixo de 3%). Saques das lojas e afiliados (R$ 2,80 na subconta): definir mínimo de saque e agrupar, ou fazer liquidação automática semanal. Quem paga: repassar a tarifa ao dono da subconta e não embutir na taxa.
**Subcontas**: R$ 10 + R$ 2/mês por recebedor (R$ 34 no primeiro ano). Já decidido: criar só na primeira venda ou no primeiro produto. Medir mensalmente subcontas sem venda há 90 dias.

## 5. Gestão comercial

**Posicionamento de preço** (de `docs/precificacao.md`): ticket R$ 150, a taxa efetiva fica em 2,8% (Pix) a 5,2% (cartão 1x) contra 11,6% da Hotmart, 27% da Shopee e ~3,8% do Nuvem Pago (gateway puro, sem afiliado nem split). Mensagem: "o split e os afiliados custam metade do infoprodutor". Cuidado: as taxas dos concorrentes têm fontes de terceiros (C), conferir antes de publicar comparativo. Não prometer ganho nem recrutamento (ver `docs/brief-staypse.md`).

**Lançamento.** Taxa promocional: 0,5 ponto percentual a menos nos primeiros 100 lojistas por 90 dias (já previsto). Custo: ~0,4 a 0,7 por pedido de R$ 150 (E), margem cai a ~R$ 0,5 a R$ 0,7. Só vale se a loja ativar de verdade; limitar a 100 lojas e 90 dias, com data de fim escrita no aceite. Meta de **120 liquidações/mês** para manter as taxas incentivo da Lytex: ~8 lojas ativas com 15 pedidos (E). Monitorar semanalmente; se faltar, concentre pedidos de teste reais em poucas lojas, nunca pedidos fictícios (risco fiscal e contratual com a Lytex).

**Canais de aquisição de lojas (CAC baixo, E).** (1) Outreach direto a fábricas pequenas e lojas com CNPJ, via comunidade e indicação, seguindo `brief-staypse.md`. (2) Parcerias com contadores e ERPs (Bling) que atendem MEI/ME. (3) Conteúdo sobre "como achar revendedores" e "Hotmart só serve para digital". (4) Primeiras lojas aceitam migrar com importação CSV. Mídia paga só depois de provar LTV: o ticket de margem é baixo demais para CAC de anúncio.

**CAC alvo e LTV (E, a validar).** Loja média: 25 pedidos/mês, ticket R$ 150, margem R$ 1,13 = R$ 28/mês bruta, R$ 19/mês após imposto de 6%. Vida de ~20 meses (churn de 5% ao mês) dá LTV de ~R$ 375, menos R$ 34 de subconta no primeiro ano. CAC alvo: **até R$ 100** (LTV/CAC de 3 vezes, payback abaixo de 6 meses). Com a taxa ajustada, o LTV sobe para ~R$ 500, CAC alvo até R$ 150. Loja de infoprodutor (cartão pesado, ticket maior) vale 2 a 3 vezes mais: priorizar.
**Métricas:** GMV mensal; take rate (taxa/GMV); margem de contribuição por pedido e por modalidade; mix de meios; lojas ativas (1 venda nos últimos 30 dias) e churn de lojas; ativação de afiliados (afiliados com 1ª venda sobre cadastrados); pedidos por loja; subcontas ociosas; taxa de chargeback/reembolso; liquidações do mês contra a meta de 120; caixa e meses de runway.

## 6. Veredito e ajustes

**A taxa proposta é viável?** Como cobertura de custo, sim: nenhuma célula fica negativa (margem mínima R$ 0,21). Como negócio sustentável, **não sozinha**: a margem de 0,75% a 1,0% do GMV não paga estrutura nem imposto antes de ~2.500 pedidos/mês, e some se o enquadramento for Anexo V. Há espaço: a taxa continua bem abaixo do mercado de afiliados.

**Ajustes recomendados (E, testar com 20 a 30 lojas antes de fixar):**
1. **Subir o fixo do Pix/boleto em R$ 0,50** (R$ 2,50 e R$ 2,80) e o percentual do cartão em 0,4 ponto (5,3%, 5,9%, 6,5%). Efeito: +R$ 0,55 por pedido de R$ 150, margem de 1,13 a ~1,68 (+49%). A loja ainda paga ~4,6% efetivo.
2. **Tarifa mínima por pedido** de R$ 3,00 na taxa total (abaixo de ~R$ 50 de ticket) e pedido mínimo de R$ 10, para proteger vendas pequenas, que dão margem de R$ 0,21 a R$ 0,5.
3. **Plano pago opcional "Pro"** (E: R$ 79/mês) para lojas de maior volume: percentual menor (ex.: Pix 1,0%), API, webhooks e conectores (Melhor Envio, NF). Dá receita recorrente que independe de GMV e cobre custo fixo. Responde à pergunta 6 de `docs/integracoes.md`.
4. Complementares: repassar a **taxa de subconta ativa** (R$ 2/mês, só para lojas sem venda por 90 dias), cobrar saque extra de quem pede mais de 1 por semana, e NF mensal consolidada.

**Cenários de 12 meses (E).** Premissas: crescimento linear de lojas ativas; ticket R$ 150; margem do mix; 50% dos pedidos com afiliado a 20% (10% do GMV); imposto Anexo III 6% (base cheia, mês de migração ignorado); custo fixo médio R$ 410 (conservador), R$ 1.300 (base), R$ 3.000 (otimista). Sem pró-labore. Valores em R$ mil.

| 12 meses | Conservador | Base | Otimista |
|---|---|---|---|
| Lojas ativas no mês 12 / pedidos por loja por mês | 40 / 8 | 150 / 15 | 400 / 20 |
| Pedidos no ano | 1.920 | 13.500 | 48.000 |
| **GMV** | 288 | 2.025 | 7.200 |
| **Para os usuários:** comissões a afiliados | 28,8 | 202,5 | 720 |
| Taxa paga pelas lojas (4,2%) | 12,2 | 85,5 | 303,8 |
| **Lojas recebem (líquido)** | 247 | 1.737 | 6.176 |
| **Para nós:** custo Lytex | 10,0 | 70,1 | 249,6 |
| Margem de contribuição | 2,2 | 15,3 | 54,2 |
| Impostos (6%; MEI/DAS no fixo do conservador) | 0 | 5,1 | 18,2 |
| Custos fixos | 4,9 | 15,6 | 36,0 |
| **Resultado, taxa atual** | **(2,7)** | **(5,4)** | **0,0** |
| **Resultado, com ajuste 1** (margem R$ 1,68) | **(1,7)** | **+1,5** | **+24,8** |
| Receita bruta do ano / limite MEI R$ 81 mil | 12,2: dentro | 85,5: estoura | 303,8: estoura |

Leitura: o conservador é prejuízo pequeno (R$ 2 a 3 mil), aceitável como custo de validar. O base só fecha o ano no zero com os ajustes, e ainda sem pró-labore. O otimista é negócio de verdade apenas com ajustes e Anexo III. **O plano Pro e a menor perda por chargeback não estão nesta tabela** (upside).
Incertezas maiores, em ordem: (1) enquadramento tributário e base de cálculo; (2) mix de meios, que muda a margem em ~R$ 0,3; (3) pedidos por loja; (4) chargeback e tarifas Lytex não listadas; (5) taxas de concorrentes (terceiros).

## Próximos passos (curtos)

1. Reunião com contador: CNAE, MEI ou ME, fator R, base de cálculo, NF mensal consolidada. Antes do lançamento.
2. Perguntar à Lytex (registrar em `docs/lytex/PERGUNTAS.md`): prazo por modalidade, chargeback, subconta parada, contagem do 6º saque, repasse da parte Staypse, tarifa de estorno.
3. Rodar 90 dias com 20 a 30 lojas, medir os indicadores da seção 5 e só então travar os ajustes 1 a 3.
