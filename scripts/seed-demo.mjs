// Seed de DEMONSTRAÇÃO da Staypse — reexecutável (idempotente).
//
// Cria: 1 admin, 2 lojas aprovadas (recebedor mock aprovado, frete, identidade visual,
// 3-4 itens aprovados cada), 3 afiliados com vitrine e afiliações, 2 vendedores próprios
// (1 "folha" e 1 "split_direto"), 200 cliques e 20 pedidos nos últimos 30 dias em estados variados.
//
// Tudo passa pelas funções e regras do banco (RLS, RPCs e gatilhos): o script entra como cada
// usuário (login com senha) e só usa a chave secreta para o que o servidor do app também faz
// (criar usuários, criar pedido, confirmar pagamento, registrar recebedor, abrir link curto)
// e para espalhar as datas no tempo.
//
// Uso:  npm run seed:demo
// Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (obrigatórias, vêm do ambiente ou do
//            .env.local), SEED_SENHA (opcional) e SEED_PERMITIR_REMOTO=1 (só para ambiente que NÃO
//            seja produção real).
import { deflateSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------- configuração e trava de segurança
const URL_API = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SECRET_KEY;
if (!URL_API || !CHAVE) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY no ambiente.");
  process.exit(1);
}
const host = new URL(URL_API).hostname;
const local = host === "127.0.0.1" || host === "localhost";
if (!local && process.env.SEED_PERMITIR_REMOTO !== "1") {
  console.error(`RECUSADO: ${host} não é um ambiente local. Este seed apaga e recria dados de demonstração.`);
  console.error("Para rodar em um ambiente remoto de TESTE (nunca produção), defina SEED_PERMITIR_REMOTO=1.");
  process.exit(1);
}
const SENHA = process.env.SEED_SENHA || "SenhaDemo123";
const DOMINIO = "@demo.staypse.invalid";
const TERMOS_VERSAO = "2026-12-02.1";
const CONTRATO_VERSAO = "2026-11-18.3";

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_API, CHAVE, opcoes);

