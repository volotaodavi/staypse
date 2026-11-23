// Exporta os inscritos (com os filtros da tela) em CSV para Excel/Google Planilhas.
// Formato brasileiro: separador ";" e BOM UTF-8 (para acentos abrirem certo no Excel).
import { NextResponse, type NextRequest } from "next/server";
import { montarCsv } from "@/lib/csv";
import { ROTULO_NICHO, ROTULO_PERFIL } from "@/lib/lista";
import { usuarioAtual } from "@/lib/papeis";
import { buscarInscritos, lerFiltros } from "../consulta";

const dataBr = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export async function GET(request: NextRequest) {
  const usuario = await usuarioAtual();
  if (!usuario?.papeis.includes("admin")) {
    return new NextResponse("Acesso restrito.", { status: 403 });
  }

  const filtros = lerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const inscritos = await buscarInscritos(filtros);

  const cabecalho = [
    "Data", "Tipo", "Nome", "E-mail", "WhatsApp", "Cidade", "UF", "Nichos",
    "Empresa", "CNPJ", "Tipo de produto", "O que vende", "Indicações",
    "Status do contato", "Código de indicação", "Versão do consentimento", "Consentimento em",
  ];
  const linhas = inscritos.map((i) => [
    dataBr(i.criado_em),
    ROTULO_PERFIL[i.interesse] ?? i.interesse, i.nome, i.email, i.whatsapp, i.cidade, i.uf,
    i.nichos.map((n) => ROTULO_NICHO[n] ?? n).join(", "),
    i.empresa, i.cnpj, i.tipo_produto, i.o_que_vende, i.indicacoes,
    i.status_contato, i.codigo_indicacao, i.consentimento_versao,
    dataBr(i.consentimento_em),
  ]);

  // separador ";", acentos certos e proteção contra fórmula (src/lib/csv.ts)
  const csv = montarCsv(cabecalho, linhas);
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lista-de-espera-${hoje}.csv"`,
      "Cache-Control": "no-store", // dados pessoais: nunca guardar em cache
    },
  });
}
