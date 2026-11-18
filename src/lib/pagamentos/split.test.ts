// Testes do cálculo do split: npm run test:unit
// Os percentuais de taxa aqui são EXEMPLOS de teste, não as taxas da Lytex
// (essas dependem do contrato — ver docs/lytex/PERGUNTAS.md).
import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularSplit, type EntradaSplit } from "./split";

const base: EntradaSplit = {
  totalCentavos: 31990, // R$ 299,90 + R$ 20,00 de frete
  subtotalCentavos: 29990,
  taxaMeio: { percentual: 0.99, fixoCentavos: 0 }, // exemplo: Pix
  taxaStaypse: { percentual: 5, fixoCentavos: 100 },
  comissaoPercentual: 15,
  indicador: "afiliado",
  quemPagaTaxaMeio: "produtor",
};

const soma = (r: ReturnType<typeof calcularSplit>) => r.produtorCentavos + r.indicadorCentavos + r.staypseCentavos + r.taxaMeioCentavos;

test("Pix com afiliado: a soma bate exatamente com o total", () => {
  const r = calcularSplit(base);
  assert.equal(r.taxaMeioCentavos, 317); // 0,99% de 31990 = 316,7 → 317
  assert.equal(r.staypseCentavos, 1600); // 5% de 29990 = 1499,5 → 1500 + 100
  assert.equal(r.indicadorCentavos, 4498); // 15% de 29990 = 4498,5 → 4498 (para baixo)
  assert.equal(r.produtorCentavos, 31990 - 317 - 1600 - 4498);
  assert.equal(soma(r), base.totalCentavos);
});

test("cartão à vista: taxa percentual + fixa, produtor paga", () => {
  const r = calcularSplit({ ...base, taxaMeio: { percentual: 3.49, fixoCentavos: 39 } });
  assert.equal(r.taxaMeioCentavos, Math.round(31990 * 0.0349) + 39);
  assert.equal(soma(r), base.totalCentavos);
  assert.equal(r.indicadorCentavos, 4498, "afiliado não paga a taxa quando o produtor paga");
});

test("cartão parcelado (taxa maior) com taxa proporcional entre as partes", () => {
  const r = calcularSplit({ ...base, taxaMeio: { percentual: 6.99, fixoCentavos: 39 }, quemPagaTaxaMeio: "proporcional" });
  assert.ok(r.indicadorCentavos < 4498, "afiliado paga parte da taxa");
  assert.equal(r.comissaoDevidaCentavos, 4498);
  assert.equal(soma(r), base.totalCentavos);
});

test("comissão 0%: indicador não recebe nada", () => {
  const r = calcularSplit({ ...base, comissaoPercentual: 0 });
  assert.equal(r.indicadorCentavos, 0);
  assert.equal(soma(r), base.totalCentavos);
});

test("comissão máxima (70%)", () => {
  const r = calcularSplit({ ...base, comissaoPercentual: 70 });
  assert.equal(r.indicadorCentavos, Math.floor(29990 * 0.7));
  assert.ok(r.produtorCentavos > 0);
  assert.equal(soma(r), base.totalCentavos);
});

test("venda sem afiliado: tudo menos taxas fica com o produtor", () => {
  const r = calcularSplit({ ...base, comissaoPercentual: 0, indicador: "nenhum" });
  assert.equal(r.indicadorCentavos, 0);
  assert.equal(r.produtorCentavos, 31990 - 317 - 1600);
  assert.equal(soma(r), base.totalCentavos);
});

test("vendedor 'na folha': a parte dele fica com a loja (sem recebedor)", () => {
  const r = calcularSplit({ ...base, comissaoPercentual: 10, indicador: "vendedor_folha" });
  assert.equal(r.indicadorCentavos, 0);
  assert.equal(r.comissaoDevidaCentavos, 2999, "a loja sabe quanto pagar na folha");
  assert.equal(r.produtorCentavos, 31990 - 317 - 1600);
  assert.equal(soma(r), base.totalCentavos);
});

test("vendedor 'split direto' recebe a comissão no split", () => {
  const r = calcularSplit({ ...base, comissaoPercentual: 12.5, indicador: "vendedor_split" });
  assert.equal(r.indicadorCentavos, Math.floor(29990 * 0.125));
  assert.equal(soma(r), base.totalCentavos);
});

test("arredondamento: a diferença vai para o produtor (somas sempre exatas)", () => {
  for (let total = 101; total < 5000; total += 37) {
    for (const pct of [0, 7.5, 13.33, 33.33]) {
      const r = calcularSplit({
        ...base,
        totalCentavos: total,
        subtotalCentavos: total,
        comissaoPercentual: pct,
        taxaStaypse: { percentual: 4.99, fixoCentavos: 0 },
      });
      assert.equal(soma(r), total);
      assert.ok(Object.values(r).every((v) => Number.isInteger(v) && v >= 0));
    }
  }
});

test("entradas inválidas são recusadas", () => {
  assert.throws(() => calcularSplit({ ...base, totalCentavos: 10.5 }), /valores_invalidos/);
  assert.throws(() => calcularSplit({ ...base, subtotalCentavos: base.totalCentavos + 1 }), /valores_invalidos/);
  assert.throws(() => calcularSplit({ ...base, comissaoPercentual: 100 }), /comissao_invalida/);
  assert.throws(() => calcularSplit({ ...base, indicador: "nenhum" }), /comissao_sem_indicador/);
  assert.throws(
    () => calcularSplit({ ...base, totalCentavos: 100, subtotalCentavos: 100, taxaStaypse: { percentual: 0, fixoCentavos: 200 } }),
    /taxas_maiores/,
  );
});
