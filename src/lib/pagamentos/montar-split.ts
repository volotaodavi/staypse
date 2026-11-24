// Monta o split de uma cobrança a partir dos dados do pedido (dados_split_pedido), função
// PURA, testada em montar-split.test.ts. Quem calcula os valores é calcularSplit; aqui só se
// traduz "quem recebe quanto" para a lista de partes que o provedor espera e para o
// snapshot guardado no pedido (auditoria).
// A Staypse NÃO recebe nem repassa: sua parte é um recebedor como os outros, na conta dela no provedor.
import { calcularSplit, type EntradaSplit, type ResultadoSplit } from "./split";
import { lerTaxasPlataforma, type Modalidade } from "./taxas";
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
  // configurações de taxa (tabela configuracoes), chaves taxa_total_*, custo_lytex_* e custo_lytex_split
  taxas: Record<string, unknown>;
};

export type PapelDaParte = "produtor" | "indicador" | "staypse";

export type SnapshotSplit = {
  versao: 2;
  entrada: EntradaSplit;
  resultado: ResultadoSplit;
  // INTERNO (só admin; orders.split_snapshot não é legível por usuário logado)
  taxas: { modalidade: Modalidade; taxa_total_centavos: number; custo_lytex_centavos: number; receita_staypse_centavos: number };
  taxaMeioInformada: boolean;
  partes: (ParteSplit & { papel: PapelDaParte; indicador?: EntradaSplit["indicador"] })[];
};

// Parcelamento com juros pago pelo comprador: `modalidade` continua sendo a do cartão (custo da Lytex), mas a taxa da
// loja e do afiliado é a do cartão à vista; o acréscimo (juros.ts) vai na fatura e fica com a Staypse.
export type OpcoesSplit = { acrescimoCentavos?: number };

export function montarSplit(
  dados: DadosSplitPedido,
  staypseRecebedorId: string,
  modalidade: Modalidade,
  opcoes: OpcoesSplit = {},
): { partes: ParteSplit[]; snapshot: SnapshotSplit } {
  const t = lerTaxasPlataforma(dados.taxas);
  const acrescimo = opcoes.acrescimoCentavos ?? 0;
  const entrada: EntradaSplit = {
    totalCentavos: dados.total_centavos,
    subtotalCentavos: dados.subtotal_centavos,
    modalidade,
    taxaTotal: t.taxaTotal[acrescimo > 0 ? "cartao_1x" : modalidade],
    taxaMinimaCentavos: t.taxaMinimaCentavos,
    acrescimoCentavos: acrescimo,
    custoLytex: t.custoLytex[modalidade],
    custoSplit: t.custoSplit,
    comissaoPercentual: dados.indicador === "nenhum" ? 0 : Number(dados.comissao_percentual),
    indicador: dados.indicador,
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
  // a soma das partes + o custo da Lytex é EXATAMENTE o total cobrado, acréscimo incluso (nunca sobra nem falta um centavo)
  const soma = partes.reduce((s, p) => s + p.valorCentavos, 0);
  if (soma + resultado.custoLytexCentavos !== dados.total_centavos + acrescimo) throw new Error("split_nao_fecha_com_o_total");

  return {
    partes: partes.map(({ recebedorProvedorId, valorCentavos }) => ({ recebedorProvedorId, valorCentavos })),
    snapshot: {
      versao: 2,
      entrada,
      resultado,
      taxas: {
        modalidade,
        taxa_total_centavos: resultado.taxaTotalCentavos,
        custo_lytex_centavos: resultado.custoLytexCentavos,
        receita_staypse_centavos: resultado.staypseCentavos,
      },
      taxaMeioInformada: true,
      partes: comPapel,
    },
  };
}
