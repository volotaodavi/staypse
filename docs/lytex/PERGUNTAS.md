# Lytex — o que precisamos confirmar antes de integrar

A Staypse **nunca recebe, guarda ou repassa dinheiro de terceiros**: o split acontece
na Lytex, direto para a conta de cada recebedor. A Staypse também **não faz KYC
próprio**: a verificação de identidade é a da Lytex, no cadastro do recebedor.

O código já tem a interface (`src/lib/pagamentos/tipos.ts`) e um simulador
(`PAYMENTS_PROVIDER=mock`). O provedor Lytex (`src/lib/pagamentos/lytex.ts`) só será
implementado com a **documentação oficial** colocada nesta pasta (`docs/lytex/`).
Nenhum endpoint, campo ou formato foi inventado.

## Recebedores (subcontas) e verificação de identidade
1. É possível criar recebedores (subcontas) via API? Quais campos são obrigatórios?
2. A Lytex oferece **onboarding hospedado** (link para a pessoa completar o cadastro) ou só por API?
3. Quais **eventos de webhook** informam a mudança de status do recebedor (em análise, aprovado, recusado, suspenso)?
4. A Lytex devolve o **motivo da recusa** ou da suspensão? Em que campo?
5. **Pessoa física (CPF)** pode ser recebedor? Quais as exigências para **MEI**? Há limites de valor para MEI ou CPF?
6. A Staypse pode **consultar o status** do recebedor sem ter acesso aos documentos dele?
7. A consulta do recebedor devolve o CPF/CNPJ do titular, para conferirmos com o cadastro na Staypse?
8. Os dados bancários são informados direto na Lytex (a Staypse nunca vê)?

## Cobrança com split
9. O split é definido **por cobrança** (lista de recebedores + valor ou percentual de cada um)?
10. O split aceita valores em centavos fixos, percentuais ou os dois? Como a Lytex arredonda?
11. Meios de pagamento suportados (Pix, cartão à vista, cartão parcelado, boleto) e limite de parcelas.
12. **Taxas por meio de pagamento** (percentual e valor fixo) e se mudam com o parcelamento.
13. **Quem paga a taxa** do meio de pagamento: dá para escolher (só o recebedor principal ou proporcional entre os recebedores)?
14. A Lytex oferece **checkout hospedado** ou **tokenização de cartão**, para que nenhum dado de cartão passe pelo servidor da Staypse?
15. A taxa da plataforma (Staypse) é um recebedor do split como os outros?

## Estorno, reembolso e chargeback
16. Estorno **total e parcial** via API?
17. No estorno, a Lytex **desfaz o split proporcionalmente** e automaticamente (cada recebedor devolve a sua parte)?
18. Como funciona o **chargeback**? Quem é debitado? Quais eventos chegam por webhook?
19. Prazo para estorno de Pix, cartão e boleto (direito de arrependimento de 7 dias, CDC art. 49).

## Webhooks
20. Lista de **eventos** (cobrança criada, paga, recusada, estornada, chargeback; recebedor atualizado).
21. Como é a **assinatura** do webhook (algoritmo, cabeçalho, segredo) para validarmos a origem?
22. Os eventos têm **id único** (para idempotência)? Há reenvio automático? Com que frequência?
23. Ordem garantida? Atrasos esperados?

## Ambiente
24. **Sandbox**: como obter acesso, chaves e dados de teste (cartões, Pix simulado)?
25. URL base de sandbox e produção, autenticação (tipo de chave, cabeçalho) e limites de requisição.
26. Endpoint de **consulta para conciliação** diária (listar cobranças por período e status).

## Fiscal
27. A Lytex emite algum documento fiscal sobre a taxa dela? A nota do produto continua sendo do produtor (regra da Staypse)?
