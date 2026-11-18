// CSV do desempenho dos produtos no período.
import { montarCsv } from "@/lib/csv";
import { lerPeriodo } from "@/lib/periodo";
import { lerProdutosDaLoja } from "../consulta";

const reais = (c: number) => (Number(c) / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  const periodo = lerPeriodo(Object.fromEntries(new URL(request.url).searchParams));
  const produtos = await lerProdutosDaLoja(periodo);
  const csv = montarCsv(
    ["Produto", "Situação", "Preço (R$)", "Cliques", "Vendas", "Unidades", "Conversão (%)", "Faturamento (R$)"],
    produtos.map((p) => [
      p.nome,
      p.status_aprovacao,
      reais(p.preco_centavos),
      p.cliques,
      p.vendas,
      p.unidades,
      Number(p.cliques) > 0 ? ((Number(p.vendas) / Number(p.cliques)) * 100).toFixed(1).replace(".", ",") : "",
      reais(p.faturamento_centavos),
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produtos-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
