// Testes do cálculo do split: npm run test:unit
// Cenários da tabela de margem de docs/precificacao.md (pior caso: afiliado com 30% de comissão).
import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularSplit, type EntradaSplit } from "./split";
import { MODALIDADES, TAXAS_PADRAO, modalidadeDoPagamento, type Modalidade } from "./taxas";

const entrada = (m: Modalidade, totalReais: number, ind: EntradaSplit["indicador"] = "afiliado", pct = 30, frete = 0): EntradaSplit => ({
  totalCentavos: totalReais * 100 + frete,
  subtotalCentavos: totalReais * 100,
  modalidade: m,
  taxaTotal: TAXAS_PADRAO.taxaTotal[m],
  custoLytex: TAXAS_PADRAO.custoLytex[m],
  custoSplit: TAXAS_PADRAO.custoSplit,
  comissaoPercentual: ind === "nenhum" ? 0 : pct,
  indicador: ind,
});
const soma = (r: ReturnType<typeof calcularSplit>) => r.produtorCentavos + r.indicadorCentavos + r.staypseCentavos + r.custoLytexCentavos;

// [taxa total, custo Lytex, margem Staypse] em centavos, por modalidade e ticket (30, 80, 150, 300, 800)
const TABELA: Record<Modalidade, [number, number, number][]> = {
  pix: [[245, 225, 20], [320, 273, 47], [425, 339, 86], [650, 384, 266], [1400, 396, 1004]],
  boleto: [[275, 225, 50], [350, 272, 78], [455, 339, 116], [680, 383, 297], [1430, 396, 1034]],
  cartao_1x: [[197, 142, 55], [442, 358, 84], [785, 662, 123], [1520, 1213, 307], [3970, 2923, 1047]],
  cartao_2a6: [[215, 157, 58], [490, 398, 92], [875, 736, 139], [1700, 1362, 338], [4450, 3324, 1126]],
  cartao_7a12: [[233, 169, 64], [538, 430, 108], [965, 796, 169], [1880, 1482, 398], [4930, 3645, 1285]],
};

test("tabela de margem: taxa total, custo Lytex e margem em centavos exatos", () => {
  for (const m of MODALIDADES) {
    [30, 80, 150, 300, 800].forEach((t, i) => {
      const r = calcularSplit(entrada(m, t));
      assert.deepEqual([r.taxaTotalCentavos, r.custoLytexCentavos, r.staypseCentavos], TABELA[m][i], `${m} R$ ${t}`);
    });
  }
});

test("margem da Staypse positiva em todos os cenários, com e sem afiliado; soma fecha com o total", () => {
  for (const m of MODALIDADES) {
    for (const t of [30, 80, 150, 300, 800]) {
      for (const ind of ["afiliado", "nenhum", "vendedor_split", "vendedor_folha"] as const) {
        const e = entrada(m, t, ind);
        const r = calcularSplit(e);
        assert.ok(r.staypseCentavos > 0, `${m} R$ ${t} ${ind}`);
        assert.equal(soma(r), e.totalCentavos);
      }
    }
  }
});

test("taxa rateada: loja e afiliado pagam proporcional à parte de cada um; resíduo é da loja", () => {
  const r = calcularSplit(entrada("pix", 150));
  assert.equal(r.taxaTotalCentavos, 425); // 1,5% de 15000 = 225 + 200
  assert.equal(r.comissaoDevidaCentavos, 4500);
  assert.equal(r.taxaAfiliadoCentavos, Math.floor((425 * 4500) / 15000)); // 127 (30% da taxa, para baixo)
  assert.equal(r.taxaLojaCentavos, 425 - 127);
  assert.equal(r.indicadorCentavos, 4500 - 127);
  assert.equal(r.produtorCentavos, 15000 - 4500 - 298);
  const frac = calcularSplit({ ...entrada("pix", 150), subtotalCentavos: 14999, totalCentavos: 14999, comissaoPercentual: 15 });
  assert.equal(frac.comissaoDevidaCentavos, Math.floor((14999 * 15) / 100)); // 2249,85 vira 2249
});

