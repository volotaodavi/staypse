// CSV dos pedidos da loja (mesmo período e filtro da tela). Sem CPF/endereço:
// a planilha serve para conferência de vendas, não para circular dados pessoais.
import { montarCsv } from "@/lib/csv";
import { dataHora } from "@/lib/pedidos";
import { STATUS_EXIBICAO, statusExibicao } from "../../dados";
import { lerPedidosDaLoja, origemDaVenda } from "../consulta";

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { periodo, pedidos } = await lerPedidosDaLoja(sp);
  const csv = montarCsv(
    ["Pedido", "Data", "Itens", "Origem", "Situação", "Nota fiscal", "Total (R$)", "Taxa da plataforma (R$)", "Você recebe (R$)"],
    pedidos.map((p) => [
      p.codigo,
      dataHora(p.criado_em),
      p.order_items.map((i) => `${i.nome_item} x ${i.quantidade}`).join(" | "),
      origemDaVenda(p),
      STATUS_EXIBICAO[statusExibicao(p.status, p.order_items)],
      p.order_items.every((i) => i.nota_fiscal_numero) ? "Emitida" : "Pendente",
      reais(p.total_centavos),
      p.taxa_centavos == null ? "" : reais(p.taxa_centavos),
      p.recebe_centavos == null ? "" : reais(p.recebe_centavos),
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
