// Testes do tempo mínimo de preenchimento. Rodam com: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { TEMPO_MAXIMO_MS, TEMPO_MINIMO_MS, assinarTempo, conferirTempo } from "./lista-tempo";

const SEGREDO = "segredo-de-teste";
const T0 = 1_800_000_000_000;

test("envio antes de 3 s é recusado; depois, aceito", () => {
  const c = assinarTempo(SEGREDO, T0);
  assert.equal(conferirTempo(SEGREDO, c, T0 + 500), "cedo");
  assert.equal(conferirTempo(SEGREDO, c, T0 + TEMPO_MINIMO_MS - 1), "cedo");
  assert.equal(conferirTempo(SEGREDO, c, T0 + TEMPO_MINIMO_MS), "ok");
});

test("carimbo expira", () => {
  const c = assinarTempo(SEGREDO, T0);
  assert.equal(conferirTempo(SEGREDO, c, T0 + TEMPO_MAXIMO_MS + 1), "expirado");
});

test("o cliente não consegue forjar nem alterar a hora", () => {
  const c = assinarTempo(SEGREDO, T0);
  const sig = c.split(".")[1];
  // hora mais antiga com a mesma assinatura
  assert.equal(conferirTempo(SEGREDO, `${T0 - 60_000}.${sig}`, T0 + 500), "invalido");
  // assinado com outro segredo
  assert.equal(conferirTempo(SEGREDO, assinarTempo("outro", T0 - 60_000), T0 + 500), "invalido");
  // lixo e ausência
  for (const lixo of [undefined, null, "", "abc", "123.456", `${T0}.`, `.${sig}`, `${T0}.${sig}.x`, 42]) {
    assert.equal(conferirTempo(SEGREDO, lixo, T0 + 10_000), "invalido", String(lixo));
  }
});
