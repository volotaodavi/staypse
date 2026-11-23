// Testes do provedor Lytex com fetch simulado (nenhuma chamada de rede).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarLytex, mapearStatusFatura, mapearStatusRecebedor } from "./lytex";
import { IntegracaoPendente } from "./tipos";

type Chamada = { metodo: string; url: string; corpo: unknown; auth: string | null };

// fetch simulado: responde pela ordem "METODO /caminho" e registra as chamadas
function simular(rotas: Record<string, (c: Chamada) => { status?: number; json: unknown } | undefined>) {
  const chamadas: Chamada[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const caminho = new URL(url).pathname + new URL(url).search;
    const c: Chamada = {
      metodo: String(init.method),
      url: caminho,
      corpo: init.body ? JSON.parse(String(init.body)) : undefined,
      auth: new Headers(init.headers).get("authorization"),
    };
    chamadas.push(c);
    const chave = Object.keys(rotas).find((k) => `${c.metodo} ${c.url}`.startsWith(k));
    const r = chave ? rotas[chave](c) : undefined;
    const status = r?.status ?? (r ? 200 : 404);
    return new Response(JSON.stringify(r?.json ?? { message: "rota_nao_simulada" }), { status });
  }) as unknown as typeof fetch;
  return { f, chamadas };
}

const ENV = { LYTEX_CLIENT_ID: "id-teste", LYTEX_CLIENT_SECRET: "segredo-teste" };
const token = (n = 1, expira = "2030-01-01T00:00:00Z") => ({
  json: { accessToken: `acc${n}`, refreshToken: `ref${n}`, expireAt: expira, refreshExpireAt: "2030-01-02T00:00:00Z" },
});

describe("lytex: status da subconta", () => {
  it("mapeia só valores do spec", () => {
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "approved" }).status, "aprovado");
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "approved_system", walletAccountStatus: "approved" }).status, "aprovado");
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "approved", walletAccountStatus: "waiting_approval" }).status, "em_analise");
    for (const d of ["waiting_approval", "processing", "waiting_approve_qsa"]) assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: d }).status, "em_analise");
    for (const d of ["rejected", "full_rejected"]) assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: d }).status, "recusado");
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "approved", walletAccountStatus: "rejected" }).status, "recusado");
    for (const s of ["blocked", "disabled", "pending_exclusion"]) assert.equal(mapearStatusRecebedor({ status: s, documentStatus: "approved" }).status, "suspenso");
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "pending" }).status, "nao_iniciado");
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "resend" }).motivo, "reenviar_documentos");
    assert.equal(mapearStatusRecebedor({ status: "active" }).status, "nao_iniciado");
    assert.equal(mapearStatusRecebedor({ status: "active", documentStatus: "novo_valor" }).status, "em_analise"); // nunca aprova no escuro
  });
});

describe("lytex: status da fatura", () => {
  it("traduz o vocabulário de transações do spec", () => {
    const casos: Record<string, string> = {
      paid: "paga",
      refund: "estornada",
      chargeback: "chargeback",
      recused: "recusada",
      error: "recusada",
      canceled: "expirada",
      waitingPayment: "pendente",
      processing: "pendente",
      overdue: "pendente",
    };
    for (const [k, v] of Object.entries(casos)) assert.equal(mapearStatusFatura({ status: k }), v);
  });
  it("usa a última transação quando o status da fatura não é conhecido e marca estorno pendente", () => {
    assert.equal(mapearStatusFatura({ status: "x", transactions: [{ status: "waitingPayment" }, { status: "paid" }] }), "paga");
    assert.equal(mapearStatusFatura({}), "pendente");
    assert.equal(mapearStatusFatura({ status: "paid", refundSolicitations: [{}] }), "estorno_pendente");
    assert.equal(mapearStatusFatura({ status: "paid", refundSolicitations: [{ acceptedAt: "2026-01-01" }] }), "paga");
  });
});

