import assert from "node:assert/strict";
import { test } from "node:test";
import { lerPalavras, numeroBr, validarConfiguracoes, type ConfiguracoesTexto } from "./configuracoes";

const base: ConfiguracoesTexto = {
  taxa: "5", comissaoMin: "10", comissaoMax: "70", prazoNf: "5", palavras: "arma\nCassino", pix: true, cartao: true, boleto: false,
};

test("número em português", () => {
  assert.equal(numeroBr("7,5"), 7.5);
  assert.equal(numeroBr(" 10 "), 10);
  assert.ok(Number.isNaN(numeroBr("abc")));
  assert.ok(Number.isNaN(numeroBr("-1")));
});

test("palavras: minúsculas, sem repetição, separadas por linha ou vírgula", () => {
  assert.deepEqual(lerPalavras("Arma, arma\n cassino ;"), ["arma", "cassino"]);
});

test("configuração válida", () => {
  const r = validarConfiguracoes(base);
  assert.ok("valores" in r);
  if ("valores" in r) {
    assert.equal(r.valores.taxa_staypse_percentual, 5);
    assert.deepEqual(r.valores.palavras_proibidas, ["arma", "cassino"]);
  }
});

test("recusa mínimo maior que máximo, faixa fora de 0–100 e prazo inválido", () => {
  assert.ok("erro" in validarConfiguracoes({ ...base, comissaoMin: "80" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, taxa: "101" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, comissaoMax: "-3" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, prazoNf: "0" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, prazoNf: "2,5" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, palavras: "a" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, pix: false, cartao: false, boleto: false }));
});
