// Juros do parcelamento pagos pelo comprador (função PURA, sem banco nem rede).
// Política da LOJA (parcelas_max e parcelas_sem_juros): até N parcelas sem juros a loja absorve a taxa da
// modalidade; acima de N o comprador paga um acréscimo calculado para que a loja receba o MESMO que receberia no
// cartão à vista. O acréscimo cobre só a diferença de taxa da modalidade (a Staypse não lucra com juros):
//   acréscimo A = menor valor com  A >= taxa_modalidade(total + A) − taxa_1x(total)
// (a taxa da modalidade incide sobre o total cobrado, acréscimo incluso). Não é uma taxa de juros da Lytex: o spec
// (docs/lytex/openapi-v2-sandbox.json) não tem campo de juros do parcelado (mulctAndInterest é multa e juros de ATRASO),
// então o valor entra no total da fatura (docs/lytex/PERGUNTAS.md, pergunta 53).
// O comprador nunca vê "taxa": vê parcela, "sem juros"/"com juros" e o total.
import { MAX_PARCELAS, maxParcelas } from "./parcelas";
import { modalidadeDoPagamento, taxaTotalCentavos, type Modalidade, type TaxasPlataforma } from "./taxas";

export type PoliticaParcelas = { parcelasMax: number; parcelasSemJuros: number };
// padrão da loja nova: até 12x, as 3 primeiras sem juros (decisão do dono, docs/precificacao.md seção 9)
export const POLITICA_PADRAO: PoliticaParcelas = { parcelasMax: MAX_PARCELAS, parcelasSemJuros: 3 };

export function politicaValida(p: PoliticaParcelas): boolean {
  return (
    Number.isInteger(p.parcelasMax) && p.parcelasMax >= 1 && p.parcelasMax <= MAX_PARCELAS &&
    Number.isInteger(p.parcelasSemJuros) && p.parcelasSemJuros >= 1 && p.parcelasSemJuros <= p.parcelasMax
  );
}

// Parcelas que o comprador pode escolher: o menor entre o limite da loja e o que o valor comporta (parcela mínima)
export function parcelasPermitidas(totalCentavos: number, p: PoliticaParcelas): number {
  return Math.max(1, Math.min(p.parcelasMax, maxParcelas(totalCentavos)));
}

// "até Nx sem juros" para a página do produto (mostrar só quando N > 1)
export function semJurosAte(totalCentavos: number, p: PoliticaParcelas): number {
  return Math.min(p.parcelasSemJuros, parcelasPermitidas(totalCentavos, p));
}

// o acréscimo vale para parcelas acima do limite sem juros (a faixa da modalidade define a taxa)
export function parcelaTemJuros(parcelas: number, p: PoliticaParcelas): boolean {
  return parcelas > 1 && parcelas > p.parcelasSemJuros;
}

export function acrescimoParcelamento(totalCentavos: number, modalidade: Modalidade, taxas: TaxasPlataforma): number {
  if (modalidade !== "cartao_2a6" && modalidade !== "cartao_7a12") return 0;
  if (!Number.isInteger(totalCentavos) || totalCentavos < 0) throw new Error("valores_invalidos");
  const minimo = taxas.taxaMinimaCentavos;
  const taxa1x = taxaTotalCentavos(totalCentavos, taxas.taxaTotal.cartao_1x, minimo);
  const t = taxas.taxaTotal[modalidade];
  // sobra(a) >= 0 quando o acréscimo `a` cobre a diferença de taxa
  const sobra = (a: number) => a - (taxaTotalCentavos(totalCentavos + a, t, minimo) - taxa1x);
  let a = Math.max(0, taxaTotalCentavos(totalCentavos, t, minimo) - taxa1x - 2);
  // (a taxa sobe menos de 1 centavo por centavo de acréscimo, então os laços terminam em poucos passos)
  while (sobra(a) < 0) a++;
  while (a > 0 && sobra(a - 1) >= 0) a--;
  return a;
}

export type OpcaoParcela = {
  parcelas: number;
  parcelaCentavos: number; // valor de cada parcela (para baixo; a diferença de centavos fica na última)
  totalCentavos: number; // o que o comprador paga no total
  semJuros: boolean;
};

export function opcoesParcelamento(totalCentavos: number, p: PoliticaParcelas, taxas: TaxasPlataforma): OpcaoParcela[] {
  const ate = parcelasPermitidas(totalCentavos, p);
  const lista: OpcaoParcela[] = [];
  for (let n = 1; n <= ate; n++) {
    const juros = parcelaTemJuros(n, p);
    const total = totalCentavos + (juros ? acrescimoParcelamento(totalCentavos, modalidadeDoPagamento("cartao", n), taxas) : 0);
    lista.push({ parcelas: n, parcelaCentavos: Math.floor(total / n), totalCentavos: total, semJuros: !juros });
  }
  return lista;
}
