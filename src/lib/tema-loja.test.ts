// Testes do motor de tema da loja (formato, predefinições e compatibilidade).
import assert from "node:assert/strict";
import { test } from "node:test";
import { LISTA_MODELOS, TIPOS_SECAO, lerTemaLoja, secoesDoModelo, temaDoModelo, validarTemaLoja } from "./tema-loja";

const ID = "11111111-1111-4111-8111-111111111111";

test("os 4 modelos têm o mesmo conjunto de seções", () => {
  for (const m of LISTA_MODELOS) {
    assert.deepEqual([...secoesDoModelo(m).map((s) => s.tipo)].sort(), [...TIPOS_SECAO].sort());
  }
});

test("tema padrão de cada modelo é válido", () => {
  for (const m of LISTA_MODELOS) assert.equal(validarTemaLoja(temaDoModelo(m)).ok, true);
});

test("recusa modelo, seção e chaves fora do combinado", () => {
  const base = temaDoModelo("classico");
  assert.equal(validarTemaLoja({ ...base, modelo: "livre" }).ok, false);
  assert.equal(validarTemaLoja({ ...base, secoes: [{ tipo: "html", visivel: true }] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, secoes: [base.secoes[0], base.secoes[0]] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, secoes: [{ tipo: "banner", visivel: "sim" }] }).ok, false);
});

test("destaques: até 8, sem repetir e só ids", () => {
  const base = temaDoModelo("vitrine");
  assert.equal(validarTemaLoja({ ...base, destaques: [ID] }).ok, true);
  assert.equal(validarTemaLoja({ ...base, destaques: [ID, ID] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, destaques: ["abc"] }).ok, false);
  const nove = Array.from({ length: 9 }, (_, i) => `11111111-1111-4111-8111-11111111111${i}`);
  assert.equal(validarTemaLoja({ ...base, destaques: nove }).ok, false);
});

test("banner: frase até 80 letras e caminho seguro", () => {
  const base = temaDoModelo("vitrine");
  assert.equal(validarTemaLoja({ ...base, banner: { imagem: null, frase: "x".repeat(81), produto: null } }).ok, false);
  assert.equal(validarTemaLoja({ ...base, banner: { imagem: "../x.png", frase: null, produto: null } }).ok, false);
  assert.equal(validarTemaLoja({ ...base, banner: { imagem: `${ID}/banner.webp`, frase: "Oi", produto: ID } }).ok, true);
});

test("sem tema salvo, o layout antigo vira modelo", () => {
  assert.equal(lerTemaLoja(null, "destaque").modelo, "vitrine");
  assert.equal(lerTemaLoja(null, "lista").modelo, "editorial");
  assert.equal(lerTemaLoja(null, "grade").modelo, "classico");
  assert.equal(lerTemaLoja(null, null).modelo, "classico");
  assert.equal(lerTemaLoja({ lixo: 1 }, "lista").modelo, "editorial");
});

test("leitura completa as seções que faltam (ocultas)", () => {
  const t = lerTemaLoja({ modelo: "catalogo", secoes: [{ tipo: "sobre", visivel: true }] });
  assert.equal(t.secoes.length, TIPOS_SECAO.length);
  assert.equal(t.secoes[0].tipo, "sobre");
  assert.equal(t.secoes.slice(1).every((s) => !s.visivel), true);
});
