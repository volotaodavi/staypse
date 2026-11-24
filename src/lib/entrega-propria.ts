// Cálculo da entrega própria (espelha o banco: zona_para_cep). O banco é quem manda no preço do
// pedido; estas funções servem à simulação no painel da loja e aos testes.
// Limitação: distância em linha reta (haversine) x fator de rota, não rota real (sem Google Maps).

export const FATOR_ROTA_PADRAO = 1.3;

export type Coordenada = { lat: number; lng: number };

// distância em linha reta, em km
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(Math.min(1, h)));
}

// km "rodados" estimados: linha reta x fator de rota, 2 casas
export const kmDeRota = (retaKm: number, fator = FATOR_ROTA_PADRAO) => Math.round(retaKm * fator * 100) / 100;

// preço por km: max(taxa mínima, floor(km x preço/km)). null = fora do km máximo (zona não atende)
export function fretePorKm(o: { km: number; precoKmCentavos: number; taxaMinimaCentavos: number; kmMax?: number | null }): number | null {
  if (o.kmMax != null && o.km > o.kmMax) return null;
  return Math.max(o.taxaMinimaCentavos, Math.floor(o.km * o.precoKmCentavos));
}

export const ROTULO_STATUS_ENTREGA: Record<string, string> = {
  preparando: "Preparando",
  saiu: "Saiu para entrega",
  entregue: "Entregue",
};
