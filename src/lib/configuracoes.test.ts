import assert from "node:assert/strict";
import { test } from "node:test";
import { MODALIDADES, TAXAS_PADRAO, type Modalidade } from "./pagamentos/taxas";
import { lerPalavras, numeroBr, validarConfiguracoes, type ConfiguracoesTexto } from "./configuracoes";

const texto = (t: { percentual: number; fixoCentavos: number }) => ({ pct: String(t.percentual).replace(".", ","), fixo: (t.fixoCentavos / 100).toFixed(2).replace(".", ",") });
const porModalidade = (k: "taxaTotal" | "custoLytex") => Object.fromEntries(MODALIDADES.map((m) => [m, texto(TAXAS_PADRAO[k][m])])) as Record<Modalidade, { pct: string; fixo: string }>;
const base: ConfiguracoesTexto = {
  taxas: { taxaTotal: porModalidade("taxaTotal"), custoLytex: porModalidade("custoLytex"), split: { pct: "1", min: "0,10", max: "1,00" } },
  comissaoMin: "10", comissaoMax: "70", prazoNf: "5", palavras: "arma\nCassino", pix: true, cartao: true, boleto: false,
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
    assert.deepEqual(r.valores.taxas.taxa_total_pix, { percentual: 1.5, fixo_centavos: 200 });
    assert.deepEqual(r.valores.taxas.custo_lytex_cartao_7a12, { percentual: 4.29, fixo_centavos: 0 });
    assert.deepEqual(r.valores.taxas.custo_lytex_split, { percentual: 1, minimo_centavos: 10, maximo_centavos: 100 });
    assert.deepEqual(r.valores.palavras_proibidas, ["arma", "cassino"]);
  }
});

test("recusa mínimo maior que máximo, faixa fora de 0 a 100 e prazo inválido", () => {
  assert.ok("erro" in validarConfiguracoes({ ...base, comissaoMin: "80" }));
  const comTaxa = (chave: "taxaTotal" | "custoLytex", m: Modalidade, v: { pct: string; fixo: string }) =>
    ({ ...base, taxas: { ...base.taxas, [chave]: { ...base.taxas[chave], [m]: v } } }) as ConfiguracoesTexto;
  assert.ok("erro" in validarConfiguracoes(comTaxa("taxaTotal", "pix", { pct: "31", fixo: "2" })), "acima de 30%");
  assert.ok("erro" in validarConfiguracoes(comTaxa("taxaTotal", "pix", { pct: "1,555", fixo: "2" })), "mais de 2 casas");
  assert.ok("erro" in validarConfiguracoes(comTaxa("taxaTotal", "pix", { pct: "1,5", fixo: "21" })), "fixo acima de R$ 20");
  assert.ok("erro" in validarConfiguracoes(comTaxa("taxaTotal", "pix", { pct: "1,5", fixo: "1,80" })), "taxa total abaixo do custo (fixo)");
  assert.ok("erro" in validarConfiguracoes(comTaxa("taxaTotal", "cartao_1x", { pct: "3", fixo: "0,50" })), "taxa total abaixo do custo (percentual)");
  assert.ok("erro" in validarConfiguracoes({ ...base, taxas: { ...base.taxas, split: { pct: "1", min: "1,00", max: "0,10" } } }), "máximo do split menor que o mínimo");
  assert.ok("erro" in validarConfiguracoes({ ...base, comissaoMax: "-3" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, prazoNf: "0" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, prazoNf: "2,5" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, palavras: "a" }));
  assert.ok("erro" in validarConfiguracoes({ ...base, pix: false, cartao: false, boleto: false }));
});
