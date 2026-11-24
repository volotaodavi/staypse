// Parcelamento no cartão (função PURA, usada no checkout e no servidor).
// A POLÍTICA é da loja (juros.ts): até N parcelas sem juros (a loja absorve a taxa da faixa) e acima de N o comprador
// paga o acréscimo. O comprador nunca vê taxa: só "12x de R$ X sem juros" ou "com juros", e o total.
export const MAX_PARCELAS = 12; // limite da fatura (creditCard.maxParcels, 1 a 12)
export const PARCELA_MINIMA_CENTAVOS = 500; // regra nossa: parcela de pelo menos R$ 5,00

export function maxParcelas(totalCentavos: number): number {
  if (!Number.isFinite(totalCentavos) || totalCentavos < PARCELA_MINIMA_CENTAVOS) return 1;
  return Math.max(1, Math.min(MAX_PARCELAS, Math.floor(totalCentavos / PARCELA_MINIMA_CENTAVOS)));
}

// para baixo (consistente com o resto do dinheiro: nunca promete um centavo a mais)
export const valorParcelaCentavos = (totalCentavos: number, parcelas: number) => Math.floor(totalCentavos / parcelas);

export function parcelasValidas(totalCentavos: number, parcelas: number): boolean {
  return Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= maxParcelas(totalCentavos);
}

export const MEIOS = ["pix", "boleto", "cartao"] as const;
export type Meio = (typeof MEIOS)[number];
export const ROTULO_MEIO: Record<Meio, string> = { pix: "Pix", boleto: "Boleto", cartao: "Cartão de crédito" };
