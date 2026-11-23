// Testes da montagem do split da cobrança: npm run test:unit
// (percentuais de taxa são EXEMPLOS; as da Lytex dependem do contrato)
import assert from "node:assert/strict";
import { test } from "node:test";
import { montarSplit, type DadosSplitPedido } from "./montar-split";

const base: DadosSplitPedido = {
  total_centavos: 31980, // R$ 299,90 + R$ 19,90 de frete
  subtotal_centavos: 29990,
  frete_centavos: 1990,
  comissao_percentual: 20,
  indicador: "afiliado",
  produtor_provedor_id: "rec_loja",
  indicador_provedor_id: "rec_afiliada",
  taxa_staypse_percentual: 5,
};

const soma = (p: { valorCentavos: number }[]) => p.reduce((s, x) => s + x.valorCentavos, 0);

test("loja, afiliado e Staypse recebem; a soma fecha com o total", () => {
  const { partes, snapshot } = montarSplit(base, "rec_staypse");
  assert.deepEqual(partes.map((p) => p.recebedorProvedorId), ["rec_loja", "rec_afiliada", "rec_staypse"]);
  assert.equal(partes[1].valorCentavos, 5998); // 20% de R$ 299,90 (sem o frete)
  assert.equal(partes[2].valorCentavos, 1500); // 5% de R$ 299,90 (sem o frete), arredondado
  assert.equal(soma(partes), base.total_centavos);
  assert.equal(snapshot.versao, 1);
  assert.equal(snapshot.taxaMeioInformada, false); // taxa do meio ainda não informada: não se inventa
  assert.equal(snapshot.partes.length, 3);
});

test("sem indicação: só loja e Staypse", () => {
  const { partes } = montarSplit({ ...base, indicador: "nenhum", comissao_percentual: 0, indicador_provedor_id: null }, "rec_staypse");
  assert.equal(partes.length, 2);
  assert.equal(soma(partes), base.total_centavos);
});

test("vendedor na folha não entra no split (a loja paga fora)", () => {
  const { partes, snapshot } = montarSplit({ ...base, indicador: "vendedor_folha", indicador_provedor_id: null }, "rec_staypse");
  assert.deepEqual(partes.map((p) => p.recebedorProvedorId), ["rec_loja", "rec_staypse"]);
  assert.equal(snapshot.resultado.comissaoDevidaCentavos, 5998);
  assert.equal(soma(partes), base.total_centavos);
});

test("vendedor split_direto recebe a comissão como o afiliado", () => {
  const { partes, snapshot } = montarSplit({ ...base, indicador: "vendedor_split" }, "rec_staypse");
  assert.equal(partes.length, 3);
  assert.equal(snapshot.partes[1].indicador, "vendedor_split");
});

test("comissão sem recebedor do indicador não monta a cobrança", () => {
  assert.throws(() => montarSplit({ ...base, indicador_provedor_id: null }, "rec_staypse"), /indicador_sem_recebedor/);
});

test("taxa do meio informada entra no snapshot e a soma + taxa fecha com o total", () => {
  const { partes, snapshot } = montarSplit(base, "rec_staypse", { percentual: 0.99, fixoCentavos: 0 });
  assert.equal(snapshot.taxaMeioInformada, true);
  assert.equal(soma(partes) + snapshot.resultado.taxaMeioCentavos, base.total_centavos);
});