// ---------------------------------------------------------------- utilidades
const log = (m) => console.log(m);
function ok(res, contexto) {
  if (res.error) throw new Error(`${contexto}: ${res.error.message}`);
  return res.data;
}
// aleatório determinístico: rodar de novo gera a mesma distribuição
let semente = 20261123;
function aleat() {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const DIA = 86400000;
const antes = (dias) => new Date(Date.now() - dias * DIA);

// CPF e CNPJ válidos a partir de uma base numérica
function cpf(base9) {
  const d = base9.split("").map(Number);
  const dv = (ns) => {
    const s = ns.reduce((a, n, i) => a + n * (ns.length + 1 - i), 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  const d1 = dv(d);
  const d2 = dv([...d, d1]);
  return base9 + d1 + d2;
}
function cnpj(base12) {
  const d = base12.split("").map(Number);
  const dv = (ns, pesos) => {
    const s = ns.reduce((a, n, i) => a + n * pesos[i], 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  const d1 = dv(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv([...d, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base12 + d1 + d2;
}

// PNG simples (fundo + círculo claro) gerado aqui mesmo, sem dependências
const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function bloco(tipo, dados) {
  const t = Buffer.from(tipo, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([len, t, dados, crc]);
}
function png(fundoHex, formaHex, tam = 480) {
  const cor = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const f = cor(fundoHex);
  const s = cor(formaHex);
  const linha = 1 + tam * 3;
  const cru = Buffer.alloc(linha * tam);
  const c = tam / 2;
  const r = tam * 0.3;
  for (let y = 0; y < tam; y++) {
    cru[y * linha] = 0;
    for (let x = 0; x < tam; x++) {
      const dentro = (x - c) ** 2 + (y - c) ** 2 < r * r;
      const px = dentro ? s : f;
      cru.set(px, y * linha + 1 + x * 3);
    }
  }
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(tam, 0);
  cab.writeUInt32BE(tam, 4);
  cab[8] = 8; // 8 bits por canal
  cab[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", cab),
    bloco("IDAT", deflateSync(cru)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}
async function enviarImagem(uid, nome, fundo, forma) {
  const caminho = `${uid}/${nome}.png`;
  const r = await admin.storage.from("fotos-itens").upload(caminho, png(fundo, forma), { contentType: "image/png", upsert: true });
  if (r.error) throw new Error(`upload ${caminho}: ${r.error.message}`);
  return caminho;
}

// ---------------------------------------------------------------- limpeza (só o que é do seed)
async function limpar() {
  const ids = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw new Error(`listar usuários: ${error.message}`);
    ids.push(...data.users.filter((u) => u.email?.endsWith(DOMINIO)).map((u) => u.id));
    if (data.users.length < 200) break;
  }
  if (!ids.length) return;
  log(`Limpando dados de demonstração anteriores (${ids.length} usuários)...`);

  const lojas = ok(await admin.from("producers").select("id").in("user_id", ids), "buscar lojas").map((p) => p.id);
  const vitrines = ok(await admin.from("storefronts").select("id").in("revendedor_id", ids), "buscar vitrines").map((s) => s.id);
  const del = async (tabela, coluna, valores) => {
    if (valores.length) ok(await admin.from(tabela).delete().in(coluna, valores), `apagar ${tabela}`);
  };
  // ordem: o que aponta para pedidos/itens/lojas primeiro
  await del("atendimentos", "producer_id", lojas);
  await del("orders", "producer_id", lojas);
  await del("orders", "revendedor_id", ids);
  await del("clicks", "storefront_id", vitrines);
  await del("afiliacoes", "afiliado_id", ids);
  await del("loja_afiliados_bloqueados", "producer_id", lojas);
  await del("loja_vendedores", "producer_id", lojas);
  await del("items", "producer_id", lojas);
  await del("producers", "id", lojas);
  // fotos enviadas ao Storage
  for (const uid of ids) {
    const { data: arquivos } = await admin.storage.from("fotos-itens").list(uid, { limit: 200 });
    if (arquivos?.length) await admin.storage.from("fotos-itens").remove(arquivos.map((a) => `${uid}/${a.name}`));
  }
  for (const uid of ids) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw new Error(`apagar usuário ${uid}: ${error.message}`);
  }
}

// ---------------------------------------------------------------- usuários
async function criarUsuario(slugEmail, nome, papeis) {
  const email = `${slugEmail}${DOMINIO}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome, papeis, termos_versao: TERMOS_VERSAO },
  });
  if (error) throw new Error(`criar ${email}: ${error.message}`);
  return { id: data.user.id, email, nome };
}
// cliente "logado" como o usuário: valem as mesmas regras (RLS) que o app aplica
async function entrar(usuario) {
  const sessao = createClient(URL_API, CHAVE, opcoes);
  const { data, error } = await sessao.auth.signInWithPassword({ email: usuario.email, password: SENHA });
  if (error) throw new Error(`entrar ${usuario.email}: ${error.message}`);
  return createClient(URL_API, CHAVE, {
    ...opcoes,
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}
// recebedor aprovado no provedor "mock": mesmas duas funções que o app usa
async function recebedorAprovado(usuario, papel, documento) {
  const provedorId = `mock_demo_${papel}_${usuario.id.slice(0, 8)}`;
  ok(
    await admin.rpc("registrar_recebedor", {
      p_user: usuario.id, p_papel: papel, p_documento: documento, p_provedor: "mock",
      p_provedor_id: provedorId, p_status: "em_analise", p_motivo: null,
    }),
    `registrar recebedor ${papel}`,
  );
  ok(
    await admin.rpc("aplicar_status_recebedor", {
      p_provedor: "mock", p_provedor_id: provedorId, p_status: "aprovado", p_motivo: null, p_documento: documento,
    }),
    `aprovar recebedor ${papel}`,
  );
}

// ---------------------------------------------------------------- dados do cenário
const LOJAS = [
  {
    chave: "aurora", email: "loja.aurora", dono: "Helena Duarte", razao: "Casa Aurora Decoração LTDA", base: "110011220001",
    nome: "Casa Aurora", slug: "demo-casa-aurora", descricao: "Decoração artesanal para deixar a casa com a sua cara.",
    cor: "#7a3b2e", destaque: "#e9b44c", fonte: "playfair", layout: "destaque", cidade: ["Recife", "PE", "50030230", "Rua do Bom Jesus"],
    frete: [1490, 25000, 5], logo: ["#f3e9df", "#7a3b2e"],
    itens: [
      { nome: "Vaso de Cerâmica Artesanal", preco: 8900, comissao: 20, categoria: "casa", regra: "automatica", cor: ["#efe3d3", "#b5654a"] },
      { nome: "Manta de Algodão Tricotada", preco: 15900, comissao: 18, categoria: "casa", regra: "automatica", cor: ["#e8eef0", "#5d7f8c"] },
      { nome: "Luminária de Mesa em Rattan", preco: 21900, comissao: 25, categoria: "casa", regra: "manual", cor: ["#f4ecd8", "#c28a2c"] },
      { nome: "Guia Decoração em 7 Dias", preco: 4900, comissao: 40, categoria: "cursos_digitais", digital: true, regra: "automatica", cor: ["#e9e4f0", "#6b4fa0"] },
    ],
  },
  {
    chave: "trilha", email: "loja.trilha", dono: "Rodrigo Pontes", razao: "Trilha Fitness Esportes LTDA", base: "220033440001",
    nome: "Trilha Fitness", slug: "demo-trilha-fitness", descricao: "Acessórios para treinar em casa, na rua ou na trilha.",
    cor: "#1f5c4a", destaque: "#f26b3a", fonte: "space_grotesk", layout: "grade", cidade: ["Curitiba", "PR", "80010000", "Rua XV de Novembro"],
    frete: [1890, 30000, 6], logo: ["#e3f0ea", "#1f5c4a"],
    itens: [
      { nome: "Garrafa Térmica Inox 1 L", preco: 7900, comissao: 22, categoria: "saude_fitness", regra: "automatica", cor: ["#e1ecf0", "#2f6f8f"] },
      { nome: "Kit 5 Faixas Elásticas", preco: 3900, comissao: 30, categoria: "saude_fitness", regra: "automatica", cor: ["#f7e6dc", "#e0653a"] },
      { nome: "Tapete de Yoga Premium", preco: 12900, comissao: 20, categoria: "saude_fitness", regra: "automatica", cor: ["#e4efe0", "#4f8a3f"] },
    ],
  },
];
const AFILIADOS = [
  { chave: "bia", email: "afiliada.bia", nome: "Bia Santos", slug: "demo-bia-achados", exibicao: "Achados da Bia", nicho: "casa", visual: "staypse",
    bio: "Casa bonita sem gastar muito.", cpfBase: "390533447", itens: ["aurora:*", "trilha:Tapete de Yoga Premium"] },
  { chave: "leo", email: "afiliado.leo", nome: "Leonardo Alves", slug: "demo-leo-fit", exibicao: "Leo Fit", nicho: "fitness", visual: "proprio", cor: "#0e7490",
    bio: "Treino em casa, sem desculpa.", cpfBase: "529982247", itens: ["trilha:*", "aurora:Vaso de Cerâmica Artesanal"] },
  { chave: "duda", email: "afiliada.duda", nome: "Maria Eduarda Lima", slug: "demo-duda-casa", exibicao: "Duda Decora", nicho: "casa", visual: "proprio", cor: "#9a3f6b",
    bio: "Dicas e achados de decoração.", cpfBase: "111444777", itens: ["aurora:*"], pendente: "aurora:Luminária de Mesa em Rattan" },
];
const VENDEDORES = [
  { chave: "carla", email: "vendedora.carla", nome: "Carla Mendes", slug: "demo-carla-aurora", loja: "aurora", forma: "folha", comissao: 8 },
  { chave: "marcos", email: "vendedor.marcos", nome: "Marcos Ribeiro", slug: "demo-marcos-trilha", loja: "trilha", forma: "split_direto", comissao: 12.5, cpfBase: "123456789" },
];

// ---------------------------------------------------------------- 1. admin, lojas e itens
const ctx = { lojas: {}, afiliados: {}, vendedores: {}, itens: {} };

async function criarLoja(def) {
  const u = await criarUsuario(def.email, def.dono, ["produtor"]);
  const eu = await entrar(u);
  const [cidade, uf, cep, rua] = def.cidade;
  ok(
    await eu.from("producers").insert({
      user_id: u.id, razao_social: def.razao, cnpj: cnpj(def.base), inscricao_estadual: "ISENTO", whatsapp: "81998765432",
      email_contato: u.email, cep, logradouro: rua, numero: "100", bairro: "Centro", cidade, uf,
    }),
    "cadastrar loja",
  );
  ok(await eu.from("terms_acceptances").insert({ user_id: u.id, documento: "termos_produtor", versao: CONTRATO_VERSAO }), "aceite do contrato");
  ok(await eu.rpc("enviar_produtor_para_analise"), "enviar loja para análise");
  const prodId = ok(await eu.from("producers").select("id").eq("user_id", u.id).single(), "buscar loja").id;
  ok(await ctx.admin.cliente.rpc("admin_decidir_produtor", { p_producer: prodId, p_aprovar: true, p_motivo: null, p_cnpj_ativo_confirmado: true }), "aprovar loja");
  await recebedorAprovado(u, "produtor", cnpj(def.base));

  // identidade visual, frete e logotipo
  const logo = await enviarImagem(u.id, "logo", def.logo[0], def.logo[1]);
  ok(
    await eu.rpc("salvar_minha_loja", {
      p_slug: def.slug, p_nome: def.nome, p_descricao: def.descricao, p_foto: logo,
      p_cor_principal: def.cor, p_cor_destaque: def.destaque, p_fonte: def.fonte, p_layout: def.layout,
    }),
    "identidade da loja",
  );
  ok(await eu.rpc("salvar_frete", { p_fixo: def.frete[0], p_gratis_acima: def.frete[1], p_prazo: def.frete[2] }), "frete");

  // itens: criados "em análise" e aprovados pelo admin (regra do app)
  ctx.itens[def.chave] = {};
  for (const [n, it] of def.itens.entries()) {
    const arquivo = `item-${n + 1}`;
    const fotos = [await enviarImagem(u.id, `${arquivo}-a`, it.cor[0], it.cor[1]), await enviarImagem(u.id, `${arquivo}-b`, it.cor[1], it.cor[0])];
    const base = {
      producer_id: prodId, nome: it.nome, descricao: `${it.nome}: produto de demonstração da ${def.nome}, com qualidade e entrega rápida.`,
      preco_centavos: it.preco, comissao_percentual: it.comissao, categoria: it.categoria, fotos,
      declaracao_nf: true, aprovacao_afiliacao: it.regra, status_aprovacao: "em_analise",
    };
    const dados = it.digital
      ? { ...base, tipo: "digital", tipo_digital: "ebook", link_acesso: "https://exemplo.demo.staypse.invalid/guia", instrucoes_pos_compra: "Acesse o link para baixar o guia em PDF." }
      : { ...base, tipo: "fisico", peso_gramas: 600, altura_cm: 12, largura_cm: 25, comprimento_cm: 25, estoque: 60, prazo_postagem_dias: 2 };
    const novo = ok(await eu.from("items").insert(dados).select("id, slug").single(), `criar item ${it.nome}`);
    ok(await ctx.admin.cliente.rpc("admin_decidir_item", { p_item: novo.id, p_aprovar: true, p_motivo: null }), `aprovar item ${it.nome}`);
    ctx.itens[def.chave][it.nome] = { id: novo.id, slug: novo.slug, preco: it.preco, digital: !!it.digital, nome: it.nome };
  }
  ctx.lojas[def.chave] = { ...def, user: u, cliente: eu, prodId };
  log(`  loja ${def.nome}: ${def.itens.length} itens aprovados`);
}

// ---------------------------------------------------------------- 2. afiliados
async function criarAfiliado(def) {
  const u = await criarUsuario(def.email, def.nome, ["revendedor"]);
  const eu = await entrar(u);
  await recebedorAprovado(u, "afiliado", cpf(def.cpfBase));
  ok(
    await eu.from("storefronts").insert({
      revendedor_id: u.id, slug: def.slug, nome_exibicao: def.exibicao, nicho: def.nicho, modelo_visual: def.visual, cor_principal: def.cor ?? null, bio: def.bio, publicada: true,
    }),
    "criar vitrine",
  );
  const alvos = [];
  for (const regra of [...def.itens, ...(def.pendente ? [def.pendente] : [])]) {
    const [loja, nome] = regra.split(":");
    const itens = nome === "*" ? Object.values(ctx.itens[loja]) : [ctx.itens[loja][nome]];
    alvos.push(...itens);
  }
  for (const it of alvos) {
    const r = ok(await eu.rpc("afiliar_se", { p_item: it.id }), `afiliar-se a ${it.nome}`);
    // afiliação manual: a loja aprova (menos a que ficou pendente de propósito, para a demonstração)
    if (r[0].status === "pendente" && it.nome !== def.pendente?.split(":")[1]) {
      const aff = ok(await admin.from("afiliacoes").select("id").eq("afiliado_id", u.id).eq("item_id", it.id).single(), "buscar afiliação");
      const dona = Object.values(ctx.lojas).find((l) => ctx.itens[l.chave][it.nome]);
      ok(await dona.cliente.rpc("decidir_afiliacao", { p_afiliacao: aff.id, p_aprovar: true }), `aprovar afiliação de ${it.nome}`);
    }
  }
  ctx.afiliados[def.chave] = { ...def, user: u, cpf: cpf(def.cpfBase) };
  log(`  afiliado ${def.exibicao}: ${alvos.length} afiliações`);
}

// ---------------------------------------------------------------- 3. vendedores próprios
async function criarVendedor(def) {
  const loja = ctx.lojas[def.loja];
  const u = await criarUsuario(def.email, def.nome, []);
  const eu = await entrar(u);
  const token = ok(
    await loja.cliente.rpc("convidar_vendedor", {
      p_email: u.email, p_comissao: def.comissao, p_forma: def.forma, p_declaracao: def.forma === "split_direto",
    }),
    "convidar vendedor",
  );
  ok(await eu.rpc("aceitar_convite", { p_token: token, p_slug: def.slug }), "aceitar convite");
  if (def.forma === "split_direto") await recebedorAprovado(u, "vendedor", cpf(def.cpfBase));
  // a vitrine nasce rascunho no convite; publica para os links curtos aparecerem
  ok(await eu.from("storefronts").update({ publicada: true, nome_exibicao: def.nome }).eq("revendedor_id", u.id), "publicar vitrine do vendedor");
  ctx.vendedores[def.chave] = { ...def, user: u };
  log(`  vendedor ${def.nome} (${def.forma}) na loja ${loja.nome}`);
}

// ---------------------------------------------------------------- 4. pedidos
const COMPRADORES = [
  "Ana Beatriz Costa", "Bruno Henrique Silva", "Camila Ferreira", "Diego Martins", "Eduarda Nogueira", "Felipe Araújo", "Gabriela Rocha",
  "Heitor Barbosa", "Isabela Teixeira", "João Pedro Cardoso", "Karina Moreira", "Lucas Pereira", "Marina Azevedo", "Nicolas Ribeiro",
  "Olívia Campos", "Paulo Vieira", "Queila Lopes", "Rafael Gomes", "Sabrina Dias", "Thiago Freitas",
];
const ENDERECOS = [
  { cep: "50030230", logradouro: "Rua do Bom Jesus", numero: "55", bairro: "Recife", cidade: "Recife", uf: "PE" },
  { cep: "01310100", logradouro: "Avenida Paulista", numero: "900", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" },
  { cep: "30130010", logradouro: "Avenida Afonso Pena", numero: "1200", bairro: "Centro", cidade: "Belo Horizonte", uf: "MG" },
  { cep: "40020000", logradouro: "Rua Chile", numero: "30", bairro: "Centro", cidade: "Salvador", uf: "BA" },
  { cep: "90010000", logradouro: "Rua dos Andradas", numero: "410", bairro: "Centro Histórico", cidade: "Porto Alegre", uf: "RS" },
];

// estado final de cada pedido, quem indicou e há quantos dias foi feito
// estados: aguardando | cancelado | pago | enviado | entregue | reembolso (em andamento) | reembolsado
const PEDIDOS = [
  { loja: "aurora", item: "Vaso de Cerâmica Artesanal", q: 2, via: "bia", estado: "entregue", dias: 27 },
  { loja: "aurora", item: "Manta de Algodão Tricotada", q: 1, via: "carla", estado: "entregue", dias: 24 },
  { loja: "trilha", item: "Garrafa Térmica Inox 1 L", q: 1, via: "leo", estado: "entregue", dias: 21 },
  { loja: "trilha", item: "Tapete de Yoga Premium", q: 1, via: null, estado: "entregue", dias: 19 },
  { loja: "aurora", item: "Luminária de Mesa em Rattan", q: 1, via: "bia", estado: "reembolsado", dias: 22 },
  { loja: "trilha", item: "Kit 5 Faixas Elásticas", q: 3, via: "marcos", estado: "reembolsado", dias: 17 },
  { loja: "aurora", item: "Manta de Algodão Tricotada", q: 2, via: null, estado: "entregue", dias: 14 },
  { loja: "trilha", item: "Garrafa Térmica Inox 1 L", q: 2, via: "leo", estado: "enviado", dias: 6 },
  { loja: "aurora", item: "Vaso de Cerâmica Artesanal", q: 1, via: "duda", estado: "enviado", dias: 5 },
  { loja: "trilha", item: "Tapete de Yoga Premium", q: 1, via: "bia", estado: "enviado", dias: 4 },
  { loja: "aurora", item: "Luminária de Mesa em Rattan", q: 1, via: null, estado: "enviado", dias: 7 },
  { loja: "trilha", item: "Kit 5 Faixas Elásticas", q: 2, via: "marcos", estado: "entregue", dias: 12 },
  { loja: "aurora", item: "Guia Decoração em 7 Dias", q: 1, via: "duda", estado: "pago", dias: 3 },
  { loja: "trilha", item: "Garrafa Térmica Inox 1 L", q: 1, via: null, estado: "pago", dias: 2 },
  { loja: "aurora", item: "Vaso de Cerâmica Artesanal", q: 3, via: "carla", estado: "pago", dias: 1 },
  { loja: "trilha", item: "Tapete de Yoga Premium", q: 1, via: "leo", estado: "reembolso", dias: 9 },
  { loja: "aurora", item: "Manta de Algodão Tricotada", q: 1, via: "carla", estado: "aguardando", dias: 1 },
  { loja: "trilha", item: "Kit 5 Faixas Elásticas", q: 1, via: null, estado: "aguardando", dias: 0 },
  { loja: "aurora", item: "Guia Decoração em 7 Dias", q: 1, via: "bia", estado: "cancelado", dias: 11 },
  { loja: "trilha", item: "Garrafa Térmica Inox 1 L", q: 1, via: "marcos", estado: "cancelado", dias: 8 },
];

async function criarPedidos() {
  const resumo = {};
  for (const [n, p] of PEDIDOS.entries()) {
    const it = ctx.itens[p.loja][p.item];
    const quem = p.via && (ctx.afiliados[p.via] || ctx.vendedores[p.via]);
    const nome = COMPRADORES[n];
    const modo = it.digital ? "digital" : "envio";
    const novo = ok(
      await admin.rpc("criar_pedido", {
        p_item: it.id, p_quantidade: p.q, p_modo: modo, p_afiliado: quem ? quem.user.id : null, p_comprador_id: null,
        p_nome: nome, p_email: `comprador${String(n + 1).padStart(2, "0")}${DOMINIO}`,
        p_documento: cpf(String(300100200 + n * 7919).slice(0, 9)), p_telefone: `1198${String(1000000 + n * 3571).slice(0, 7)}`,
        p_endereco: modo === "envio" ? ENDERECOS[n % ENDERECOS.length] : null, p_termos_versao: TERMOS_VERSAO,
      }),
      `criar pedido ${n + 1}`,
    )[0];
    const { id, codigo, token } = novo;
    const rpc = async (fn, args, ctxo) => ok(await admin.rpc(fn, args), `${ctxo} (pedido ${codigo})`);
    const e = p.estado;

    if (e === "cancelado") await rpc("desistir_do_pedido", { p_codigo: codigo, p_token: token, p_motivo: "Mudei de ideia" }, "cancelar");
    if (!["aguardando", "cancelado"].includes(e)) await rpc("confirmar_pagamento", { p_order: id }, "confirmar pagamento");

    if (["enviado", "entregue", "reembolso", "reembolsado"].includes(e) && !it.digital) {
      // a loja lança nota fiscal e rastreio (o banco exige a nota para marcar como enviado)
      ok(
        await admin.from("order_items").update({
          status_entrega: "enviado", codigo_rastreio: `BR${String(100000000 + n * 7777).padStart(9, "0")}BR`,
          nota_fiscal_numero: String(1000 + n), nota_fiscal_chave: String(35261100000000 + n).padStart(44, "3"),
        }).eq("order_id", id),
        "marcar como enviado",
      );
    }
    if (["entregue", "reembolso", "reembolsado"].includes(e) && !it.digital) {
      await rpc("confirmar_recebimento", { p_codigo: codigo, p_token: token }, "confirmar recebimento");
    }
    if (e === "reembolso" || e === "reembolsado") {
      await rpc("desistir_do_pedido", { p_codigo: codigo, p_token: token, p_motivo: "Não era o que eu esperava" }, "desistir");
    }
    if (e === "reembolsado") ok(await ctx.admin.cliente.rpc("concluir_reembolso", { p_order: id }), `concluir reembolso (pedido ${codigo})`);

    // ---- datas coerentes com a linha do tempo do pedido
    const t0 = antes(p.dias + aleat() * 0.6);
    const apos = (base, dias) => new Date(Math.min(base.getTime() + dias * DIA, Date.now() - 60000));
    const pagoEm = apos(t0, 0.08);
    const enviadoEm = apos(pagoEm, 1 + aleat());
    const entregueEm = apos(enviadoEm, 2 + aleat() * 2);
    const pedido = { criado_em: t0.toISOString() };
    if (!["aguardando", "cancelado"].includes(e)) pedido.pago_em = pagoEm.toISOString();
    if (e === "cancelado") pedido.cancelado_em = apos(t0, 0.5).toISOString();
    if (it.digital && pedido.pago_em) {
      pedido.entregue_em = pedido.pago_em;
      pedido.arrependimento_ate = new Date(pagoEm.getTime() + 7 * DIA).toISOString();
    }
    if (["entregue", "reembolso", "reembolsado"].includes(e) && !it.digital) {
      pedido.entregue_em = entregueEm.toISOString();
      pedido.arrependimento_ate = new Date(entregueEm.getTime() + 7 * DIA).toISOString();
    }
    if (e === "reembolso" || e === "reembolsado") {
      const sol = apos(it.digital ? pagoEm : entregueEm, 1.5);
      pedido.arrependimento_solicitado_em = sol.toISOString();
      if (e === "reembolsado") pedido.reembolsado_em = apos(sol, 1.5).toISOString();
    }
    ok(await admin.from("orders").update(pedido).eq("id", id), "ajustar datas do pedido");
    if (["enviado", "entregue", "reembolso", "reembolsado"].includes(e) && !it.digital) {
      ok(await admin.from("order_items").update({ enviado_em: enviadoEm.toISOString(), nota_fiscal_emitida_em: pagoEm.toISOString() }).eq("order_id", id), "ajustar datas de envio");
    }
    resumo[e] = (resumo[e] || 0) + 1;
  }
  log(`  ${PEDIDOS.length} pedidos: ${Object.entries(resumo).map(([k, v]) => `${v} ${k}`).join(", ")}`);
}

// ---------------------------------------------------------------- 5. cliques
async function criarCliques(total = 200) {
  // pares (vitrine, item) com afiliação aprovada: afiliados e vendedores
  const afs = ok(
    await admin.from("afiliacoes").select("afiliado_id, item_id, origem, storefronts(slug), items(slug)").eq("status", "aprovada")
      .in("afiliado_id", [...Object.values(ctx.afiliados), ...Object.values(ctx.vendedores)].map((x) => x.user.id)),
    "buscar afiliações",
  );
  // vendedores e afiliados mais ativos recebem mais cliques
  const peso = (a) => (a.origem === "vendedor_proprio" ? 2.2 : 1.4) + aleat();
  const pares = afs.map((a) => ({ vitrine: a.storefronts.slug, produto: a.items.slug, p: peso(a) }));
  const soma = pares.reduce((s, x) => s + x.p, 0);
  const escolhe = () => {
    let r = aleat() * soma;
    for (const x of pares) if ((r -= x.p) <= 0) return x;
    return pares[pares.length - 1];
  };
  const origens = ["instagram.com", "whatsapp", "tiktok.com", "direto", "youtube.com", "facebook.com"];
  const hashes = [];
  for (let i = 0; i < total; i++) {
    const par = escolhe();
    const hash = `seed-demo-${String(i).padStart(4, "0")}`;
    const r = ok(
      await admin.rpc("abrir_link_afiliado", {
        p_afiliado: par.vitrine, p_produto: par.produto, p_ip_hash: hash, p_origem: origens[Math.floor(aleat() * origens.length)], p_registrar: true,
      }),
      "registrar clique",
    );
    if (r[0]?.clique_registrado) hashes.push(hash);
  }
  // espalha nos últimos 30 dias (mais cliques nos dias recentes)
  const lote = 10;
  for (let i = 0; i < hashes.length; i += lote) {
    await Promise.all(
      hashes.slice(i, i + lote).map(async (h) => {
        const dias = Math.pow(aleat(), 1.3) * 29.5;
        ok(await admin.from("clicks").update({ criado_em: antes(dias).toISOString() }).eq("ip_hash", h), "ajustar data do clique");
      }),
    );
  }
  log(`  ${hashes.length} cliques nos últimos 30 dias`);
}

// ---------------------------------------------------------------- execução
await limpar();
log("Criando dados de demonstração...");
const adm = await criarUsuario("admin", "Admin Demo", []);
ok(await admin.from("user_roles").insert({ user_id: adm.id, papel: "admin" }), "papel admin");
ctx.admin = { user: adm, cliente: await entrar(adm) };
for (const l of LOJAS) await criarLoja(l);
for (const a of AFILIADOS) await criarAfiliado(a);
for (const v of VENDEDORES) await criarVendedor(v);
await criarPedidos();
await criarCliques(200);

log("\nPronto. Usuários de demonstração (senha em SEED_SENHA; padrão local \"SenhaDemo123\"):");
log(`  admin:      admin${DOMINIO}`);
for (const l of LOJAS) log(`  loja:       ${l.email}${DOMINIO}  (${l.nome})`);
for (const a of AFILIADOS) log(`  afiliado:   ${a.email}${DOMINIO}  (/@${a.slug})`);
for (const v of VENDEDORES) log(`  vendedor:   ${v.email}${DOMINIO}  (${v.forma})`);
