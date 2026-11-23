// Testes do motor de tema da loja (formato, predefinições e compatibilidade).
import assert from "node:assert/strict";
import { test } from "node:test";
import { LISTA_MODELOS, MODELOS_LOJA, TIPOS_SECAO, lerTemaLoja, lerVideo, restaurarModelo, secoesDoModelo, temaDoModelo, validarTemaLoja } from "./tema-loja";

const ID = "11111111-1111-4111-8111-111111111111";

test("há pelo menos 6 modelos, todos com o mesmo conjunto de blocos", () => {
  assert.ok(LISTA_MODELOS.length >= 6);
  for (const m of LISTA_MODELOS) {
    assert.deepEqual([...secoesDoModelo(m).map((s) => s.tipo)].sort(), [...TIPOS_SECAO].sort());
  }
});

test("cada modelo tem identidade própria (cartão, hero, produto ou fonte)", () => {
  const assinaturas = LISTA_MODELOS.map((m) => {
    const c = MODELOS_LOJA[m];
    return [c.cartao, c.hero, c.produto, c.fonte, c.raio].join("|");
  });
  assert.equal(new Set(assinaturas).size, LISTA_MODELOS.length);
  assert.equal(new Set(LISTA_MODELOS.map((m) => MODELOS_LOJA[m].cartao)).size, LISTA_MODELOS.length);
});

test("não existe bloco de depoimentos nem avaliações", () => {
  assert.equal(TIPOS_SECAO.some((t) => /depoimento|avalia/i.test(t)), false);
});

test("tema padrão de cada modelo é válido", () => {
  for (const m of LISTA_MODELOS) assert.equal(validarTemaLoja(temaDoModelo(m)).ok, true);
});

test("recusa modelo, bloco e chaves fora do combinado", () => {
  const base = temaDoModelo("classico");
  assert.equal(validarTemaLoja({ ...base, modelo: "livre" }).ok, false);
  assert.equal(validarTemaLoja({ ...base, secoes: [{ tipo: "html", visivel: true }] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, secoes: [base.secoes[0], base.secoes[0]] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, secoes: [{ tipo: "banner", visivel: "sim" }] }).ok, false);
});

test("destaques: até 8, sem repetir e só ids", () => {
  const base = temaDoModelo("vitrine");
  assert.equal(validarTemaLoja({ ...base, destaques: [ID] }).ok, true);
  assert.equal(validarTemaLoja({ ...base, destaques: [ID, ID] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, destaques: ["abc"] }).ok, false);
  const nove = Array.from({ length: 9 }, (_, i) => `11111111-1111-4111-8111-11111111111${i}`);
  assert.equal(validarTemaLoja({ ...base, destaques: nove }).ok, false);
});

test("banner antigo: frase até 80 letras e caminho seguro; vira o primeiro banner", () => {
  const base = temaDoModelo("vitrine");
  assert.equal(validarTemaLoja({ ...base, banner: { imagem: null, frase: "x".repeat(81), produto: null } }).ok, false);
  assert.equal(validarTemaLoja({ ...base, banner: { imagem: "../x.png", frase: null, produto: null } }).ok, false);
  const r = validarTemaLoja({ ...base, banner: { imagem: `${ID}/banner.webp`, frase: "Oi", produto: ID } });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.tema.banners[0].frase, "Oi");
});

test("banners: até 5, link só https, sem frase longa", () => {
  const base = temaDoModelo("vitrine");
  const b = { imagem: `${ID}/a.webp`, celular: `${ID}/b.webp`, frase: "Oi", alt: null, produto: null, url: "https://exemplo.com/x" };
  assert.equal(validarTemaLoja({ ...base, banners: [b] }).ok, true);
  assert.equal(validarTemaLoja({ ...base, banners: Array(6).fill(b) }).ok, false);
  assert.equal(validarTemaLoja({ ...base, banners: [{ ...b, url: "javascript:alert(1)" }] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, banners: [{ ...b, url: "http://exemplo.com" }] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, banners: [{ ...b, celular: "../x" }] }).ok, false);
});

