// CSV da lista de espera: inscritos por dia (por perfil) no período + total por perfil.
// Só admin; sem cache (números internos).
import { NextResponse, type NextRequest } from "next/server";
import { montarCsv } from "@/lib/csv";
import { usuarioAtual } from "@/lib/papeis";
import { lerPeriodo } from "@/lib/periodo";
import { ROTULO_PERFIL, buscarResumo } from "../resumo";

export async function GET(request: NextRequest) {
  const usuario = await usuarioAtual();
  if (!usuario?.papeis.includes("admin") || usuario.suspensoMotivo) return new NextResponse("Acesso restrito.", { status: 403 });

  const periodo = lerPeriodo(Object.fromEntries(request.nextUrl.searchParams));
  const r = await buscarResumo(periodo);
  const linhas: unknown[][] = r.por_dia.map((d) => [d.dia, d.loja, d.vendedor, d.afiliado, d.comprador, d.total]);
  linhas.push([], ["Total por perfil (desde o início)", ...r.por_perfil.map((p) => `${ROTULO_PERFIL[p.perfil] ?? p.perfil}: ${p.total}`)]);

  return new NextResponse(montarCsv(["Dia", "Lojas", "Vendedores de loja", "Afiliados", "Compradores", "Total"], linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lista-de-espera-${periodo.de}-a-${periodo.ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
