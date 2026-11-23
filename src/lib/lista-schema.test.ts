// Testes do schema da lista de espera. Rodam com: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { lerFormulario, validarLista } from "./lista-schema";

const base = { nome: "Rita Souza", email: "  Rita@Teste.com ", consentimento: "sim" };
const afiliado = { ...base, perfil: "afiliado", whatsapp: "(81) 99876-5432", cidade: "Recife", uf: "PE", nichos: ["beleza", "moda"] };
const loja = { ...base, perfil: "loja", whatsapp: "+55 11 3333-4444", empresa: "Doces da Vó", tipo_produto: "fisico", o_que_vende: "Doces caseiros", cnpj: "" };
const vendedor = { ...base, perfil: "vendedor", empresa: "Loja da Esquina" };
const comprador = { ...base, perfil: "comprador" };

test("aceita os 4 perfis e normaliza e-mail e WhatsApp", () => {
  for (const d of [afiliado, loja, vendedor, comprador]) {
    const r = validarLista(d);
    assert.equal(r.ok, true, d.perfil);
    if (r.ok) assert.equal(r.dados.email, "rita@teste.com");
  }
  const r = validarLista(afiliado);
  assert.ok(r.ok && r.dados.whatsapp === "81998765432");
  const l = validarLista(loja);
  assert.ok(l.ok && l.dados.whatsapp === "1133334444");
});

test("recusa perfil ausente, antigo ou inventado", () => {
  for (const perfil of [undefined, "", "revendedor", "produtor", "admin"]) {
    const r = validarLista({ ...afiliado, perfil });
    assert.equal(r.ok, false, String(perfil));
    if (!r.ok) assert.equal(r.erros.perfil, "Escolha o seu perfil.");
  }
});

test("consentimento LGPD é obrigatório", () => {
  for (const consentimento of [undefined, "", "nao", "on"]) {
    const r = validarLista({ ...comprador, consentimento });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.erros.consentimento, /Política de Privacidade/);
  }
});

test("e-mail e nome inválidos", () => {
  for (const email of ["", "semarroba", "a@b", "a b@c.com", "x".repeat(250) + "@t.com"]) {
    assert.equal(validarLista({ ...comprador, email }).ok, false, email);
  }
  assert.equal(validarLista({ ...comprador, nome: "A" }).ok, false);
  assert.equal(validarLista({ ...comprador, nome: "   " }).ok, false);
});

test("afiliado: WhatsApp, cidade, UF e nichos obrigatórios", () => {
  assert.equal(validarLista({ ...afiliado, whatsapp: "123" }).ok, false);
  assert.equal(validarLista({ ...afiliado, whatsapp: "" }).ok, false);
  assert.equal(validarLista({ ...afiliado, cidade: "" }).ok, false);
  assert.equal(validarLista({ ...afiliado, uf: "XX" }).ok, false);
  assert.equal(validarLista({ ...afiliado, nichos: [] }).ok, false);
  assert.equal(validarLista({ ...afiliado, nichos: ["armas"] }).ok, false);
});

test("loja: empresa, tipo de produto, o que vende e CNPJ", () => {
  assert.equal(validarLista({ ...loja, empresa: "" }).ok, false);
  assert.equal(validarLista({ ...loja, tipo_produto: "" }).ok, false);
  assert.equal(validarLista({ ...loja, o_que_vende: "x" }).ok, false);
  assert.equal(validarLista({ ...loja, whatsapp: "" }).ok, false);
  assert.equal(validarLista({ ...loja, cnpj: "123" }).ok, false);
  const r = validarLista({ ...loja, cnpj: "11.222.333/0001-81" });
  assert.ok(r.ok && r.dados.perfil === "loja" && r.dados.cnpj === "11222333000181");
});

test("vendedor e comprador: WhatsApp opcional, mas válido se informado", () => {
  assert.equal(validarLista({ ...vendedor, whatsapp: "" }).ok, true);
  assert.equal(validarLista({ ...comprador, whatsapp: "(81) 99876-5432" }).ok, true);
  assert.equal(validarLista({ ...comprador, whatsapp: "12" }).ok, false);
  assert.equal(validarLista({ ...vendedor, empresa: "" }).ok, false);
});

test("código de indicação inválido é ignorado, não bloqueia", () => {
  const r = validarLista({ ...comprador, ref: "naoexiste!" });
  assert.ok(r.ok && r.dados.ref === "");
  const ok = validarLista({ ...comprador, ref: "3f9a1c2b" });
  assert.ok(ok.ok && ok.dados.ref === "3f9a1c2b");
});

test("mensagens em português e uma por campo", () => {
  const r = validarLista({ perfil: "afiliado", nome: "", email: "x", consentimento: "" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.erros.nome, "Informe seu nome.");
    assert.equal(r.erros.email, "Informe um e-mail válido.");
    assert.equal(r.primeiro, "Informe seu nome.");
  }
});

test("lerFormulario lê só os campos conhecidos", () => {
  const f = new FormData();
  f.set("perfil", "afiliado");
  f.set("nome", "Ana");
  f.append("nichos", "beleza");
  f.append("nichos", "moda");
  f.set("site", "http://spam.com"); // honeypot nunca entra no schema
  f.set("is_admin", "1");
  const b = lerFormulario(f);
  assert.deepEqual(b.nichos, ["beleza", "moda"]);
  assert.equal(b.perfil, "afiliado");
  assert.equal("site" in b, false);
  assert.equal("is_admin" in b, false);
});
