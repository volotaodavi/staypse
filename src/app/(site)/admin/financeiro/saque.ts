// Regras puras do saque da conta própria da Staypse (testáveis sem rede nem banco).

// "1.234,56" ou "1234.5" vira centavos inteiros; null se não for um valor em reais válido
export function reaisParaCentavos(entrada: string): number | null {
  const t = entrada.trim().replace(/^R\$\s*/i, "");
  if (!t) return null;
  // formato brasileiro (1.234,56) ou simples (1234,56 / 1234.56)
  const normal = /,/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const centavos = Math.round(Number(normal) * 100);
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

export type ResultadoValidacao = { ok: true } | { ok: false; motivo: string };

// valor ≤ disponível e ≥ mínimo da Lytex (tudo em centavos)
export function validarSaque(valorCentavos: number | null, disponivelCentavos: number, minimoCentavos: number): ResultadoValidacao {
  if (valorCentavos === null || !Number.isInteger(valorCentavos) || valorCentavos < 1) return { ok: false, motivo: "Informe um valor em reais, por exemplo 150,00." };
  if (valorCentavos > disponivelCentavos) return { ok: false, motivo: "O valor é maior que o disponível na conta da Staypse." };
  if (valorCentavos < minimoCentavos) return { ok: false, motivo: "O valor é menor que o saque mínimo da Lytex." };
  return { ok: true };
}