test("vendedor próprio (split direto ou folha) não paga taxa; só a loja", () => {
  for (const ind of ["vendedor_split", "vendedor_folha"] as const) {
    const r = calcularSplit(entrada("cartao_2a6", 200, ind, 20));
    assert.equal(r.taxaAfiliadoCentavos, 0, ind);
    assert.equal(r.taxaLojaCentavos, r.taxaTotalCentavos, ind);
  }
  const split = calcularSplit(entrada("cartao_2a6", 200, "vendedor_split", 20));
  assert.equal(split.indicadorCentavos, 4000); // comissão cheia
  const folha = calcularSplit(entrada("cartao_2a6", 200, "vendedor_folha", 20));
  assert.equal(folha.indicadorCentavos, 0);
  assert.equal(folha.produtorCentavos, 20000 - folha.taxaTotalCentavos);
});

test("só a loja: paga a taxa inteira", () => {
  const r = calcularSplit(entrada("boleto", 80, "nenhum"));
  assert.equal(r.taxaLojaCentavos, r.taxaTotalCentavos);
  assert.equal(r.taxaAfiliadoCentavos, 0);
  assert.equal(r.produtorCentavos, 8000 - r.taxaTotalCentavos);
});

test("frete entra na base da taxa (a Lytex cobra sobre o total), não na da comissão", () => {
  const r = calcularSplit(entrada("cartao_1x", 100, "afiliado", 20, 2000));
  assert.equal(r.comissaoDevidaCentavos, 2000); // 20% dos produtos (R$ 100), sem o frete
  assert.equal(r.taxaTotalCentavos, Math.floor((12000 * 490) / 10000) + 50);
});

test("arredondamento: taxa para baixo, custo estimado para cima (sem erro de ponto flutuante)", () => {
  // 4,9% de 10,10 = 49,49 centavos: taxa 49 (baixo); custo 3,39% = 34,239 centavos: 35 (cima)
  const e: EntradaSplit = { ...entrada("cartao_1x", 0, "nenhum"), totalCentavos: 1010, subtotalCentavos: 1010 };
  const x = calcularSplit(e);
  assert.equal(x.taxaTotalCentavos, 49 + 50);
  assert.equal(x.custoLytexCentavos, 35 + 10 + 10); // meio + repasse da loja + repasse da Staypse (mínimos)
  assert.equal(soma(x), 1010);
});

test("venda pequena demais para cobrir o custo não é cobrada no prejuízo", () => {
  assert.throws(() => calcularSplit({ ...entrada("pix", 0, "nenhum"), totalCentavos: 300, subtotalCentavos: 300 }), /taxa_menor_que_o_custo/);
  assert.doesNotThrow(() => calcularSplit({ ...entrada("pix", 0, "nenhum"), totalCentavos: 1000, subtotalCentavos: 1000 }));
});

test("vendedor na folha não entra no split; comissão devida segue calculada", () => {
  const r = calcularSplit(entrada("pix", 80, "vendedor_folha", 20));
  assert.equal(r.indicadorCentavos, 0);
  assert.equal(r.comissaoDevidaCentavos, 1600);
});

test("entradas inválidas são recusadas", () => {
  assert.throws(() => calcularSplit({ ...entrada("pix", 30), totalCentavos: 1.5 }), /valores_invalidos/);
  assert.throws(() => calcularSplit({ ...entrada("pix", 30), subtotalCentavos: 99999 }), /valores_invalidos/);
  assert.throws(() => calcularSplit({ ...entrada("pix", 30), taxaTotal: { percentual: 100, fixoCentavos: 0 } }), /taxa_invalida/);
  assert.throws(() => calcularSplit({ ...entrada("pix", 30), taxaTotal: { percentual: 1.555, fixoCentavos: 0 } }), /taxa_invalida/);
  assert.throws(() => calcularSplit({ ...entrada("pix", 30, "nenhum"), comissaoPercentual: 10 }), /comissao_sem_indicador/);
  assert.throws(() => calcularSplit({ ...entrada("pix", 30), comissaoPercentual: 100 }), /comissao_invalida/);
});

test("modalidade pelo meio e pelas parcelas", () => {
  assert.equal(modalidadeDoPagamento("pix"), "pix");
  assert.equal(modalidadeDoPagamento("boleto", 3), "boleto");
  assert.equal(modalidadeDoPagamento("cartao", 1), "cartao_1x");
  assert.equal(modalidadeDoPagamento("cartao", 2), "cartao_2a6");
  assert.equal(modalidadeDoPagamento("cartao", 6), "cartao_2a6");
  assert.equal(modalidadeDoPagamento("cartao", 7), "cartao_7a12");
  assert.equal(modalidadeDoPagamento("cartao", 12), "cartao_7a12");
  assert.throws(() => modalidadeDoPagamento("cartao", 13), /parcelas_invalidas/);
});
