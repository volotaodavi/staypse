import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maxParcelas, parcelasValidas, valorParcelaCentavos } from "./parcelas";

describe("parcelas", () => {
  it("limita a 12 e à parcela mínima de R$ 5,00", () => {
    assert.equal(maxParcelas(100_000), 12);
    assert.equal(maxParcelas(3_000), 6);
    assert.equal(maxParcelas(900), 1);
    assert.equal(maxParcelas(0), 1);
  });
  it("valida a escolha", () => {
    assert.ok(parcelasValidas(30_000, 12));
    assert.ok(!parcelasValidas(3_000, 7));
    assert.ok(!parcelasValidas(30_000, 0));
    assert.ok(!parcelasValidas(30_000, 2.5));
  });
  it("valor da parcela é o total dividido, sem juros", () => {
    assert.equal(valorParcelaCentavos(10_000, 3), 3333);
    assert.equal(valorParcelaCentavos(12_000, 12), 1000);
  });
});
