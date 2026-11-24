import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTO_SAQUE_CENTAVOS, PedidoSaque, mensagemDeErroDoSaque, statusDoSaque } from "./saque-usuario";

test("custo do saque de subconta é R$ 2,80", () => assert.equal(CUSTO_SAQUE_CENTAVOS, 280));
test("status do saque da Lytex", () => {
  assert.equal(statusDoSaque("released"), "concluido");
  assert.equal(statusDoSaque("rejected"), "falhou");
  assert.equal(statusDoSaque("reproved"), "falhou");
  assert.equal(statusDoSaque("waiting_approval"), "pendente");
  assert.equal(statusDoSaque("approved"), "pendente");
});
test("pedido de saque valida valor, conta e chave", () => {
  const ok = { valorCentavos: 1500, contaId: "c1", chave: "abcdefgh" };
  assert.ok(PedidoSaque.safeParse(ok).success);
  assert.ok(!PedidoSaque.safeParse({ ...ok, valorCentavos: 0 }).success);
  assert.ok(!PedidoSaque.safeParse({ ...ok, valorCentavos: 1.5 }).success);
  assert.ok(!PedidoSaque.safeParse({ ...ok, valorCentavos: Number.NaN }).success);
  assert.ok(!PedidoSaque.safeParse({ ...ok, chave: "x" }).success);
});
test("erro da Lytex vira mensagem amigável, sem eco da resposta", () => {
  assert.match(mensagemDeErroDoSaque(new Error("lytex_http_400: Valor máximo para saque é de 10")), /limite/);
  assert.doesNotMatch(mensagemDeErroDoSaque(new Error("lytex_http_500: segredo")), /segredo/);
});
