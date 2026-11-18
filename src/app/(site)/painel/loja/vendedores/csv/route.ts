// CSV do ranking de vendedores próprios no período.
import { montarCsv } from "@/lib/csv";
import { lerPeriodo } from "@/lib/periodo";
import { FORMA_VENDEDOR, lerVendedoresDaLoja } from "../consulta";

const reais = (c: number) => (Number(c) / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  const periodo = lerPeriodo(Object.fromEntries(new URL(request.url).searchParams));
  const vendedores = await lerVendedoresDaLoja(periodo);
  const csv = montarCsv(
    ["Posição", "Vendedor", "Usuário (@)", "Forma", "Comissão (%)", "Situação", "Cliques", "Vendas", "Vendido (R$)", "Comissão (R$)"],
    vendedores.map((v, i) => [
      i + 1,
      v.nome ?? "",
      v.arroba ?? "",
      FORMA_VENDEDOR[v.forma_pagamento] ?? v.forma_pagamento,
      String(Number(v.comissao_percentual)).replace(".", ","),
      v.status === "ativo" ? "Ativo" : "Desativado",
      v.cliques,
      v.vendas,
      reais(v.faturamento_centavos),
      reais(v.comissao_centavos),
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendedores-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
