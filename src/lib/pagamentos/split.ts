// Cálculo da divisão do pagamento (split), função PURA, sem banco nem rede.
// A Staypse não recebe nem repassa dinheiro: este cálculo só diz à instituição
// de pagamento quanto vai para cada recebedor. Tudo em centavos inteiros.
//
// Regras:
//  * a soma das partes (+ o custo da Lytex retido por ela) é EXATAMENTE o total pago;
//  * a "taxa total" da modalidade (percentual + fixo, sobre o total da transação) já embute o custo da
//    Lytex; receita da Staypse = taxa total − custo Lytex;
//  * a taxa total é paga pela LOJA e pelo AFILIADO, proporcional à parte de cada um no valor do pedido
//    (padrão Hotmart): taxa do afiliado = taxa total × comissão ÷ total (para baixo); a loja paga o resto
//    (o centavo residual é dela). VENDEDOR próprio (split direto ou folha) NÃO paga taxa: recebe a comissão
//    cheia e a loja paga a taxa inteira;
//  * a comissão incide sobre o valor dos produtos (subtotal), nunca sobre o frete;
//  * vendedor "na folha" não tem recebedor: a parte dele fica com a loja, que paga fora;
//  * o comprador não paga taxa nenhuma; a loja absorve (desconto no repasse). Única exceção: parcelas ACIMA do limite
//    "sem juros" da loja. Aí a fatura leva um acréscimo (`acrescimoCentavos`, de juros.ts) que cobre só a diferença de
//    taxa da modalidade: loja e afiliado recebem EXATAMENTE o que receberiam no cartão à vista (a taxa deles é a do
//    1x) e o acréscimo fica com a Staypse, que paga o custo da Lytex sobre o total cobrado;
//  * a diferença de arredondamento sempre vai para a loja (taxa e comissão para baixo).
import { custoLytexCentavos, custoRepasseCentavos, taxaTotalCentavos, type CustoSplit, type Modalidade, type Taxa } from "./taxas";

export type { Taxa } from "./taxas";

export type EntradaSplit = {
  totalCentavos: number; // valor pago pelo comprador (produtos + frete)
  subtotalCentavos: number; // só os produtos (base da comissão)
  modalidade: Modalidade;
  taxaTotal: Taxa; // cobrada da loja (embute o custo da Lytex)
  custoLytex: Taxa; // INTERNO: contrato Lytex da modalidade
  custoSplit: CustoSplit; // INTERNO: cobrança por valor repassado
  comissaoPercentual: number; // 0 quando não há indicação
  taxaMinimaCentavos?: number; // tarifa mínima por pedido na taxa total (padrão 0)
  acrescimoCentavos?: number; // juros do parcelamento pagos pelo comprador (fatura = total + acréscimo); padrão 0
  indicador: "nenhum" | "afiliado" | "vendedor_split" | "vendedor_folha";
};

export type ResultadoSplit = {
  produtorCentavos: number; // o que a loja recebe (já sem a parte dela na taxa e sem a comissão)
  indicadorCentavos: number; // o que o afiliado ou vendedor split_direto recebe (afiliado: comissão menos a parte dele na taxa; 0 se "folha")
  staypseCentavos: number; // receita da Staypse = taxa total − custo Lytex estimado
  taxaTotalCentavos: number; // taxa da plataforma da venda (loja + afiliado); a divisão com a Lytex é interna
  taxaLojaCentavos: number; // parte da loja na taxa total
  taxaAfiliadoCentavos: number; // parte do afiliado na taxa total (0 para vendedor próprio e sem indicação)
  custoLytexCentavos: number; // INTERNO: estimativa do que a Lytex cobra (meio + repasses)
  comissaoDevidaCentavos: number; // comissão calculada (no caso "folha", paga pela loja fora do split)
  acrescimoCentavos: number; // juros do parcelamento pagos pelo comprador (0 na maioria das vendas)
  cobradoCentavos: number; // total da fatura: total do pedido + acréscimo
};

const inteiro = (n: number) => Number.isInteger(n) && n >= 0;

export function calcularSplit(e: EntradaSplit): ResultadoSplit {
  if (!inteiro(e.totalCentavos) || !inteiro(e.subtotalCentavos) || e.subtotalCentavos > e.totalCentavos) {
    throw new Error("valores_invalidos");
  }
  for (const t of [e.taxaTotal, e.custoLytex]) {
    if (!(t.percentual >= 0 && t.percentual < 100) || !inteiro(t.fixoCentavos)) throw new Error("taxa_invalida");
  }
  if (!(e.comissaoPercentual >= 0 && e.comissaoPercentual < 100)) throw new Error("comissao_invalida");
  if (e.indicador === "nenhum" && e.comissaoPercentual !== 0) throw new Error("comissao_sem_indicador");

  const acrescimo = e.acrescimoCentavos ?? 0;
  const minimo = e.taxaMinimaCentavos ?? 0;
  if (!inteiro(acrescimo) || !inteiro(minimo)) throw new Error("valores_invalidos");
  const taxaTotal = taxaTotalCentavos(e.totalCentavos, e.taxaTotal, minimo);
  // comissão sempre para baixo (nunca paga um centavo a mais do que o combinado)
  const comissao = Math.floor((e.subtotalCentavos * e.comissaoPercentual) / 100);
  const comissaoNoSplit = e.indicador === "afiliado" || e.indicador === "vendedor_split" ? comissao : 0;
  // só o AFILIADO paga a taxa, proporcional à comissão dele no total do pedido; o resíduo é da loja
  const taxaAfiliado = e.indicador === "afiliado" && e.totalCentavos > 0 ? Math.floor((taxaTotal * comissao) / e.totalCentavos) : 0;
  const taxaLoja = taxaTotal - taxaAfiliado;
  const indicador = comissaoNoSplit - taxaAfiliado;
  const produtor = e.totalCentavos - comissaoNoSplit - taxaLoja;
  if (produtor < 0) throw new Error("taxas_maiores_que_a_venda");

  // custo estimado da Lytex: meio de pagamento + repasse de cada recebedor (loja, indicador e Staypse)
  // (o custo do meio incide sobre o total COBRADO, acréscimo incluso)
  const receitaBruta = taxaTotal + acrescimo;
  let custo = custoLytexCentavos(e.totalCentavos + acrescimo, e.custoLytex) + custoRepasseCentavos(produtor, e.custoSplit) + custoRepasseCentavos(indicador, e.custoSplit);
  const antesDaStaypse = receitaBruta - custo;
  if (antesDaStaypse > 0) custo += custoRepasseCentavos(antesDaStaypse, e.custoSplit);
  const staypse = receitaBruta - custo;
  // venda tão pequena que a taxa total não cobre o custo: não se cobra no prejuízo
  if (staypse < 0) throw new Error("taxa_menor_que_o_custo");

  return {
    produtorCentavos: produtor,
    indicadorCentavos: indicador,
    staypseCentavos: staypse,
    taxaTotalCentavos: taxaTotal,
    taxaLojaCentavos: taxaLoja,
    taxaAfiliadoCentavos: taxaAfiliado,
    custoLytexCentavos: custo,
    comissaoDevidaCentavos: comissao,
    acrescimoCentavos: acrescimo,
    cobradoCentavos: e.totalCentavos + acrescimo,
  };
}