test("anúncio, cabeçalho, rodapé e perguntas são conferidos", () => {
  const base = temaDoModelo("minimal");
  assert.equal(validarTemaLoja({ ...base, anuncio: { visivel: true, texto: "Frete grátis acima de R$ 200", url: "https://x.com/a" } }).ok, true);
  assert.equal(validarTemaLoja({ ...base, anuncio: { visivel: true, texto: "x".repeat(101), url: null } }).ok, false);
  assert.equal(validarTemaLoja({ ...base, cabecalho: { busca: true, menu: true, links: Array(5).fill({ rotulo: "a", url: "https://a.com" }) } }).ok, false);
  const rod = validarTemaLoja({ ...base, rodape: { instagram: "@minha.loja", facebook: null, tiktok: null, youtube: null, whatsapp: "(11) 99999-0000", links: [] } });
  assert.equal(rod.ok, true);
  if (rod.ok) {
    assert.equal(rod.tema.rodape.instagram, "minha.loja");
    assert.equal(rod.tema.rodape.whatsapp, "5511999990000");
  }
  assert.equal(validarTemaLoja({ ...base, rodape: { instagram: "a b/c", facebook: null, tiktok: null, youtube: null, whatsapp: null, links: [] } }).ok, false);
  assert.equal(validarTemaLoja({ ...base, faq: [{ p: "Prazo?", r: "" }] }).ok, false);
  assert.equal(validarTemaLoja({ ...base, faq: Array(9).fill({ p: "a", r: "b" }) }).ok, false);
});

test("vídeo: só YouTube e Vimeo", () => {
  assert.deepEqual(lerVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), { plataforma: "youtube", id: "dQw4w9WgXcQ" });
  assert.deepEqual(lerVideo("https://youtu.be/dQw4w9WgXcQ?t=3"), { plataforma: "youtube", id: "dQw4w9WgXcQ" });
  assert.deepEqual(lerVideo("https://vimeo.com/123456789"), { plataforma: "vimeo", id: "123456789" });
  assert.equal(lerVideo("https://exemplo.com/video.mp4"), null);
  assert.equal(lerVideo("javascript:alert(1)"), null);
  const base = temaDoModelo("digital");
  assert.equal(validarTemaLoja({ ...base, video: { plataforma: "youtube", id: "dQw4w9WgXcQ", titulo: "Aula" } }).ok, true);
  assert.equal(validarTemaLoja({ ...base, video: { plataforma: "youtube", id: "<script>", titulo: null } }).ok, false);
});

test("restaurar o padrão volta a ordem e mantém o conteúdo", () => {
  const base = temaDoModelo("boutique");
  const mexido = { ...base, secoes: [...base.secoes].reverse(), faq: [{ p: "Prazo?", r: "5 dias" }] };
  const r = restaurarModelo(mexido);
  assert.deepEqual(r.secoes, secoesDoModelo("boutique"));
  assert.equal(r.faq.length, 1);
});

test("sem tema salvo, o layout antigo vira modelo", () => {
  assert.equal(lerTemaLoja(null, "destaque").modelo, "vitrine");
  assert.equal(lerTemaLoja(null, "lista").modelo, "editorial");
  assert.equal(lerTemaLoja(null, "grade").modelo, "classico");
  assert.equal(lerTemaLoja(null, null).modelo, "classico");
  assert.equal(lerTemaLoja({ lixo: 1 }, "lista").modelo, "editorial");
});

test("loja salva no formato antigo continua abrindo", () => {
  const t = lerTemaLoja({ modelo: "editorial", secoes: [{ tipo: "banner", visivel: true }, { tipo: "todos_produtos", visivel: true }], destaques: [], banner: { imagem: null, frase: "Olá", produto: null } });
  assert.equal(t.modelo, "editorial");
  assert.equal(t.banners[0].frase, "Olá");
  assert.equal(t.secoes.length, TIPOS_SECAO.length);
});

test("leitura completa os blocos que faltam (ocultos)", () => {
  const t = lerTemaLoja({ modelo: "catalogo", secoes: [{ tipo: "sobre", visivel: true }] });
  assert.equal(t.secoes.length, TIPOS_SECAO.length);
  assert.equal(t.secoes[0].tipo, "sobre");
  assert.equal(t.secoes.slice(1).every((s) => !s.visivel), true);
});