describe("lytex: autenticação", () => {
  it("guarda o token em cache e renova ao expirar (refresh_token primeiro)", async () => {
    let agora = Date.parse("2029-01-01T00:00:00Z");
    let n = 0;
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(++n, "2029-01-01T01:00:00Z"),
      "POST /v2/auth/refresh_token": () => token(++n, "2029-01-01T03:00:00Z"),
      "GET /v2/invoices/": () => ({ json: { _id: "f1", status: "paid" } }),
    });
    const p = criarLytex({ fetch: f, env: ENV, agora: () => agora });
    await p.consultarCobranca("f1");
    await p.consultarCobranca("f1");
    assert.equal(chamadas.filter((c) => c.url.includes("obtain_token")).length, 1);
    assert.deepEqual(chamadas[0].corpo, { clientId: "id-teste", clientSecret: "segredo-teste" });
    agora += 2 * 3600_000; // token expirou
    await p.consultarCobranca("f1");
    const refresh = chamadas.find((c) => c.url.includes("refresh_token"));
    assert.deepEqual(refresh?.corpo, { accessToken: "acc1", refreshToken: "ref1" });
    assert.equal(chamadas.at(-1)?.auth, "Bearer acc2");
  });
  it("repete uma vez com token novo após 401", async () => {
    let n = 0;
    let falhou = false;
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(++n),
      "GET /v2/invoices/": () => {
        if (!falhou) {
          falhou = true;
          return { status: 401, json: { message: "Token inválido" } };
        }
        return { json: { _id: "f1", status: "waitingPayment" } };
      },
    });
    const r = await criarLytex({ fetch: f, env: ENV }).consultarCobranca("f1");
    assert.equal(r.status, "pendente");
    assert.equal(chamadas.filter((c) => c.url.includes("obtain_token")).length, 2);
  });
  it("usa o sandbox por padrão e respeita LYTEX_API_URL; exige credenciais", async () => {
    let host = "";
    const f = (async (url: string) => {
      host = new URL(url).origin;
      return new Response(JSON.stringify({ message: "Client inválido" }), { status: 401 });
    }) as unknown as typeof fetch;
    await assert.rejects(criarLytex({ fetch: f, env: ENV }).consultarCobranca("x"), /lytex_http_401: Client inválido/);
    assert.equal(host, "https://sandbox-api-pay.lytex.com.br");
    await assert.rejects(criarLytex({ fetch: f, env: { ...ENV, LYTEX_API_URL: "https://outra.exemplo/" } }).consultarCobranca("x"));
    assert.equal(host, "https://outra.exemplo");
    await assert.rejects(criarLytex({ fetch: f, env: {} }).consultarCobranca("x"), /não configurados/);
  });
});

describe("lytex: recebedores (subcontas)", () => {
  const dados = {
    userId: "u1",
    papel: "produtor" as const,
    documento: "123.456.789-09",
    nome: "Maria Teste",
    email: "maria@example.com",
    celular: "(11) 91234-5678",
    endereco: { rua: "Rua A", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "01001-000", numero: "10" },
  };
  it("cria a subconta e devolve status, documento e link de onboarding", async () => {
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/sub-accounts": () => ({ status: 201, json: { _id: "s1", status: "active" } }),
      "GET /v2/sub-accounts/s1": () => ({ json: { _id: "s1", cpfCnpj: "12345678909", status: "active", documentStatus: "pending" } }),
      "GET /v2/sub-accounts?search=": () => ({ json: { results: [{ _id: "s1", onboardingUrl: "https://onboarding.exemplo/s1" }] } }),
    });
    const r = await criarLytex({ fetch: f, env: ENV }).criarRecebedor(dados);
    assert.deepEqual(r, { provedorId: "s1", status: "nao_iniciado", motivo: null, documento: "12345678909", urlOnboarding: "https://onboarding.exemplo/s1" });
    const post = chamadas.find((c) => c.metodo === "POST" && c.url === "/v2/sub-accounts")?.corpo as Record<string, unknown>;
    assert.equal(post.type, "pf");
    assert.equal(post.cpfCnpj, "12345678909");
    assert.equal(post.cellphone, "11912345678");
    assert.deepEqual(post.address, { street: "Rua A", zone: "Centro", city: "São Paulo", state: "SP", zip: "01001000", number: "10" });
  });
  it("recusa dados que a Lytex exige e a Staypse não informou", async () => {
    const { f } = simular({});
    const semCelular = { ...dados, celular: undefined };
    await assert.rejects(criarLytex({ fetch: f, env: ENV }).criarRecebedor(semCelular), /dados_recebedor_incompletos: celular/);
    await assert.rejects(criarLytex({ fetch: f, env: ENV }).criarRecebedor({ ...dados, documento: "12345678000199" }), /tipoEmpresa/);
  });
  it("consulta: aprovado e recusado", async () => {
    const { f } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "GET /v2/sub-accounts/ok": () => ({ json: { cpfCnpj: "1", status: "active", documentStatus: "approved_system", walletAccountStatus: "approved" } }),
      "GET /v2/sub-accounts/no": () => ({ json: { status: "active", documentStatus: "full_rejected" } }),
    });
    const p = criarLytex({ fetch: f, env: ENV });
    assert.equal((await p.consultarRecebedor("ok")).status, "aprovado");
    const r = await p.consultarRecebedor("no");
    assert.equal(r.status, "recusado");
    assert.equal(r.motivo, "documentos_full_rejected");
  });
});

