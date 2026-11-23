// Taxas por modalidade de pagamento, funções PURAS (sem banco nem rede).
// "Taxa total" é a ÚNICA taxa que a loja, o afiliado e o vendedor enxergam: já embute o
// custo da Lytex. O custo Lytex e a receita da Staypse são INTERNOS (só admin) e o comprador
// nunca vê taxa nenhuma. Tudo em centavos inteiros; percentuais com até 2 casas (pontos-base).

export const MODALIDADES = ["pix", "boleto", "cartao_1x", "cartao_2a6", "cartao_7a12"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export type Taxa = { percentual: number; fixoCentavos: number };
// Cobrança da Lytex por valor repassado (split): % do valor com mínimo e máximo, por recebedor
export type CustoSplit = { percentual: number; minimoCentavos: number; maximoCentavos: number };

export type TaxasPlataforma = {
  taxaTotal: Record<Modalidade, Taxa>;
  custoLytex: Record<Modalidade, Taxa>;
  custoSplit: CustoSplit;
};

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao_1x: "Cartão à vista",
  cartao_2a6: "Cartão 2x a 6x",
  cartao_7a12: "Cartão 7x a 12x",
};

// Valores recomendados (docs/precificacao.md). Custos = contrato Lytex Tier 01 (taxa incentivo).
export const TAXAS_PADRAO: TaxasPlataforma = {
  taxaTotal: {
    pix: { percentual: 1.5, fixoCentavos: 200 },
    boleto: { percentual: 1.5, fixoCentavos: 230 },
    cartao_1x: { percentual: 4.9, fixoCentavos: 50 },
    cartao_2a6: { percentual: 5.5, fixoCentavos: 50 },
    cartao_7a12: { percentual: 6.1, fixoCentavos: 50 },
  },
  custoLytex: {
    pix: { percentual: 0, fixoCentavos: 185 },
    boleto: { percentual: 0, fixoCentavos: 185 },
    cartao_1x: { percentual: 3.39, fixoCentavos: 0 },
    cartao_2a6: { percentual: 3.89, fixoCentavos: 0 },
    cartao_7a12: { percentual: 4.29, fixoCentavos: 0 },
  },
  custoSplit: { percentual: 1, minimoCentavos: 10, maximoCentavos: 100 },
};

export function modalidadeDoPagamento(meio: "pix" | "boleto" | "cartao", parcelas = 1): Modalidade {
  if (meio === "pix" || meio === "boleto") return meio;
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) throw new Error("parcelas_invalidas");
  return parcelas === 1 ? "cartao_1x" : parcelas <= 6 ? "cartao_2a6" : "cartao_7a12";
}

// percentual com até 2 casas vira pontos-base inteiros (sem erro de ponto flutuante)
function pontosBase(percentual: number): number {
  const bp = Math.round(percentual * 100);
  if (!(percentual >= 0 && percentual < 100) || Math.abs(percentual * 100 - bp) > 1e-6) throw new Error("taxa_invalida");
  return bp;
}

// taxa cobrada da loja: arredonda para BAIXO (nunca cobra um centavo a mais do que o combinado)
export function taxaTotalCentavos(base: number, t: Taxa): number {
  return Math.floor((base * pontosBase(t.percentual)) / 10000) + t.fixoCentavos;
}

// custo estimado da Lytex: arredonda para CIMA (estimativa conservadora, nunca subestima)
export function custoLytexCentavos(base: number, t: Taxa): number {
  return Math.ceil((base * pontosBase(t.percentual)) / 10000) + t.fixoCentavos;
}

// custo de repassar `valor` a um recebedor: 1% do valor, entre o mínimo e o máximo
export function custoRepasseCentavos(valor: number, c: CustoSplit): number {
  if (valor <= 0) return 0;
  const bruto = Math.ceil((valor * pontosBase(c.percentual)) / 10000);
  return Math.min(c.maximoCentavos, Math.max(c.minimoCentavos, bruto));
}

const par = (v: unknown): Taxa => {
  const o = v as { percentual?: unknown; fixo_centavos?: unknown } | null;
  const percentual = Number(o?.percentual);
  const fixoCentavos = Number(o?.fixo_centavos);
  if (!Number.isFinite(percentual) || !Number.isInteger(fixoCentavos)) throw new Error("taxas_nao_configuradas");
  return { percentual, fixoCentavos };
};

// lê o objeto "taxas" devolvido por dados_split_pedido (chaves da tabela configuracoes)
export function lerTaxasPlataforma(bruto: Record<string, unknown> | null | undefined): TaxasPlataforma {
  if (!bruto) throw new Error("taxas_nao_configuradas");
  const taxaTotal = {} as Record<Modalidade, Taxa>;
  const custoLytex = {} as Record<Modalidade, Taxa>;
  for (const m of MODALIDADES) {
    taxaTotal[m] = par(bruto[`taxa_total_${m}`]);
    custoLytex[m] = par(bruto[`custo_lytex_${m}`]);
  }
  const s = bruto.custo_lytex_split as { percentual?: unknown; minimo_centavos?: unknown; maximo_centavos?: unknown } | undefined;
  const custoSplit: CustoSplit = { percentual: Number(s?.percentual), minimoCentavos: Number(s?.minimo_centavos), maximoCentavos: Number(s?.maximo_centavos) };
  if (![custoSplit.percentual, custoSplit.minimoCentavos, custoSplit.maximoCentavos].every(Number.isFinite)) throw new Error("taxas_nao_configuradas");
  return { taxaTotal, custoLytex, custoSplit };
}
