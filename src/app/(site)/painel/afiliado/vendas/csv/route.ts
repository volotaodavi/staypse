// CSV "Minhas vendas" (afiliado ou vendedor): data, produto, loja, valores e situação.
// Nenhum dado do comprador. ?papel=vendedor para o painel do vendedor próprio.
import { montarCsv } from "@/lib/csv";
import { exigirPapel } from "@/lib/papeis";
import { ROTULO_ORIGEM_ATRIBUICAO, dataHora } from "@/lib/pedidos";
import { lerPeriodo } from "@/lib/periodo";
import { SITUACAO_COMISSAO, lerComissoes } from "../../consulta";

const reais = (c: number) => (Number(c) / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  await exigirPapel();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const papel = sp.papel === "vendedor" ? "vendedor" : "afiliado";
  const periodo = lerPeriodo(sp);
  const vendas = await lerComissoes(papel, periodo);
  const csv = montarCsv(
    ["Data", "Produto", "Quantidade", "Loja", "Origem", "Valor da venda (R$)", "Comissão (R$)", "Situação"],
    vendas.map((v) => [
      dataHora(v.data),
      v.produto,
      v.quantidade,
      v.loja,
      ROTULO_ORIGEM_ATRIBUICAO[v.origem_atribuicao ?? ""] ?? "",
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
