// Exporta o ranking financeiro (loja, afiliado ou vendedor) do período em CSV.
// Valores informativos: o dinheiro de cada parte cai direto na conta Lytex dela.
import { NextResponse, type NextRequest } from "next/server";
import { montarCsv } from "@/lib/csv";
import { usuarioAtual } from "@/lib/papeis";
import { lerPeriodo } from "@/lib/periodo";
import { ranking, type TipoRanking } from "../dados";

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const COLUNAS: Record<TipoRanking, string> = { loja: "Líquido da loja (R$)", afiliado: "Comissão (R$)", vendedor: "Comissão (R$)" };

export async function GET(request: NextRequest) {
  const usuario = await usuarioAtual();
  if (!usuario?.papeis.includes("admin")) return new NextResponse("Acesso restrito.", { status: 403 });

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const tipo: TipoRanking = sp.tipo === "afiliado" || sp.tipo === "vendedor" ? sp.tipo : "loja";
  const periodo = lerPeriodo(sp, "30d");
  const linhas = await ranking(tipo, periodo, String(sp.q ?? "").slice(0, 80), 5000, 0);

  const csv = montarCsv(
    ["Nome", "Pedidos", "Vendido (R$)", COLUNAS[tipo]],
    linhas.map((l) => [l.nome, l.pedidos, reais(l.vendido_centavos), reais(l.valor_centavos)]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${tipo}-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
