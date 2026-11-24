import assert from "node:assert/strict";
import { test } from "node:test";
import { distanciaKm, fretePorKm, kmDeRota } from "./entrega-propria";

test("distância Maricá a Niterói (centro) ~ 32 km em linha reta", () => {
  const d = distanciaKm({ lat: -22.919, lng: -42.8186 }, { lat: -22.8833, lng: -43.1036 });
  assert.ok(d > 28 && d < 32, String(d));
});
test("mesmo ponto = 0 km", () => assert.equal(distanciaKm({ lat: -22.9, lng: -43.1 }, { lat: -22.9, lng: -43.1 }), 0));
test("fator de rota padrão 1,3 e arredondamento em 2 casas", () => {
  assert.equal(kmDeRota(10), 13);
  assert.equal(kmDeRota(7.777), 10.11);
});
test("por km: floor, taxa mínima e km máximo", () => {
  const base = { precoKmCentavos: 200, taxaMinimaCentavos: 800, kmMax: 30 };
  assert.equal(fretePorKm({ ...base, km: 10.33 }), 2066); // floor(2066.0)
  assert.equal(fretePorKm({ ...base, km: 10.337 }), 2067); // 2067,4 -> 2067
  assert.equal(fretePorKm({ ...base, km: 1 }), 800); // abaixo do mínimo
  assert.equal(fretePorKm({ ...base, km: 30 }), 6000);
  assert.equal(fretePorKm({ ...base, km: 30.01 }), null); // além do máximo
  assert.equal(fretePorKm({ ...base, km: 1.999, precoKmCentavos: 333, taxaMinimaCentavos: 0 }), 665); // floor(665,667)
});
