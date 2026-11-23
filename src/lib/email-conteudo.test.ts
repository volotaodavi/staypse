// Testes do texto dos e-mails da lista. Rodam com: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { emailDaLista } from "./email-conteudo";

const link = "https://staypse.com.br/lista/3f9a1c2b";

test("confirmação traz o link e o primeiro nome", () => {
  const e = emailDaLista({ nome: "Rita Souza", link, reenvio: false });
  assert.match(e.texto, /Olá, Rita!/);
  assert.ok(e.texto.includes(link) && e.html.includes(link));
  assert.match(e.assunto, /Você está na lista/);
});

test("reenvio não repete nome", () => {
  const e = emailDaLista({ link, reenvio: true });
  assert.match(e.texto, /^Olá!/);
  assert.match(e.assunto, /link da lista de espera/);
});

test("nome não vira HTML", () => {
  const e = emailDaLista({ nome: "<script>x</script>", link, reenvio: false });
  assert.equal(e.html.includes("<script>"), false);
});

test("texto sem promessa de ganho nem palavras proibidas", () => {
  const e = emailDaLista({ nome: "Ana", link, reenvio: false });
  assert.doesNotMatch((e.texto + e.html).toLowerCase(), /saldo|carteira|sacar|transferir|r\$|ganhe/);
});
