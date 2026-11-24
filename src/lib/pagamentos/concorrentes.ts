// Taxas públicas dos concorrentes, para o comparativo do simulador de /taxas. Fonte: docs/comparativo-taxas.md
// (páginas oficiais de preço de cada plataforma, acessadas em 24/11/2026). Revisar junto com o comparativo (fev/2027).
export const CONCORRENTES_ACESSO_EM = "24/11/2026";

export type Concorrente = { nome: string; taxaCentavos: (vendaCentavos: number) => number };

const pct = (v: number, bp: number) => Math.round((v * bp) / 10000);

export const CONCORRENTES: Concorrente[] = [
  // até R$ 10: 20%; acima: 9,9% + R$ 2,49
  { nome: "Hotmart", taxaCentavos: (v) => (v <= 1000 ? pct(v, 2000) : pct(v, 990) + 249) },
  { nome: "Kiwify", taxaCentavos: (v) => pct(v, 899) + 249 },
  // comissão do vendedor CNPJ por faixa de preço (já inclui a taxa de transação)
  {
    nome: "Shopee",
    taxaCentavos: (v) => (v < 8000 ? pct(v, 2000) + 450 : v < 10000 ? pct(v, 1400) + 1600 : v < 20000 ? pct(v, 1400) + 2000 : pct(v, 1400) + 2600),
  },
];
