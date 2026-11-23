// Testes do texto dos e-mails da lista. Rodam com: npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { emailDaLista, emailDaNotificacao } from "./email-conteudo";

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

test("e-mail de notificação: link interno vira endereço completo e escapa HTML", () => {
  const e = emailDaNotificacao({ titulo: "Venda nova", texto: "Pedido <b>X</b> pago.", link: "/painel/loja/pedidos/ABC", siteUrl: "https://staypse.com.br" });
  assert.equal(e.assunto, "Staypse: Venda nova");
  assert.ok(e.texto.includes("https://staypse.com.br/painel/loja/pedidos/ABC"));
  assert.ok(e.html.includes("&lt;b&gt;") && !e.html.includes("<b>X"));
  assert.ok(e.texto.includes("/painel/configuracoes"));
});

test("e-mail de notificação: link externo ou nulo não vira botão", () => {
  for (const link of ["//evil.com", "https://evil.com", null]) {
    const e = emailDaNotificacao({ titulo: "T", texto: "x", link, siteUrl: "https://staypse.com.br" });
    assert.ok(!e.html.includes("evil.com") && !e.html.includes("Ver no painel"));
  }
});
