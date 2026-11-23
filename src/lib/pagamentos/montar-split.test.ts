// Testes da montagem do split da cobrança: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { montarSplit, type DadosSplitPedido } from "./montar-split";
import { MODALIDADES, TAXAS_PADRAO } from "./taxas";

// as chaves que dados_split_pedido devolve (tabela configuracoes)
const taxas: Record<string, unknown> = { custo_lytex_split: { percentual: 1, minimo_centavos: 10, maximo_centavos: 100 } };
for (const m of MODALIDADES) {
  taxas[`taxa_total_${m}`] = { percentual: TAXAS_PADRAO.taxaTotal[m].percentual, fixo_centavos: TAXAS_PADRAO.taxaTotal[m].fixoCentavos };
  taxas[`custo_lytex_${m}`] = { percentual: TAXAS_PADRAO.custoLytex[m].percentual, fixo_centavos: TAXAS_PADRAO.custoLytex[m].fixoCentavos };
}

const base: DadosSplitPedido = {
  total_centavos: 31980, // R$ 299,90 + R$ 19,90 de frete
  subtotal_centavos: 29990,
  frete_centavos: 1990,
  comissao_percentual: 20,
  indicador: "afiliado",
  produtor_provedor_id: "rec_loja",
  indicador_provedor_id: "rec_afiliada",
  taxas,
};

const soma = (p: { valorCentavos: number }[]) => p.reduce((s, x) => s + x.valorCentavos, 0);

test("loja, afiliado e Staypse recebem; soma das partes + custo Lytex fecha com o total", () => {
  const { partes, snapshot } = montarSplit(base, "rec_staypse", "pix");
  assert.deepEqual(partes.map((p) => p.recebedorProvedorId), ["rec_loja", "rec_afiliada", "rec_staypse"]);
  assert.equal(partes[1].valorCentavos, 5998); // 20% de R$ 299,90 (sem o frete)
  const r = snapshot.resultado;
  assert.equal(r.taxaTotalCentavos, Math.floor((31980 * 150) / 10000) + 200); // 479 + 200
  assert.equal(partes[0].valorCentavos, 31980 - r.taxaTotalCentavos - 5998);
  assert.equal(soma(partes) + r.custoLytexCentavos, base.total_centavos);
  assert.equal(snapshot.versao, 2);
  assert.equal(snapshot.partes.length, 3);
});

test("snapshot guarda modalidade, taxa total, custo Lytex e receita da Staypse", () => {
  const { snapshot, partes } = montarSplit(base, "rec_staypse", "cartao_7a12");
  assert.equal(snapshot.taxas.modalidade, "cartao_7a12");
  assert.equal(snapshot.taxas.taxa_total_centavos, snapshot.resultado.taxaTotalCentavos);
  assert.equal(snapshot.taxas.custo_lytex_centavos, snapshot.resultado.custoLytexCentavos);
  assert.equal(snapshot.taxas.receita_staypse_centavos, partes[2].valorCentavos);
  assert.ok(snapshot.taxas.receita_staypse_centavos > 0);
});

test("sem indicação: só loja e Staypse", () => {
  const { partes, snapshot } = montarSplit({ ...base, indicador: "nenhum", comissao_percentual: 0, indicador_provedor_id: null }, "rec_staypse", "boleto");
  assert.equal(partes.length, 2);
  assert.equal(soma(partes) + snapshot.resultado.custoLytexCentavos, base.total_centavos);
});

test("vendedor na folha não entra no split (a loja paga fora)", () => {
  const { partes, snapshot } = montarSplit({ ...base, indicador: "vendedor_folha", indicador_provedor_id: null }, "rec_staypse", "pix");
  assert.deepEqual(partes.map((p) => p.recebedorProvedorId), ["rec_loja", "rec_staypse"]);
  assert.equal(snapshot.resultado.comissaoDevidaCentavos, 5998);
});

test("vendedor split_direto recebe a comissão como o afiliado", () => {
  const { snapshot } = montarSplit({ ...base, indicador: "vendedor_split" }, "rec_staypse", "pix");
  assert.equal(snapshot.partes[1].indicador, "vendedor_split");
});

test("comissão sem recebedor do indicador não monta a cobrança", () => {
  assert.throws(() => montarSplit({ ...base, indicador_provedor_id: null }, "rec_staypse", "pix"), /indicador_sem_recebedor/);
});

test("taxas não configuradas não montam a cobrança (nada é inventado)", () => {
  assert.throws(() => montarSplit({ ...base, taxas: {} }, "rec_staypse", "pix"), /taxas_nao_configuradas/);
});
