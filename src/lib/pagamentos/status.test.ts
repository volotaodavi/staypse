// Testes do mapeamento de status da cobrança: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { STATUS_COBRANCA, ROTULO_STATUS_COBRANCA, efeitoDoStatus, pedidoMuda, statusCobrancaValido } from "./status";

test("cada status do provedor tem um efeito definido e um rótulo", () => {
  for (const s of STATUS_COBRANCA) {
    assert.ok(ROTULO_STATUS_COBRANCA[s], s);
    assert.ok(efeitoDoStatus(s));
  }
});

test("pago confirma; recusado e expirado cancelam; estorno reembolsa; chargeback contesta", () => {
  assert.equal(efeitoDoStatus("paga"), "confirmar");
  assert.equal(efeitoDoStatus("recusada"), "cancelar");
  assert.equal(efeitoDoStatus("expirada"), "cancelar");
  assert.equal(efeitoDoStatus("estornada"), "reembolsar");
  assert.equal(efeitoDoStatus("chargeback"), "chargeback");
});

test("pendente e estorno pendente não mudam o pedido (reembolso só quando o provedor confirma)", () => {
  assert.equal(efeitoDoStatus("pendente"), "nenhum");
  assert.equal(efeitoDoStatus("estorno_pendente"), "nenhum");
  assert.equal(pedidoMuda("em_reembolso", "estorno_pendente"), false);
});

test("aviso repetido ou fora de ordem não muda o pedido de novo", () => {
  assert.equal(pedidoMuda("aguardando_pagamento", "paga"), true);
  assert.equal(pedidoMuda("pago", "paga"), false); // idempotente
  assert.equal(pedidoMuda("cancelado", "paga"), false); // não ressuscita pedido cancelado
  assert.equal(pedidoMuda("pago", "recusada"), false); // pago não vira cancelado
  assert.equal(pedidoMuda("pago", "estornada"), true);
  assert.equal(pedidoMuda("em_reembolso", "estornada"), true);
  assert.equal(pedidoMuda("reembolsado", "estornada"), false);
  assert.equal(pedidoMuda("pago", "chargeback"), true);
  assert.equal(pedidoMuda("chargeback", "chargeback"), false);
  assert.equal(pedidoMuda("aguardando_pagamento", "chargeback"), false);
});

test("só aceita status conhecidos (nada inventado entra no banco)", () => {
  assert.equal(statusCobrancaValido("paga"), true);
  assert.equal(statusCobrancaValido("PAID"), false);
  assert.equal(statusCobrancaValido(undefined), false);
  assert.equal(statusCobrancaValido(42), false);
});
