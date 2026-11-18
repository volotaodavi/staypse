// Planilhas CSV para abrir direto no Excel em português: separador ";",
// UTF-8 com BOM (acentos certos) e proteção contra "fórmula escondida"
// (um nome como "=HYPERLINK(...)" viraria fórmula ao abrir no Excel).

// Começa com = + - @, tab, retorno ou espaço? Vira texto com apóstrofo na frente.
const PERIGOSO = /^[\s=+\-@]/;

export function celulaCsv(valor: unknown): string {
  const texto = String(valor ?? "");
  const seguro = PERIGOSO.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function montarCsv(cabecalho: string[], linhas: unknown[][]): string {
  const juntar = (l: unknown[]) => l.map(celulaCsv).join(";");
  return "﻿" + [juntar(cabecalho), ...linhas.map(juntar)].join("\r\n");
}
