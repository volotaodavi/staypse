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
  taxaMinimaCentavos: TAXAS_PADRAO.taxaMinimaCentavos,
  comissaoPercentual: ind === "nenhum" ? 0 : pct,
  indicador: ind,
});
const soma = (r: ReturnType<typeof calcularSplit>) => r.produtorCentavos + r.indicadorCentavos + r.staypseCentavos + r.custoLytexCentavos;

// [taxa total, custo Lytex, margem Staypse] em centavos, por modalidade e ticket (30, 80, 150, 300, 800)
const TABELA: Record<Modalidade, [number, number, number][]> = {
  pix: [[275, 225, 50], [350, 272, 78], [455, 339, 116], [680, 383, 297], [1430, 396, 1034]],
  boleto: [[305, 224, 81], [380, 272, 108], [485, 339, 146], [710, 383, 327], [1460, 396, 1064]],
  cartao_1x: [[250, 142, 108], [528, 358, 170], [920, 661, 259], [1760, 1212, 548], [4560, 2929, 1631]],
  cartao_2a6: [[266, 157, 109], [576, 397, 179], [1010, 734, 276], [1940, 1362, 578], [5040, 3330, 1710]],
  cartao_7a12: [[284, 169, 115], [624, 429, 195], [1100, 794, 306], [2120, 1481, 639], [5520, 3651, 1869]],
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
  assert.equal(r.taxaTotalCentavos, 455); // 1,5% de 15000 = 225 + 230
  assert.equal(r.comissaoDevidaCentavos, 4500);
  assert.equal(r.taxaAfiliadoCentavos, Math.floor((455 * 4500) / 15000)); // 136 (30% da taxa, para baixo)
  assert.equal(r.taxaLojaCentavos, 455 - 136);
  assert.equal(r.indicadorCentavos, 4500 - 136);
  assert.equal(r.produtorCentavos, 15000 - 4500 - 319);
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
  assert.equal(r.taxaTotalCentavos, Math.floor((12000 * 560) / 10000) + 80);
});

test("arredondamento: taxa para baixo, custo estimado para cima (sem erro de ponto flutuante)", () => {
  // 5,6% de 10,10 = 56,56 centavos: taxa 56 (baixo); custo 3,39% = 34,239 centavos: 35 (cima)
  const e: EntradaSplit = { ...entrada("cartao_1x", 0, "nenhum"), taxaMinimaCentavos: 0, totalCentavos: 1010, subtotalCentavos: 1010 };
  const x = calcularSplit(e);
  assert.equal(x.taxaTotalCentavos, 56 + 80);
  assert.equal(x.custoLytexCentavos, 35 + 10 + 10); // meio + repasse da loja + repasse da Staypse (mínimos)
  assert.equal(soma(x), 1010);
});

test("venda pequena demais para cobrir o custo não é cobrada no prejuízo", () => {
  const barata = { ...entrada("pix", 0, "nenhum"), taxaMinimaCentavos: 0, taxaTotal: { percentual: 1.5, fixoCentavos: 190 } };
  assert.throws(() => calcularSplit({ ...barata, totalCentavos: 300, subtotalCentavos: 300 }), /taxa_menor_que_o_custo/);
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

test("tarifa mínima: a taxa total nunca fica abaixo dela; acima do mínimo nada muda", () => {
  const pequeno = calcularSplit({ ...entrada("pix", 0, "nenhum"), totalCentavos: 1000, subtotalCentavos: 1000 });
  assert.equal(pequeno.taxaTotalCentavos, 250); // 1,5% de R$ 10 = 15 + 230 = 245, sobe para o mínimo
  const sem = calcularSplit({ ...entrada("pix", 0, "nenhum"), taxaMinimaCentavos: 0, totalCentavos: 1000, subtotalCentavos: 1000 });
  assert.equal(sem.taxaTotalCentavos, 245);
  assert.equal(calcularSplit(entrada("pix", 150)).taxaTotalCentavos, 455);
});

test("pedido mínimo de R$ 10: toda modalidade, no pior caso (afiliado 30%), fecha com a soma e a Staypse não perde", () => {
  for (const m of MODALIDADES) {
    const e = entrada(m, 0, "afiliado", 30);
    const x = calcularSplit({ ...e, totalCentavos: 1000, subtotalCentavos: 1000 });
    assert.ok(x.staypseCentavos > 0, m);
    assert.equal(soma(x), 1000);
  }
});

test("acréscimo do parcelamento: loja e afiliado recebem o mesmo que no cartão à vista; a soma fecha com o total cobrado", () => {
  const base = { ...entrada("cartao_1x", 200, "afiliado", 20) };
  const avista = calcularSplit(base);
  const acr = 130;
  const parcelado = calcularSplit({ ...base, modalidade: "cartao_2a6", custoLytex: TAXAS_PADRAO.custoLytex.cartao_2a6, acrescimoCentavos: acr });
  assert.equal(parcelado.produtorCentavos, avista.produtorCentavos);
  assert.equal(parcelado.indicadorCentavos, avista.indicadorCentavos);
  assert.equal(parcelado.cobradoCentavos, 20000 + acr);
  assert.equal(soma(parcelado), 20000 + acr);
  assert.equal(parcelado.staypseCentavos + parcelado.custoLytexCentavos, parcelado.taxaTotalCentavos + acr);
});

test("loja assume a taxa do afiliado: comissão cheia, loja paga a taxa inteira, taxa e total cobrado iguais", () => {
  const e = entrada("cartao_1x", 150, "afiliado", 30);
  const padrao = calcularSplit(e);
  const assume = calcularSplit({ ...e, assumeTaxaAfiliado: true });
  assert.deepEqual([padrao.produtorCentavos, padrao.indicadorCentavos, padrao.taxaAfiliadoCentavos, padrao.staypseCentavos], [9856, 4224, 276, 259]);
  assert.deepEqual([assume.produtorCentavos, assume.indicadorCentavos, assume.taxaAfiliadoCentavos, assume.taxaLojaCentavos, assume.staypseCentavos], [9580, 4500, 0, 920, 260]);
  assert.equal(assume.indicadorCentavos, assume.comissaoDevidaCentavos);
  assert.equal(assume.taxaTotalCentavos, padrao.taxaTotalCentavos);
  assert.equal(assume.cobradoCentavos, padrao.cobradoCentavos);
  assert.equal(soma(assume), e.totalCentavos);
});

test("loja assume a taxa: a receita da Staypse muda no máximo 1 centavo (arredondamento do custo de repasse)", () => {
  for (const [m, v, pct] of [["pix", 50, 20], ["pix", 299.9, 20], ["cartao_2a6", 800, 45], ["boleto", 30, 10]] as const) {
    const e = { ...entrada(m, 0, "afiliado", pct), totalCentavos: Math.round(v * 100), subtotalCentavos: Math.round(v * 100) };
    const a = calcularSplit(e);
    const b = calcularSplit({ ...e, assumeTaxaAfiliado: true });
    assert.ok(Math.abs(a.staypseCentavos - b.staypseCentavos) <= 1, `${m} ${v}`);
    assert.equal(b.taxaAfiliadoCentavos, 0);
    assert.equal(soma(b), e.totalCentavos);
  }
});

test("loja assume a taxa: não altera vendedor próprio nem venda sem indicador", () => {
  for (const ind of ["nenhum", "vendedor_split", "vendedor_folha"] as const) {
    const e = entrada("pix", 150, ind, 20);
    assert.deepEqual(calcularSplit({ ...e, assumeTaxaAfiliado: true }), calcularSplit(e), ind);
  }
});
