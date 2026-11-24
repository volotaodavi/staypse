// Testes do parcelamento como política da loja e do acréscimo (juros.ts): npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { acrescimoParcelamento, opcoesParcelamento, parcelaTemJuros, parcelasPermitidas, politicaDoBanco, politicaValida, semJurosAte, POLITICA_PADRAO } from "./juros";
import { calcularSplit } from "./split";
import { TAXAS_PADRAO, modalidadeDoPagamento, taxaTotalCentavos } from "./taxas";

test("política da loja: 1 a 12 parcelas, sem juros de 1 até o máximo", () => {
  assert.ok(politicaValida({ parcelasMax: 12, parcelasSemJuros: 3 }));
  assert.ok(politicaValida({ parcelasMax: 1, parcelasSemJuros: 1 }));
  assert.ok(!politicaValida({ parcelasMax: 13, parcelasSemJuros: 3 }));
  assert.ok(!politicaValida({ parcelasMax: 6, parcelasSemJuros: 7 }));
  assert.ok(!politicaValida({ parcelasMax: 6, parcelasSemJuros: 0 }));
  assert.ok(!politicaValida({ parcelasMax: 6.5, parcelasSemJuros: 2 }));
  assert.deepEqual(politicaDoBanco({ parcelas_max: 6, parcelas_sem_juros: 2 }), { parcelasMax: 6, parcelasSemJuros: 2 });
  assert.deepEqual(politicaDoBanco(null), POLITICA_PADRAO);
  assert.deepEqual(politicaDoBanco({ parcelas_max: 2, parcelas_sem_juros: 5 }), POLITICA_PADRAO);
});

test("parcelas permitidas respeitam a loja e a parcela mínima; 'até Nx sem juros' só aparece com N > 1", () => {
  assert.equal(parcelasPermitidas(100_000, { parcelasMax: 6, parcelasSemJuros: 3 }), 6);
  assert.equal(parcelasPermitidas(100_000, { parcelasMax: 12, parcelasSemJuros: 3 }), 12);
  assert.equal(parcelasPermitidas(3_000, { parcelasMax: 12, parcelasSemJuros: 3 }), 6); // parcela de pelo menos R$ 5
  assert.equal(semJurosAte(100_000, { parcelasMax: 12, parcelasSemJuros: 3 }), 3);
  assert.equal(semJurosAte(1_000, { parcelasMax: 12, parcelasSemJuros: 3 }), 2); // só 2 parcelas de R$ 5 cabem em R$ 10
  assert.equal(semJurosAte(100_000, { parcelasMax: 12, parcelasSemJuros: 1 }), 1);
  assert.ok(!parcelaTemJuros(3, { parcelasMax: 12, parcelasSemJuros: 3 }));
  assert.ok(parcelaTemJuros(4, { parcelasMax: 12, parcelasSemJuros: 3 }));
  assert.ok(!parcelaTemJuros(1, { parcelasMax: 12, parcelasSemJuros: 1 }));
});

test("acréscimo: zero no 1x; cobre a diferença de taxa da faixa e nunca mais que isso (para o comprador)", () => {
  for (const total of [1_000, 3_000, 9_990, 15_000, 29_990, 80_000, 250_000]) {
    for (const n of [1, 2, 6, 7, 12]) {
      const m = modalidadeDoPagamento("cartao", n);
      const a = acrescimoParcelamento(total, m, TAXAS_PADRAO);
      if (n === 1) {
        assert.equal(a, 0);
        continue;
      }
      const min = TAXAS_PADRAO.taxaMinimaCentavos;
      const taxa1x = taxaTotalCentavos(total, TAXAS_PADRAO.taxaTotal.cartao_1x, min);
      const taxaM = (x: number) => taxaTotalCentavos(x, TAXAS_PADRAO.taxaTotal[m], min);
      assert.ok(a >= taxaM(total + a) - taxa1x, `cobre ${total} ${n}x`);
      assert.ok(a === 0 || a - 1 < taxaM(total + a - 1) - taxa1x, `mínimo ${total} ${n}x`); // um centavo a menos não cobriria
    }
  }
  // exemplo: R$ 300 em 12x: (6,8% - 5,6%) = ~1,28% de R$ 300 = R$ 3,86
  assert.ok(Math.abs(acrescimoParcelamento(30_000, "cartao_7a12", TAXAS_PADRAO) - 386) <= 2);
});

test("a loja recebe o mesmo no parcelado com juros e no cartão à vista (com e sem afiliado)", () => {
  for (const total of [4_990, 15_000, 29_990, 120_000]) {
    for (const [ind, pct] of [["nenhum", 0], ["afiliado", 25], ["vendedor_split", 15]] as const) {
      const base = {
        totalCentavos: total,
        subtotalCentavos: total,
        custoSplit: TAXAS_PADRAO.custoSplit,
        taxaMinimaCentavos: TAXAS_PADRAO.taxaMinimaCentavos,
        comissaoPercentual: pct,
        indicador: ind,
      };
      const avista = calcularSplit({ ...base, modalidade: "cartao_1x", taxaTotal: TAXAS_PADRAO.taxaTotal.cartao_1x, custoLytex: TAXAS_PADRAO.custoLytex.cartao_1x });
      for (const m of ["cartao_2a6", "cartao_7a12"] as const) {
        const acr = acrescimoParcelamento(total, m, TAXAS_PADRAO);
        const p = calcularSplit({
          ...base,
          modalidade: m,
          taxaTotal: TAXAS_PADRAO.taxaTotal.cartao_1x, // a taxa da loja é a do 1x; o comprador paga a diferença
          custoLytex: TAXAS_PADRAO.custoLytex[m],
          acrescimoCentavos: acr,
        });
        assert.equal(p.produtorCentavos, avista.produtorCentavos, `loja ${total} ${m} ${ind}`);
        assert.equal(p.indicadorCentavos, avista.indicadorCentavos, `indicador ${total} ${m} ${ind}`);
        assert.ok(p.staypseCentavos >= avista.staypseCentavos - 20, `Staypse ${total} ${m} ${ind}`); // margem da mesma ordem do 1x
        assert.ok(p.staypseCentavos > 0);
      }
    }
  }
});

test("opções do checkout: sem juros até N, com juros acima; valor da parcela para baixo; total sempre informado", () => {
  const o = opcoesParcelamento(30_000, { parcelasMax: 12, parcelasSemJuros: 3 }, TAXAS_PADRAO);
  assert.equal(o.length, 12);
  assert.deepEqual(o.slice(0, 3).map((x) => [x.semJuros, x.totalCentavos]), [[true, 30_000], [true, 30_000], [true, 30_000]]);
  assert.ok(o.slice(3).every((x) => !x.semJuros && x.totalCentavos > 30_000));
  assert.equal(o[2].parcelaCentavos, 10_000);
  assert.ok(o[4].totalCentavos < o[11].totalCentavos); // 7x a 12x tem faixa mais cara que 2x a 6x
  assert.equal(o[3].totalCentavos, o[5].totalCentavos); // mesma faixa, mesmo acréscimo
  for (const x of o) assert.ok(x.parcelaCentavos * x.parcelas <= x.totalCentavos);
  // loja que não parcela
  assert.equal(opcoesParcelamento(30_000, { parcelasMax: 1, parcelasSemJuros: 1 }, TAXAS_PADRAO).length, 1);
  // tudo sem juros: nenhuma opção com juros
  assert.ok(opcoesParcelamento(30_000, { parcelasMax: 12, parcelasSemJuros: 12 }, TAXAS_PADRAO).every((x) => x.semJuros));
});
