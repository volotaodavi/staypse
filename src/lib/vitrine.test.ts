// Testes da organização da vitrine (destaques, coleções, ordem manual).
import assert from "node:assert/strict";
import { test } from "node:test";
import { lerOrganizacao, mover, organizarVitrine, ordenarPorLista, problemaNaOrganizacao } from "./vitrine";

const itens = ["a", "b", "c", "d"].map((id) => ({ id }));

test("sem organização, a ordem de entrada é mantida", () => {
  const r = organizarVitrine(itens, null);
  assert.deepEqual(r.todos.map((i) => i.id), ["a", "b", "c", "d"]);
  assert.equal(r.destaques.length, 0);
  assert.equal(r.colecoes.length, 0);
});

test("ordem manual vem primeiro; o resto segue a ordem de entrada", () => {
  assert.deepEqual(ordenarPorLista(itens, ["c", "a"]).map((i) => i.id), ["c", "a", "b", "d"]);
});

test("item que saiu do ar é ignorado em destaques, coleções e ordem", () => {
  const r = organizarVitrine(itens, {
    destaques: ["x", "b"],
    colecoes: [{ nome: "Só os fora", itens: ["x", "y"] }, { nome: "Mista", itens: ["d", "x", "a"] }],
    ordem: ["x", "d"],
  });
  assert.deepEqual(r.destaques.map((i) => i.id), ["b"]);
  assert.deepEqual(r.colecoes.map((c) => c.nome), ["Mista"]);
  assert.deepEqual(r.colecoes[0].itens.map((i) => i.id), ["d", "a"]);
  assert.deepEqual(r.todos.map((i) => i.id), ["d", "a", "b", "c"]);
});

test("lerOrganizacao tolera lixo e respeita os limites", () => {
  assert.deepEqual(lerOrganizacao("texto"), { destaques: [], colecoes: [], ordem: [] });
  const o = lerOrganizacao({ destaques: ["1", "2", "3", "4", "5", 7, "1"], colecoes: [{ nome: " ", itens: [] }, 3] });
  assert.equal(o.destaques.length, 4);
  assert.equal(o.colecoes.length, 0);
});

test("problemaNaOrganizacao confere limites e nomes", () => {
  assert.equal(problemaNaOrganizacao({ destaques: ["1", "2", "3", "4"], colecoes: [], ordem: [] }), null);
  assert.ok(problemaNaOrganizacao({ destaques: ["1", "2", "3", "4", "5"], colecoes: [], ordem: [] }));
  const col = (nome: string) => ({ nome, itens: [] });
  assert.ok(problemaNaOrganizacao({ destaques: [], colecoes: Array.from({ length: 7 }, (_, i) => col(`C${i}`)), ordem: [] }));
  assert.ok(problemaNaOrganizacao({ destaques: [], colecoes: [col("x".repeat(41))], ordem: [] }));
  assert.ok(problemaNaOrganizacao({ destaques: [], colecoes: [col("  ")], ordem: [] }));
  assert.ok(problemaNaOrganizacao({ destaques: [], colecoes: [col("Treino"), col("treino")], ordem: [] }));
});

test("mover sobe e desce sem sair da lista", () => {
  assert.deepEqual(mover(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(mover(["a", "b", "c"], 1, 1), ["a", "c", "b"]);
  assert.deepEqual(mover(["a", "b", "c"], 0, -1), ["a", "b", "c"]);
  assert.deepEqual(mover(["a", "b", "c"], 2, 1), ["a", "b", "c"]);
});
