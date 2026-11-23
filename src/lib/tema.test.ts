// Contraste AA (WCAG 1.4.3) com cores extremas escolhidas pelo lojista.
import test from "node:test";
import assert from "node:assert/strict";
import { AA, contraste, montarTema } from "./tema";

test("qualquer cor escolhida mantém links e botões com contraste AA", () => {
  const passos = [0, 64, 118, 119, 127, 128, 160, 192, 255];
  for (const r of passos) for (const g of passos) for (const b of passos) {
    const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    const v = montarTema({ principal: hex, destaque: hex }).vars;
    assert.ok(contraste(v["--loja-link"], "#ffffff") >= AA, `link ${hex}`);
    assert.ok(contraste(v["--loja-principal"], v["--loja-principal-texto"]) >= AA, `botão ${hex}`);
    assert.ok(contraste(v["--loja-destaque"], v["--loja-destaque-texto"]) >= AA, `destaque ${hex}`);
  }
});
