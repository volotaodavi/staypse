// Extrato do período em CSV, só do próprio usuário (a função do banco filtra pela sessão).
import { NextResponse, type NextRequest } from "next/server";
import { montarCsv } from "@/lib/csv";
import { usuarioAtual } from "@/lib/papeis";
import { lerPeriodo } from "@/lib/periodo";
import { PAPEL_FIN, extrato, type PapelFin } from "../dados";

const reais = (c: number) => (Number(c) / 100).toFixed(2).replace(".", ",");

export async function GET(request: NextRequest) {
  const usuario = await usuarioAtual();
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const papel = String(sp.papel ?? "") as PapelFin;
  if (!usuario || !Object.hasOwn(PAPEL_FIN, papel) || !usuario.papeis.includes(PAPEL_FIN[papel].papel)) return new NextResponse("Acesso restrito.", { status: 403 });

  const periodo = lerPeriodo(sp, "30d");
  const linhas = await extrato(papel, periodo);
  const csv = montarCsv(
    ["Pedido", "Data", "Situação", "Vendido (R$)", "Taxa da plataforma (R$)", "Você recebe (R$)"],
    linhas.map((l) => [l.codigo, l.data.slice(0, 10), l.situacao, reais(l.vendido_centavos), reais(l.taxa_centavos), reais(l.recebe_centavos)]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-${papel}-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
