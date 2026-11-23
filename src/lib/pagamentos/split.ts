// Cálculo da divisão do pagamento (split), função PURA, sem banco nem rede.
// A Staypse não recebe nem repassa dinheiro: este cálculo só diz à instituição
// de pagamento quanto vai para cada recebedor. Tudo em centavos inteiros.
//
// Regras:
//  * a soma das partes (+ o custo da Lytex retido por ela) é EXATAMENTE o total pago;
//  * a loja paga UMA taxa ("taxa total" da modalidade, percentual + fixo, sobre o total da
//    transação) que já embute o custo da Lytex; receita da Staypse = taxa total − custo Lytex;
//  * a comissão incide sobre o valor dos produtos (subtotal), nunca sobre o frete;
//  * vendedor "na folha" não tem recebedor: a parte dele fica com a loja, que paga fora;
//  * o comprador não paga taxa nenhuma; a loja absorve (desconto no repasse);
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
  indicador: "nenhum" | "afiliado" | "vendedor_split" | "vendedor_folha";
};

export type ResultadoSplit = {
  produtorCentavos: number;
  indicadorCentavos: number; // afiliado ou vendedor split_direto (0 se não houver ou se for "folha")
  staypseCentavos: number; // receita da Staypse = taxa total − custo Lytex estimado
  taxaTotalCentavos: number; // o que a loja paga (único número visível para ela)
  custoLytexCentavos: number; // INTERNO: estimativa do que a Lytex cobra (meio + repasses)
  comissaoDevidaCentavos: number; // comissão calculada (no caso "folha", paga pela loja fora do split)
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

  const taxaTotal = taxaTotalCentavos(e.totalCentavos, e.taxaTotal);
  // comissão sempre para baixo (nunca paga um centavo a mais do que o combinado)
  const comissao = Math.floor((e.subtotalCentavos * e.comissaoPercentual) / 100);
  const indicador = e.indicador === "afiliado" || e.indicador === "vendedor_split" ? comissao : 0;
  // a loja absorve a taxa total e os arredondamentos
  const produtor = e.totalCentavos - taxaTotal - indicador;
  if (produtor < 0) throw new Error("taxas_maiores_que_a_venda");

  // custo estimado da Lytex: meio de pagamento + repasse de cada recebedor (loja, indicador e Staypse)
  let custo = custoLytexCentavos(e.totalCentavos, e.custoLytex) + custoRepasseCentavos(produtor, e.custoSplit) + custoRepasseCentavos(indicador, e.custoSplit);
  const antesDaStaypse = taxaTotal - custo;
  if (antesDaStaypse > 0) custo += custoRepasseCentavos(antesDaStaypse, e.custoSplit);
  const staypse = taxaTotal - custo;
  // venda tão pequena que a taxa total não cobre o custo: não se cobra no prejuízo
  if (staypse < 0) throw new Error("taxa_menor_que_o_custo");

  return {
    produtorCentavos: produtor,
    indicadorCentavos: indicador,
    staypseCentavos: staypse,
    taxaTotalCentavos: taxaTotal,
    custoLytexCentavos: custo,
    comissaoDevidaCentavos: comissao,
  };
}
