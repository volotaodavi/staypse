// CSV do desempenho por afiliado (sem e-mail/telefone: só a vitrine).
import { montarCsv } from "@/lib/csv";
import { lerPeriodo } from "@/lib/periodo";
import { lerAfiliadosDaLoja } from "../consulta";

const reais = (c: number) => (Number(c) / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  const periodo = lerPeriodo(Object.fromEntries(new URL(request.url).searchParams));
  const afiliados = await lerAfiliadosDaLoja(periodo);
  const csv = montarCsv(
    ["Vitrine", "Usuário (@)", "Produtos aprovados", "Pendentes", "Bloqueado", "Cliques", "Vendas", "Vendido (R$)", "Comissão (R$)"],
    afiliados.map((a) => [
      a.vitrine_nome ?? "",
      a.vitrine_slug ?? "",
      a.itens_aprovados,
      a.itens_pendentes,
      a.bloqueado ? "Sim" : "Não",
      a.cliques,
      a.vendas,
      reais(a.faturamento_centavos),
      reais(a.comissao_centavos),
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afiliados-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
