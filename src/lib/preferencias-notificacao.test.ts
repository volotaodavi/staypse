// Testes da validação das configurações da conta. Rodam com: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PREFERENCIAS_PADRAO,
  camposDoPapel,
  normalizarTelefone,
  preferenciasSchema,
  validarConfiguracoesConta,
} from "./preferencias-notificacao";

test("preferências: padrão tudo ligado e só aceita booleanos", () => {
  assert.deepEqual(preferenciasSchema.parse(PREFERENCIAS_PADRAO), { email_venda: true, email_recebedor: true, email_estorno: true });
  assert.equal(preferenciasSchema.safeParse({ ...PREFERENCIAS_PADRAO, email_venda: "sim" }).success, false);
  assert.equal(preferenciasSchema.safeParse({ ...PREFERENCIAS_PADRAO, extra: true }).success, false);
  assert.equal(preferenciasSchema.safeParse({ email_venda: true }).success, false);
});

test("telefone: remove máscara e o +55", () => {
  assert.equal(normalizarTelefone("(11) 91234-5678"), "11912345678");
  assert.equal(normalizarTelefone("+55 11 91234-5678"), "11912345678");
  assert.equal(normalizarTelefone("(11) 1234-5678"), "1112345678");
  assert.equal(normalizarTelefone(""), "");
});

test("contato: nome e telefone válidos; telefone vazio vira null", () => {
  const ok = validarConfiguracoesConta({ nome: "  Ana Souza ", telefone: "(11) 91234-5678", preferencias: { email_venda: false } });
  assert.ok("valores" in ok);
  assert.deepEqual(ok.valores, { nome: "Ana Souza", telefone: "11912345678", preferencias: { email_venda: false } });
  const semTel = validarConfiguracoesConta({ nome: "Ana", telefone: "", preferencias: {} });
  assert.ok("valores" in semTel && semTel.valores.telefone === null);
});

test("contato: recusa nome curto/longo e telefone inválido, com mensagem em português", () => {
  const curto = validarConfiguracoesConta({ nome: "A", telefone: "", preferencias: {} });
  assert.ok("erro" in curto && /nome/i.test(curto.erro));
  const longo = validarConfiguracoesConta({ nome: "a".repeat(121), telefone: "", preferencias: {} });
  assert.ok("erro" in longo && /120/.test(longo.erro));
  const tel = validarConfiguracoesConta({ nome: "Ana", telefone: "123", preferencias: {} });
  assert.ok("erro" in tel && /Telefone inválido/.test(tel.erro));
  const zero = validarConfiguracoesConta({ nome: "Ana", telefone: "011912345678", preferencias: {} });
  assert.ok("erro" in zero);
});

test("preferências com valor que não é booleano são recusadas", () => {
  const r = validarConfiguracoesConta({ nome: "Ana", telefone: "", preferencias: { email_venda: "talvez" } });
  assert.ok("erro" in r);
});

test("cada papel vê só as preferências que fazem sentido", () => {
  assert.deepEqual(camposDoPapel(["produtor"]).map((c) => c.campo), ["email_venda", "email_recebedor"]);
  assert.deepEqual(camposDoPapel(["revendedor"]).map((c) => c.campo), ["email_estorno", "email_recebedor"]);
  assert.deepEqual(camposDoPapel(["admin"]), []);
});
