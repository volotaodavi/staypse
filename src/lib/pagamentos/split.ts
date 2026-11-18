// Cálculo da divisão do pagamento (split) — função PURA, sem banco nem rede.
// A Staypse não recebe nem repassa dinheiro: este cálculo só diz à instituição
// de pagamento quanto vai para cada recebedor. Tudo em centavos inteiros.
//
// Regras:
//  * a soma das partes (+ a taxa do meio de pagamento retida pela instituição)
//    é EXATAMENTE o total pago;
//  * comissão e taxa da Staypse incidem sobre o valor dos produtos (subtotal),
//    nunca sobre o frete — o frete é da loja;
//  * vendedor "na folha" não tem recebedor: a parte dele fica com a loja, que
//    paga junto com o salário;
//  * quem paga a taxa do meio de pagamento é configurável (padrão: produtor);
//  * a diferença de arredondamento sempre vai para o produtor.

export type Taxa = { percentual: number; fixoCentavos: number };

export type EntradaSplit = {
  totalCentavos: number; // valor pago pelo comprador (produtos + frete)
  subtotalCentavos: number; // só os produtos (base da comissão e da taxa da Staypse)
  taxaMeio: Taxa; // da instituição de pagamento, conforme o meio/parcelas
  taxaStaypse: Taxa;
  comissaoPercentual: number; // 0 quando não há indicação
  indicador: "nenhum" | "afiliado" | "vendedor_split" | "vendedor_folha";
  quemPagaTaxaMeio: "produtor" | "proporcional";
};

export type ResultadoSplit = {
  produtorCentavos: number;
  indicadorCentavos: number; // afiliado ou vendedor split_direto (0 se não houver ou se for "folha")
  staypseCentavos: number;
  taxaMeioCentavos: number; // retida pela instituição de pagamento
  comissaoDevidaCentavos: number; // comissão calculada (no caso "folha", paga pela loja fora do split)
};

const inteiro = (n: number) => Number.isInteger(n) && n >= 0;
const taxa = (base: number, t: Taxa) => Math.round((base * t.percentual) / 100) + t.fixoCentavos;

export function calcularSplit(e: EntradaSplit): ResultadoSplit {
  if (!inteiro(e.totalCentavos) || !inteiro(e.subtotalCentavos) || e.subtotalCentavos > e.totalCentavos) {
    throw new Error("valores_invalidos");
  }
  for (const t of [e.taxaMeio, e.taxaStaypse]) {
    if (!(t.percentual >= 0 && t.percentual < 100) || !inteiro(t.fixoCentavos)) throw new Error("taxa_invalida");
  }
  if (!(e.comissaoPercentual >= 0 && e.comissaoPercentual < 100)) throw new Error("comissao_invalida");
  if (e.indicador === "nenhum" && e.comissaoPercentual !== 0) throw new Error("comissao_sem_indicador");

  const taxaMeio = taxa(e.totalCentavos, e.taxaMeio);
  const staypse = taxa(e.subtotalCentavos, e.taxaStaypse);
  // comissão sempre para baixo (nunca paga um centavo a mais do que o combinado)
  const comissao = Math.floor((e.subtotalCentavos * e.comissaoPercentual) / 100);
  const vaiParaIndicador = e.indicador === "afiliado" || e.indicador === "vendedor_split";

  let indicador = vaiParaIndicador ? comissao : 0;
  if (e.quemPagaTaxaMeio === "proporcional" && indicador > 0 && e.totalCentavos > 0) {
    // o indicador paga a parte da taxa proporcional ao que recebe
    indicador -= Math.floor((taxaMeio * indicador) / e.totalCentavos);
  }
  // o produtor fica com o resto: absorve a taxa (ou a parte dela) e os arredondamentos
  const produtor = e.totalCentavos - taxaMeio - staypse - indicador;
  if (produtor < 0) throw new Error("taxas_maiores_que_a_venda");

  return {
    produtorCentavos: produtor,
    indicadorCentavos: indicador,
    staypseCentavos: staypse,
    taxaMeioCentavos: taxaMeio,
    comissaoDevidaCentavos: comissao,
  };
}
