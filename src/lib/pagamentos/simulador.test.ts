// A trava do simulador de pagamentos falha fechada: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { simuladorLiberado } from "./simulador";

test("simulador: só liga com a bandeira explícita e fora de produção", () => {
  assert.equal(simuladorLiberado({}), false); // sem bandeira, desligado
  assert.equal(simuladorLiberado({ NODE_ENV: "development" }), false);
  assert.equal(simuladorLiberado({ PAGAMENTO_SIMULADOR: "true" }), false);
  assert.equal(simuladorLiberado({ PAGAMENTO_SIMULADOR: "0" }), false);
  assert.equal(simuladorLiberado({ PAGAMENTO_SIMULADOR: "1", NODE_ENV: "development" }), true);
  assert.equal(simuladorLiberado({ PAGAMENTO_SIMULADOR: "1", NODE_ENV: "test", VERCEL_ENV: "preview" }), true);
});

test("simulador: nunca em produção, nem com a bandeira ligada", () => {
  assert.equal(simuladorLiberado({ PAGAMENTO_SIMULADOR: "1", NODE_ENV: "production" }), false);
  assert.equal(simuladorLiberado({ PAGAMENTO_SIMULADOR: "1", VERCEL_ENV: "production" }), false);
});
