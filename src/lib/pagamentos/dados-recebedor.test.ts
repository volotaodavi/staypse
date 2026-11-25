import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mensagemErroRecebedor, validarDadosRecebedor, type DadosRecebedorLytex } from "./dados-recebedor";
import { criarLytex } from "./lytex";

const base: DadosRecebedorLytex = {
  userId: "u", papel: "afiliado", documento: "12345678909", nome: "Ana", email: "a@x.com", celular: "11912345678",
  endereco: { rua: "Rua A", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "01001000", numero: "1" },
};

describe("validarDadosRecebedor", () => {
  it("aceita PF completa e PJ com tipo de empresa", () => {
    validarDadosRecebedor(base);
    validarDadosRecebedor({ ...base, documento: "12345678000199", tipoEmpresa: "mei" });
  });
  it("lista o que falta (o mesmo erro do Lytex real)", () => {
    assert.throws(() => validarDadosRecebedor({ userId: "u", papel: "produtor", documento: "12345678000199", nome: "X", email: "x@x.com" }),
      /incompletos: celular,rua,bairro,cidade,uf,cep,tipoEmpresa/);
    assert.throws(() => validarDadosRecebedor({ ...base, celular: "123" }), /celular/);
  });
});

describe("corpo da subconta na Lytex", () => {
  it("PJ envia companyType e fantasyName", async () => {
    let corpo: Record<string, unknown> = {};
    const f = (async (url: string, init?: RequestInit) => {
      const u = String(url);
      const json = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status, headers: { "content-type": "application/json" } });
      if (u.endsWith("/v2/auth/obtain_token")) return json({ accessToken: "a", refreshToken: "r", expireAt: new Date(Date.now() + 9e6).toISOString(), refreshExpireAt: new Date(Date.now() + 9e7).toISOString() });
      if (u.endsWith("/v2/sub-accounts") && init?.method === "POST") { corpo = JSON.parse(String(init.body)); return json({ _id: "s1" }, 201); }
      return json({ _id: "s1", cpfCnpj: "12345678000199", status: "active", documentStatus: "pending", onboardingUrl: "https://x" });
    }) as unknown as typeof fetch;
    await criarLytex({ fetch: f, env: { LYTEX_CLIENT_ID: "i", LYTEX_CLIENT_SECRET: "s" } })
      .criarRecebedor({ ...base, documento: "12.345.678/0001-99", nomeFantasia: "Loja", tipoEmpresa: "ltda" });
    assert.equal(corpo.type, "pj");
    assert.equal(corpo.companyType, "ltda");
    assert.equal(corpo.fantasyName, "Loja");
    assert.equal(corpo.cellphone, "11912345678");
  });
});

describe("mensagemErroRecebedor", () => {
  it("traduz campo faltando, 400, duplicado e fora do ar", () => {
    assert.match(mensagemErroRecebedor(new Error("lytex_dados_recebedor_incompletos: celular,tipoEmpresa")), /o celular, o tipo de empresa/);
    assert.match(mensagemErroRecebedor(new Error("lytex_http_400: cellphone must be valid")), /não aceitou o celular/);
    assert.match(mensagemErroRecebedor(new Error("lytex_http_409: already exists")), /já tem cadastro/);
    assert.match(mensagemErroRecebedor(new Error("lytex_http_503: x")), /fora do ar/);
    assert.match(mensagemErroRecebedor(new Error("outro")), /equipe já foi avisada/);
  });
});

import { deduzirTipoEmpresa, mapearCnpj } from "../cnpj-brasilapi";
describe("cnpj brasilapi", () => {
  it("deduz o tipo de empresa e mapeia os campos", () => {
    assert.equal(deduzirTipoEmpresa({ opcao_pelo_mei: true }), "mei");
    assert.equal(deduzirTipoEmpresa({ natureza_juridica: "Sociedade Empresária Limitada" }), "ltda");
    assert.equal(deduzirTipoEmpresa({ natureza_juridica: "Sociedade Limitada Unipessoal" }), "slu");
    assert.equal(deduzirTipoEmpresa({ natureza_juridica: "Empresário (Individual)" }), "ei");
    assert.equal(deduzirTipoEmpresa({ natureza_juridica: "Sociedade Anônima Fechada" }), "sa");
    const d = mapearCnpj({ razao_social: "ACME LTDA", cep: "01001000", municipio: "SAO PAULO", ddd_telefone_1: "1133334444" });
    assert.equal(d.nomeFantasia, "ACME LTDA");
    assert.equal(d.cidade, "SAO PAULO");
    assert.equal(d.celular, "1133334444");
  });
});
