// CSV "Minhas vendas" do vendedor próprio: data, produto, loja, valores e situação.
// Nenhum dado do comprador. Só as vendas feitas como vendedor da loja.
import { montarCsv } from "@/lib/csv";
import { exigirPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { lerPeriodo } from "@/lib/periodo";
import { SITUACAO_COMISSAO, lerComissoes } from "../../../afiliado/consulta";

const reais = (c: number) => (Number(c) / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  await exigirPapel("vendedor_proprio");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const periodo = lerPeriodo(sp);
  const vendas = await lerComissoes("vendedor", periodo);
  const csv = montarCsv(
    ["Data", "Produto", "Quantidade", "Loja", "Valor da venda (R$)", "Comissão (R$)", "Situação"],
    vendas.map((v) => [
      dataHora(v.data),
      v.produto,
      v.quantidade,
      v.loja,
      reais(v.valor_centavos),
      reais(v.comissao_centavos),
      SITUACAO_COMISSAO[v.situacao] ?? v.situacao,
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="minhas-vendas-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
