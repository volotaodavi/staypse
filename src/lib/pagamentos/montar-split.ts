// Monta o split de uma cobrança a partir dos dados do pedido (dados_split_pedido) — função
// PURA, testada em montar-split.test.ts. Quem calcula os valores é calcularSplit; aqui só se
// traduz "quem recebe quanto" para a lista de partes que o provedor espera e para o
// snapshot guardado no pedido (auditoria).
// A Staypse NÃO recebe nem repassa: sua parte é um recebedor como os outros, na conta dela no provedor.
import { calcularSplit, type EntradaSplit, type ResultadoSplit, type Taxa } from "./split";
import type { ParteSplit } from "./tipos";

// Vem do banco (dados_split_pedido): ids dos recebedores NO PROVEDOR e valores-base do pedido
export type DadosSplitPedido = {
  total_centavos: number;
  subtotal_centavos: number;
  frete_centavos: number;
  comissao_percentual: number;
  indicador: EntradaSplit["indicador"];
  produtor_provedor_id: string;
  indicador_provedor_id: string | null;
  taxa_staypse_percentual: number;
};

// TODO(lytex): as taxas por meio de pagamento dependem do contrato (docs/lytex/PERGUNTAS.md, 12-13).
// Enquanto não forem conhecidas NÃO se inventa percentual: o cálculo usa zero e o snapshot
// registra que a taxa do meio ainda não foi informada (a instituição a retém dentro da parte do produtor).
export const TAXA_MEIO_DESCONHECIDA: Taxa = { percentual: 0, fixoCentavos: 0 };

export type PapelDaParte = "produtor" | "indicador" | "staypse";

export type SnapshotSplit = {
  versao: 1;
  entrada: EntradaSplit;
  resultado: ResultadoSplit;
  taxaMeioInformada: boolean;
  partes: (ParteSplit & { papel: PapelDaParte; indicador?: EntradaSplit["indicador"] })[];
};

export function montarSplit(
  dados: DadosSplitPedido,
  staypseRecebedorId: string,
  taxaMeio: Taxa = TAXA_MEIO_DESCONHECIDA,
): { partes: ParteSplit[]; snapshot: SnapshotSplit } {
  const entrada: EntradaSplit = {
    totalCentavos: dados.total_centavos,
    subtotalCentavos: dados.subtotal_centavos,
    taxaMeio,
    taxaStaypse: { percentual: Number(dados.taxa_staypse_percentual), fixoCentavos: 0 },
    comissaoPercentual: dados.indicador === "nenhum" ? 0 : Number(dados.comissao_percentual),
    indicador: dados.indicador,
    quemPagaTaxaMeio: "produtor",
  };
  const resultado = calcularSplit(entrada);

  const lista: SnapshotSplit["partes"] = [
    { papel: "produtor", recebedorProvedorId: dados.produtor_provedor_id, valorCentavos: resultado.produtorCentavos },
  ];
  // "folha": a loja paga o vendedor fora do split (indicadorCentavos = 0)
  if (resultado.indicadorCentavos > 0) {
    if (!dados.indicador_provedor_id) throw new Error("indicador_sem_recebedor");
    lista.push({
      papel: "indicador",
      indicador: dados.indicador,
      recebedorProvedorId: dados.indicador_provedor_id,
      valorCentavos: resultado.indicadorCentavos,
    });
  }
  if (resultado.staypseCentavos > 0) {
    lista.push({ papel: "staypse", recebedorProvedorId: staypseRecebedorId, valorCentavos: resultado.staypseCentavos });
  }
  const comPapel = lista.filter((p) => p.valorCentavos > 0);
  const partes = comPapel;
  // a soma das partes + a taxa do meio é EXATAMENTE o total (nunca sobra nem falta um centavo)
  const soma = partes.reduce((s, p) => s + p.valorCentavos, 0);
  if (soma + resultado.taxaMeioCentavos !== dados.total_centavos) throw new Error("split_nao_fecha_com_o_total");

  return {
    partes: partes.map(({ recebedorProvedorId, valorCentavos }) => ({ recebedorProvedorId, valorCentavos })),
    snapshot: { versao: 1, entrada, resultado, taxaMeioInformada: taxaMeio !== TAXA_MEIO_DESCONHECIDA, partes: comPapel },
  };
}