describe("lytex: cobrança", () => {
  const dados = {
    pedidoId: "ped-123",
    totalCentavos: 1000,
    descricao: "Pedido Staypse",
    urlRetorno: "https://staypse.exemplo/pedido/abc",
    split: [
      { recebedorProvedorId: "s1", valorCentavos: 800 },
      { recebedorProvedorId: "s2", valorCentavos: 200 },
    ],
    comprador: { nome: "Joao Comprador", documento: "529.982.247-25", email: "j@example.com" },
  };
  it("monta fatura com split fixedValue, referenceId e devolve linkCheckout", async () => {
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/invoices": () => ({ status: 201, json: { _id: "inv1", status: "waitingPayment", linkCheckout: "https://checkout.exemplo/x" } }),
    });
    const r = await criarLytex({ fetch: f, env: ENV, agora: () => Date.parse("2026-01-10T12:00:00Z") }).criarCobranca(dados);
    assert.deepEqual(r, { provedorId: "inv1", status: "pendente", urlPagamento: "https://checkout.exemplo/x" });
    const c = chamadas.find((x) => x.url === "/v2/invoices")?.corpo as { split: unknown; referenceId: string; referenceIdUniqueExt: string; dueDate: string; items: unknown; client: unknown; paymentMethods: unknown; redirect: { urlRedirect: string } };
    assert.deepEqual(c.split, {
      type: "fixedValue",
      recipients: [
        { _recipientId: "s1", value: 800 },
        { _recipientId: "s2", value: 200 },
      ],
    });
    assert.equal(c.referenceId, "ped-123");
    assert.equal(c.referenceIdUniqueExt, "ped-123");
    assert.equal(c.dueDate, "2026-01-13");
    assert.deepEqual(c.items, [{ name: "Pedido Staypse", quantity: 1, value: 1000 }]);
    assert.deepEqual(c.client, { type: "pf", name: "Joao Comprador", cpfCnpj: "52998224725", email: "j@example.com" });
    assert.deepEqual(c.paymentMethods, { pix: { enable: true }, boleto: { enable: true }, creditCard: { enable: true } });
    assert.equal(c.redirect.urlRedirect, dados.urlRetorno);
  });
  it("respeita meio e parcelas", async () => {
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/invoices": () => ({ status: 201, json: { _id: "inv1", status: "waitingPayment" } }),
    });
    await criarLytex({ fetch: f, env: ENV }).criarCobranca({ ...dados, meio: "cartao", parcelas: 3 });
    const c = chamadas.find((x) => x.url === "/v2/invoices")?.corpo as { split: unknown; referenceId: string; referenceIdUniqueExt: string; dueDate: string; items: unknown; client: unknown; paymentMethods: unknown; redirect: { urlRedirect: string } };
    assert.deepEqual(c.paymentMethods, { pix: { enable: false }, boleto: { enable: false }, creditCard: { enable: true, maxParcels: 3 } });
  });
  it("Pix: só Pix habilitado, sem async, e devolve o copia e cola", async () => {
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/invoices": () => ({
        status: 201,
        json: { _id: "inv2", status: "waitingPayment", dueDate: "2026-01-13T00:00:00.000Z", paymentMethods: { pix: { enable: true, qrcode: "000201PIX" } } },
      }),
    });
    const r = await criarLytex({ fetch: f, env: ENV }).criarCobranca({ ...dados, meio: "pix" });
    const c = chamadas.find((x) => x.url === "/v2/invoices")?.corpo as { paymentMethods: unknown; async?: boolean };
    assert.deepEqual(c.paymentMethods, { pix: { enable: true }, boleto: { enable: false }, creditCard: { enable: false } });
    assert.equal(c.async, undefined);
    assert.deepEqual(r.pagamento, { pixCopiaECola: "000201PIX", boletoLinhaDigitavel: null, boletoUrl: null, venceEm: "2026-01-13" });
  });
  it("boleto: devolve linha digitável e link do boleto", async () => {
    const { f } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/invoices": () => ({
        status: 201,
        json: { _id: "inv3", status: "waitingPayment", linkBoleto: "https://b/1", paymentMethods: { boleto: { enable: true, digitableLine: "34191.79001" } } },
      }),
    });
    const r = await criarLytex({ fetch: f, env: ENV }).criarCobranca({ ...dados, meio: "boleto" });
    assert.equal(r.pagamento?.boletoLinhaDigitavel, "34191.79001");
    assert.equal(r.pagamento?.boletoUrl, "https://b/1");
  });
  it("valida antes de chamar a Lytex", async () => {
    const p = criarLytex({ fetch: simular({}).f, env: ENV });
    await assert.rejects(p.criarCobranca({ ...dados, split: [dados.split[0]] }), /2_a_10/);
    await assert.rejects(p.criarCobranca({ ...dados, totalCentavos: 500 }), /split_maior_que_o_total/);
    await assert.rejects(p.criarCobranca({ ...dados, comprador: undefined }), /comprador_obrigatorio/);
  });
  it("idempotência: pedido repetido devolve a fatura existente", async () => {
    const { f } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/invoices": () => ({ status: 422, json: { message: "referenceIdUniqueExt já existe" } }),
      "GET /v2/invoices/referenceIdUniqueExt/ped-123": () => ({ json: { _id: "inv0", status: "paid", linkCheckout: "https://c/y" } }),
    });
    const r = await criarLytex({ fetch: f, env: ENV }).criarCobranca(dados);
    assert.deepEqual(r, { provedorId: "inv0", status: "paga", urlPagamento: "https://c/y" });
  });
  it("consulta traduz status", async () => {
    const { f } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "GET /v2/invoices/inv1": () => ({ json: { _id: "inv1", status: "chargeback" } }),
    });
    assert.equal((await criarLytex({ fetch: f, env: ENV }).consultarCobranca("inv1")).status, "chargeback");
  });
});

