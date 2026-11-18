// CSV do relatório mensal de comissões por vendedor (para o RH).
// Separador ";" e vírgula decimal: abre direto no Excel em português.
import { montarCsv } from "@/lib/csv";
import { exigirPapel } from "@/lib/papeis";
import { FORMA_RELATORIO, lerRelatorio, mesDoParametro } from "./dados";

const reais = (centavos: number) => (Number(centavos) / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  await exigirPapel("produtor");
  const mes = mesDoParametro(new URL(request.url).searchParams.get("mes"));
  const linhas = await lerRelatorio(mes);

  const cabecalho = [
    "Vendedor", "E-mail", "Usuário (@)", "Forma de pagamento", "Comissão (%)", "Situação",
    "Cliques", "Pedidos pagos", "Total vendido (R$)", "Comissão (R$)",
  ];
  const corpo = linhas.map((l) => [
    l.nome ?? "",
    l.email,
    l.arroba ?? "", // sem o "@" na frente: o Excel trataria como fórmula
    FORMA_RELATORIO[l.forma_pagamento] ?? l.forma_pagamento,
    String(Number(l.comissao_percentual)).replace(".", ","),
    l.status === "ativo" ? "Ativo" : "Desativado",
    l.cliques,
    l.pedidos,
    reais(l.vendido_centavos),
    reais(l.comissao_centavos),
  ]);

  return new Response(montarCsv(cabecalho, corpo), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="comissoes-${mes}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
