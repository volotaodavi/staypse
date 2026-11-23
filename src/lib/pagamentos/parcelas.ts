// Parcelamento no cartão (função PURA, usada no checkout e no servidor).
// Padrão de docs/precificacao.md, seção 9: parcelas SEM juros para o comprador; a taxa da faixa
// (2x a 6x, 7x a 12x) é da loja. O comprador nunca vê taxa: só "12x de R$ X sem juros".
export const MAX_PARCELAS = 12; // limite da fatura (creditCard.maxParcels, 1 a 12)
export const PARCELA_MINIMA_CENTAVOS = 500; // regra nossa: parcela de pelo menos R$ 5,00

export function maxParcelas(totalCentavos: number): number {
  if (!Number.isFinite(totalCentavos) || totalCentavos < PARCELA_MINIMA_CENTAVOS) return 1;
  return Math.max(1, Math.min(MAX_PARCELAS, Math.floor(totalCentavos / PARCELA_MINIMA_CENTAVOS)));
}

export const valorParcelaCentavos = (totalCentavos: number, parcelas: number) => Math.round(totalCentavos / parcelas);

export function parcelasValidas(totalCentavos: number, parcelas: number): boolean {
  return Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= maxParcelas(totalCentavos);
}

export const MEIOS = ["pix", "boleto", "cartao"] as const;
export type Meio = (typeof MEIOS)[number];
export const ROTULO_MEIO: Record<Meio, string> = { pix: "Pix", boleto: "Boleto", cartao: "Cartão de crédito" };