describe("lytex: estorno", () => {
  it("total: busca o valor máximo e abre a solicitação", async () => {
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "GET /v2/refund-solicitation/inv1/max-value": () => ({ json: { maxRefundValue: 1000 } }),
      "POST /v2/refund-solicitation": () => ({ status: 201, json: { _id: "r1", status: "pending" } }),
    });
    const r = await criarLytex({ fetch: f, env: ENV }).estornar("inv1");
    assert.deepEqual(r, { provedorId: "inv1", status: "estorno_pendente" });
    assert.deepEqual(chamadas.at(-1)?.corpo, { _invoiceId: "inv1", refundValue: 1000 });
  });
  it("parcial: usa o valor informado", async () => {
    const { f, chamadas } = simular({
      "POST /v2/auth/obtain_token": () => token(),
      "POST /v2/refund-solicitation": () => ({ status: 201, json: { _id: "r1" } }),
    });
    await criarLytex({ fetch: f, env: ENV }).estornar("inv1", 300);
    assert.deepEqual(chamadas.at(-1)?.corpo, { _invoiceId: "inv1", refundValue: 300 });
  });
});

describe("lytex: webhook", () => {
  it("rejeita tudo enquanto o spec não documentar assinatura", async () => {
    const p = criarLytex({ fetch: simular({}).f, env: { ...ENV, LYTEX_CALLBACK_SECRET: "x" } });
    await assert.rejects(p.validarWebhook('{"id":"1"}', new Headers({ "x-assinatura": "x" })), IntegracaoPendente);
  });
});
