import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reaisParaCentavos, validarSaque } from "./saque";

describe("saque da conta Staypse", () => {
  it("converte reais em centavos", () => {
    assert.equal(reaisParaCentavos("150"), 15000);
    assert.equal(reaisParaCentavos("1.234,56"), 123456);
    assert.equal(reaisParaCentavos("R$ 10,5"), 1050);
    assert.equal(reaisParaCentavos("12.34"), 1234);
  });
  it("recusa valor inválido", () => {
    for (const v of ["", "0", "-5", "abc", "1,234", "1e3"]) assert.equal(reaisParaCentavos(v), null, v);
  });
  it("valida contra o disponível e o mínimo", () => {
    assert.equal(validarSaque(5000, 10000, 1000).ok, true);
    assert.equal(validarSaque(10000, 10000, 1000).ok, true);
    assert.equal(validarSaque(10001, 10000, 1000).ok, false);
    assert.equal(validarSaque(500, 10000, 1000).ok, false);
    assert.equal(validarSaque(null, 10000, 0).ok, false);
  });
});
