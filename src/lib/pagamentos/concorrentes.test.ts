import assert from "node:assert/strict";
import { test } from "node:test";
import { CONCORRENTES } from "./concorrentes";

// valores de docs/comparativo-taxas.md (R$ 50, 150 e 500)
test("taxas dos concorrentes batem com o comparativo", () => {
  const fee = (nome: string, v: number) => CONCORRENTES.find((c) => c.nome === nome)!.taxaCentavos(v);
  assert.deepEqual([5000, 15000, 50000].map((v) => fee("Kiwify", v)), [699, 1598, 4744]);  // R$ 150: 15,975 arredonda para cima (o comparativo traz 15,97 por ponto flutuante)
  assert.deepEqual([5000, 15000, 50000].map((v) => fee("Hotmart", v)), [744, 1734, 5199]);
  assert.deepEqual([5000, 15000, 50000].map((v) => fee("Shopee", v)), [1450, 4100, 9600]);
});
