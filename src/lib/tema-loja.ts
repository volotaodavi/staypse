// Motor de tema da loja (versão 2): 8 MODELOS PRONTOS + blocos editáveis em JSON.
// Sem HTML nem CSS livre: tudo o que a loja pode escolher está listado aqui.
// As cores e a fonte continuam em lib/tema.ts (contraste AA automático).
// O mesmo formato é conferido no banco (função tema_loja_valido) e no servidor.
// Lojas salvas no formato antigo (4 modelos, 7 seções, "banner") continuam valendo.
import type { FonteLoja } from "./tema";

export type CartaoTipo = "simples" | "caixa" | "lista" | "retrato" | "minimal" | "suave" | "denso" | "capa";
export type HeroTipo = "contido" | "cheio" | "faixa" | "empilhado" | "dividido";
export type ProdutoLayout = "lateral" | "empilhada" | "centrada" | "denso";
export type CabecalhoTipo = "claro" | "centro" | "marca" | "leve";

export type TipoSecao =
  | "banner"
  | "destaques"
  | "colecoes"
  | "categorias"
  | "sobre"
  | "video"
  | "mais_vendidos"
  | "todos_produtos"
  | "faq"
  | "trocas_entrega";

export const SECOES_LOJA: Record<TipoSecao, { rotulo: string; dica: string }> = {
  banner: { rotulo: "Banners", dica: "Até 5 banners, com imagem para computador e para celular." },
  destaques: { rotulo: "Produtos em destaque", dica: "Os produtos que você escolher." },
  colecoes: { rotulo: "Coleções", dica: "Uma imagem para cada categoria." },
  categorias: { rotulo: "Produtos por categoria", dica: "Cada categoria com seus produtos." },
  sobre: { rotulo: "Sobre a marca", dica: "Texto e imagem sobre a loja." },
  video: { rotulo: "Vídeo", dica: "YouTube ou Vimeo, só carrega quando a pessoa toca." },
  mais_vendidos: { rotulo: "Mais vendidos", dica: "Os que mais saíram nos últimos 30 dias (dados reais)." },
  todos_produtos: { rotulo: "Todos os produtos", dica: "A vitrine completa, com busca e filtro." },
  faq: { rotulo: "Perguntas frequentes", dica: "Dúvidas comuns dos seus clientes." },
  trocas_entrega: { rotulo: "Trocas e entrega", dica: "Direito de desistência e prazos." },
};
export const TIPOS_SECAO = Object.keys(SECOES_LOJA) as TipoSecao[];

export type ModeloConfig = {
  rotulo: string;
  dica: string;
  nichos: string;
  fonte: FonteLoja;
  principal: string;
  destaque: string;
  cartao: CartaoTipo;
  hero: HeroTipo;
  heroAlinha: "centro" | "esquerda";
  heroTom: "papel" | "marca"; // fundo do hero dividido
  cabecalho: CabecalhoTipo;
  produto: ProdutoLayout;
  raio: string;
  fundo: string;
  busca: boolean;
  menu: boolean;
  secoes: TipoSecao[]; // as visíveis, na ordem; as demais ficam ocultas no fim
};

export const MODELOS_LOJA = {
  classico: {
    rotulo: "Clássico",
    dica: "Grade limpa e direta. Serve para qualquer loja.",
    nichos: "Qualquer nicho",
    fonte: "inter",
    principal: "#1d3557",
    destaque: "#f4a261",
    cartao: "simples",
    hero: "contido",
    heroAlinha: "esquerda",
    heroTom: "papel",
    cabecalho: "claro",
    produto: "lateral",
    raio: "6px",
    fundo: "#ffffff",
    busca: false,
    menu: false,
    secoes: ["banner", "destaques", "mais_vendidos", "todos_produtos", "sobre", "trocas_entrega"],
  },
  vitrine: {
    rotulo: "Vitrine",
    dica: "Banner de ponta a ponta e destaques em mosaico.",
    nichos: "Moda, fitness, lançamentos",
    fonte: "outfit",
    principal: "#c2410c",
    destaque: "#fde68a",
    cartao: "caixa",
    hero: "cheio",
    heroAlinha: "esquerda",
    heroTom: "papel",
    cabecalho: "claro",
    produto: "lateral",
    raio: "8px",
    fundo: "#ffffff",
    busca: false,
    menu: true,
    secoes: ["banner", "destaques", "colecoes", "mais_vendidos", "todos_produtos", "sobre", "trocas_entrega"],
  },
  catalogo: {
    rotulo: "Catálogo",
    dica: "Lista compacta com busca. Boa para muitos produtos.",
    nichos: "Casa, ferramentas, papelaria",
    fonte: "dm_sans",
    principal: "#0f766e",
    destaque: "#99f6e4",
    cartao: "lista",
    hero: "faixa",
    heroAlinha: "esquerda",
    heroTom: "papel",
    cabecalho: "claro",
    produto: "lateral",
    raio: "4px",
    fundo: "#ffffff",
    busca: true,
    menu: true,
    secoes: ["banner", "categorias", "todos_produtos", "faq", "trocas_entrega", "sobre"],
  },
  editorial: {
    rotulo: "Editorial",
    dica: "Fotos grandes em retrato e letras finas, como numa revista.",
    nichos: "Moda, decoração",
    fonte: "playfair",
    principal: "#1c1917",
    destaque: "#d6c7b0",
    cartao: "retrato",
    hero: "empilhado",
    heroAlinha: "centro",
    heroTom: "papel",
    cabecalho: "centro",
    produto: "empilhada",
    raio: "0px",
    fundo: "#ffffff",
    busca: false,
    menu: true,
    secoes: ["banner", "colecoes", "destaques", "sobre", "video", "todos_produtos", "trocas_entrega"],
  },
  minimal: {
    rotulo: "Minimal",
    dica: "Muito espaço em branco. O produto fala sozinho.",
    nichos: "Eletrônicos, design, casa",
    fonte: "dm_sans",
    principal: "#111111",
    destaque: "#d4d4d4",
    cartao: "minimal",
    hero: "empilhado",
    heroAlinha: "esquerda",
    heroTom: "papel",
    cabecalho: "leve",
    produto: "empilhada",
    raio: "0px",
    fundo: "#ffffff",
    busca: true,
    menu: false,
    secoes: ["banner", "destaques", "todos_produtos", "sobre", "faq", "trocas_entrega"],
  },
  boutique: {
    rotulo: "Boutique",
    dica: "Cantos redondos, fundo suave e serifa. Pede cuidado e calma.",
    nichos: "Beleza, joias, presentes",
    fonte: "playfair",
    principal: "#7f1d4a",
    destaque: "#f3c9d8",
    cartao: "suave",
    hero: "dividido",
    heroAlinha: "esquerda",
    heroTom: "papel",
    cabecalho: "centro",
    produto: "empilhada",
    raio: "20px",
    fundo: "color-mix(in srgb, var(--loja-principal) 6%, #ffffff)",
    busca: false,
    menu: true,
    secoes: ["banner", "colecoes", "destaques", "sobre", "mais_vendidos", "todos_produtos", "faq", "trocas_entrega"],
  },
  fabrica: {
    rotulo: "Fábrica",
    dica: "Denso e objetivo: muitos itens por tela, preço em evidência.",
    nichos: "Atacado, eletrônicos, peças",
    fonte: "space_grotesk",
    principal: "#0b3b8c",
    destaque: "#ffd100",
    cartao: "denso",
    hero: "faixa",
    heroAlinha: "esquerda",
    heroTom: "papel",
    cabecalho: "marca",
    produto: "denso",
    raio: "2px",
    fundo: "#f4f5f7",
    busca: true,
    menu: true,
    secoes: ["banner", "mais_vendidos", "todos_produtos", "faq", "trocas_entrega", "sobre"],
  },
  digital: {
    rotulo: "Digital",
    dica: "Capas largas e página de produto focada. Para cursos, e-books e kits.",
    nichos: "Produtos digitais, cursos",
    fonte: "outfit",
    principal: "#12304a",
    destaque: "#38bdf8",
    cartao: "capa",
    hero: "dividido",
    heroAlinha: "esquerda",
    heroTom: "marca",
    cabecalho: "claro",
    produto: "centrada",
    raio: "12px",
    fundo: "#ffffff",
    busca: false,
    menu: false,
    secoes: ["banner", "destaques", "video", "todos_produtos", "faq", "sobre", "trocas_entrega"],
  },
} as const satisfies Record<string, ModeloConfig>;
export type ModeloLoja = keyof typeof MODELOS_LOJA;
export const LISTA_MODELOS = Object.keys(MODELOS_LOJA) as ModeloLoja[];
export const configModelo = (m: ModeloLoja): ModeloConfig => MODELOS_LOJA[m];

// variáveis CSS que cada modelo define (raio dos cantos e cor do fundo da página)
export const varsDoModelo = (m: ModeloLoja): Record<string, string> => ({
  "--loja-raio": MODELOS_LOJA[m].raio,
  "--loja-fundo": MODELOS_LOJA[m].fundo,
});

export type SecaoTema = { tipo: TipoSecao; visivel: boolean };
export type BannerTema = {
  imagem: string | null; // computador
  celular: string | null;
  frase: string | null;
  alt: string | null;
  produto: string | null;
  url: string | null;
};
export type TemaLoja = {
  versao: 2;
  modelo: ModeloLoja;
  secoes: SecaoTema[];
  destaques: string[]; // ids de itens da própria loja (até 8)
  banners: BannerTema[];
  anuncio: { visivel: boolean; texto: string | null; url: string | null };
  cabecalho: { busca: boolean; menu: boolean; links: { rotulo: string; url: string }[] };
  colecoes: { categoria: string; imagem: string | null }[];
  sobre: { titulo: string | null; texto: string | null; imagem: string | null };
  video: { plataforma: "youtube" | "vimeo"; id: string; titulo: string | null } | null;
  faq: { p: string; r: string }[];
  rodape: {
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    youtube: string | null;
    whatsapp: string | null;
    links: { rotulo: string; url: string }[];
  };
};

export const MAX_DESTAQUES = 8;
export const MAX_BANNERS = 5;
export const MAX_FRASE_BANNER = 80;
export const MAX_FAQ = 8;
export const MAX_LINKS = 4;

const ordem = (visiveis: readonly TipoSecao[]): SecaoTema[] => [
  ...visiveis.map((tipo) => ({ tipo, visivel: true })),
  ...TIPOS_SECAO.filter((t) => !visiveis.includes(t)).map((tipo) => ({ tipo, visivel: false })),
];
export const secoesDoModelo = (modelo: ModeloLoja): SecaoTema[] => ordem(MODELOS_LOJA[modelo].secoes);

export const REDES = ["instagram", "facebook", "tiktok", "youtube"] as const;
export const urlDaRede = (rede: (typeof REDES)[number], usuario: string) =>
  ({
    instagram: `https://instagram.com/${usuario}`,
    facebook: `https://facebook.com/${usuario}`,
    tiktok: `https://tiktok.com/@${usuario}`,
    youtube: `https://youtube.com/@${usuario}`,
  })[rede];

export const temaDoModelo = (modelo: ModeloLoja): TemaLoja => ({
  versao: 2,
  modelo,
  secoes: secoesDoModelo(modelo),
  destaques: [],
  banners: [],
  anuncio: { visivel: false, texto: null, url: null },
  cabecalho: { busca: MODELOS_LOJA[modelo].busca, menu: MODELOS_LOJA[modelo].menu, links: [] },
  colecoes: [],
  sobre: { titulo: null, texto: null, imagem: null },
  video: null,
  faq: [],
  rodape: { instagram: null, facebook: null, tiktok: null, youtube: null, whatsapp: null, links: [] },
});

// "Restaurar padrão do modelo": volta ordem dos blocos, cabeçalho e visibilidade ao padrão;
// o conteúdo que a loja escreveu (banners, textos, perguntas, destaques) fica.
export const restaurarModelo = (t: TemaLoja, modelo: ModeloLoja = t.modelo): TemaLoja => {
  const base = temaDoModelo(modelo);
  return { ...t, modelo, secoes: base.secoes, cabecalho: { ...base.cabecalho, links: t.cabecalho.links } };
};

// O "layout" antigo (grade, destaque, lista) vira um modelo; e vice-versa
// (a coluna antiga continua preenchida, para compatibilidade).
const LAYOUT_PARA_MODELO: Record<string, ModeloLoja> = { grade: "classico", destaque: "vitrine", lista: "editorial" };
const MODELO_PARA_LAYOUT: Record<ModeloLoja, string> = {
  classico: "grade",
  vitrine: "destaque",
  catalogo: "grade",
  editorial: "lista",
  minimal: "grade",
  boutique: "lista",
  fabrica: "grade",
  digital: "destaque",
};
export const layoutLegado = (m: ModeloLoja) => MODELO_PARA_LAYOUT[m];

// ---------- vídeo: só YouTube e Vimeo; guarda a plataforma e o código ----------
export function lerVideo(url: string): { plataforma: "youtube" | "vimeo"; id: string } | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const yt = (id: string | null | undefined) => (id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { plataforma: "youtube" as const, id } : null);
  if (host === "youtu.be") return yt(u.pathname.split("/")[1]);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, tipo, id] = u.pathname.split("/");
    if (tipo === "watch") return yt(u.searchParams.get("v"));
    if (tipo === "embed" || tipo === "shorts" || tipo === "live") return yt(id);
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).find((p) => /^[0-9]{5,12}$/.test(p));
    return id ? { plataforma: "vimeo", id } : null;
  }
  return null;
}
export const urlDoVideo = (v: { plataforma: "youtube" | "vimeo"; id: string }) =>
  v.plataforma === "youtube" ? `https://www.youtube.com/watch?v=${v.id}` : `https://vimeo.com/${v.id}`;
export const urlDoPlayer = (v: { plataforma: "youtube" | "vimeo"; id: string }) =>
  v.plataforma === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`
    : `https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1`;

// ---------- validação ----------
const ehTexto = (v: unknown): v is string => typeof v === "string";
const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// mesma regra do banco (caminho_valido): "<uuid do dono>/<arquivo>", sem subpastas nem ".."
const CAMINHO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/;
const URL_HTTPS = /^https:\/\/[^\s<>"']{3,200}$/;
const USUARIO = /^[A-Za-z0-9._]{1,40}$/;

export type ResultadoTema = { ok: true; tema: TemaLoja } | { ok: false; erro: string };
class ErroTema extends Error {}
const erro = (m: string): never => {
  throw new ErroTema(m);
};

const texto = (v: unknown, max: number, msg: string): string | null => {
  if (v == null) return null;
  if (!ehTexto(v)) return erro(msg);
  const t = v.trim();
  if (t.length > max) return erro(msg);
  return t || null;
};
const imagem = (v: unknown, msg = "Envie a imagem de novo."): string | null => {
  if (v == null || v === "") return null;
  return ehTexto(v) && CAMINHO.test(v) ? v : erro(msg);
};
const link = (v: unknown, msg: string): string | null => {
  const t = texto(v, 200, msg);
  return t === null ? null : URL_HTTPS.test(t) ? t : erro(msg);
};
const idItem = (v: unknown, msg: string): string | null => {
  if (v == null || v === "") return null;
  return ehTexto(v) && UUID.test(v) ? v : erro(msg);
};
const lista = (v: unknown, max: number, msg: string): unknown[] => {
  if (v == null) return [];
  return Array.isArray(v) && v.length <= max ? v : erro(msg);
};
const objeto = (v: unknown, msg: string): Record<string, unknown> => (v == null ? {} : ehObjeto(v) ? v : erro(msg));
const links = (v: unknown, msg: string) =>
  lista(v, MAX_LINKS, `Use até ${MAX_LINKS} links.`).flatMap((l) => {
    const o = objeto(l, msg);
    const rotulo = texto(o.rotulo, 30, "O nome do link pode ter até 30 letras.");
    const url = link(o.url, "O link precisa começar com https://");
    if (!rotulo && !url) return [];
    if (!rotulo || !url) return erro("Complete o nome e o link, ou apague a linha.");
    return [{ rotulo, url }];
  });
const usuario = (v: unknown, rede: string): string | null => {
  const t = texto(v, 80, `Confira o usuário do ${rede}.`)?.replace(/^@/, "") ?? null;
  return t === null ? null : USUARIO.test(t) ? t : erro(`Confira o usuário do ${rede}: só letras, números, ponto e sublinhado.`);
};

// Conferência estrita (servidor, antes de gravar). Devolve o tema já limpo.
export function validarTemaLoja(entrada: unknown): ResultadoTema {
  try {
    if (!ehObjeto(entrada)) return erro("Tema da loja inválido.");
    const { modelo, secoes } = entrada;
    if (!ehTexto(modelo) || !Object.hasOwn(MODELOS_LOJA, modelo)) return erro(`Escolha um dos ${LISTA_MODELOS.length} modelos.`);
    const padrao = temaDoModelo(modelo as ModeloLoja);

    if (!Array.isArray(secoes) || secoes.length < 1 || secoes.length > TIPOS_SECAO.length) return erro("Confira a lista de blocos.");
    const vistos = new Set<string>();
    const secoesOk: SecaoTema[] = secoes.map((s) => {
      if (!ehObjeto(s) || !ehTexto(s.tipo) || !Object.hasOwn(SECOES_LOJA, s.tipo) || typeof s.visivel !== "boolean") return erro("Confira a lista de blocos.");
      if (vistos.has(s.tipo)) return erro("Um bloco aparece duas vezes.");
      vistos.add(s.tipo);
      return { tipo: s.tipo as TipoSecao, visivel: s.visivel };
    });

    const destaques = lista(entrada.destaques, MAX_DESTAQUES, `Escolha até ${MAX_DESTAQUES} produtos em destaque.`);
    if (!destaques.every((d) => ehTexto(d) && UUID.test(d)) || new Set(destaques).size !== destaques.length) return erro("Confira os produtos em destaque.");

    // banners (v2) e banner único (formato antigo, vira o primeiro banner)
    const banners: BannerTema[] = lista(entrada.banners, MAX_BANNERS, `Use até ${MAX_BANNERS} banners.`).map((b) => {
      const o = objeto(b, "Confira os banners.");
      return {
        imagem: imagem(o.imagem, "Envie a imagem do banner de novo."),
        celular: imagem(o.celular, "Envie a imagem do banner para celular de novo."),
        frase: texto(o.frase, MAX_FRASE_BANNER, `A frase do banner pode ter até ${MAX_FRASE_BANNER} letras.`),
        alt: texto(o.alt, 120, "A descrição da imagem pode ter até 120 letras."),
        produto: idItem(o.produto, "Confira o produto do banner."),
        url: link(o.url, "O link do banner precisa começar com https://"),
      };
    });
    const antigo = objeto(entrada.banner, "Confira o banner.");
    const legado: BannerTema = {
      imagem: imagem(antigo.imagem, "Envie a imagem do banner de novo."),
      celular: null,
      frase: texto(antigo.frase, MAX_FRASE_BANNER, `A frase do banner pode ter até ${MAX_FRASE_BANNER} letras.`),
      alt: null,
      produto: idItem(antigo.produto, "Confira o produto do banner."),
      url: null,
    };
    if (banners.length === 0 && (legado.imagem || legado.frase)) banners.push(legado);
    const bannersOk = banners.filter((b) => b.imagem || b.frase);

    const a = objeto(entrada.anuncio, "Confira a faixa de anúncio.");
    const anuncio = { visivel: a.visivel === true, texto: texto(a.texto, 100, "O anúncio pode ter até 100 letras."), url: link(a.url, "O link do anúncio precisa começar com https://") };
    if (anuncio.visivel && !anuncio.texto) anuncio.visivel = false;

    const c = objeto(entrada.cabecalho, "Confira o cabeçalho.");
    const cabecalho = {
      busca: ehObjeto(entrada.cabecalho) ? c.busca === true : padrao.cabecalho.busca,
      menu: ehObjeto(entrada.cabecalho) ? c.menu === true : padrao.cabecalho.menu,
      links: links(c.links, "Confira o cabeçalho."),
    };

    const colecoes = lista(entrada.colecoes, 8, "Confira as coleções.").map((x) => {
      const o = objeto(x, "Confira as coleções.");
      const categoria = ehTexto(o.categoria) && /^[a-z0-9_]{1,40}$/.test(o.categoria) ? o.categoria : erro("Confira as coleções.");
      return { categoria, imagem: imagem(o.imagem, "Envie a imagem da coleção de novo.") };
    });

    const so = objeto(entrada.sobre, "Confira o bloco Sobre a marca.");
    const sobre = {
      titulo: texto(so.titulo, 60, "O título do Sobre pode ter até 60 letras."),
      texto: texto(so.texto, 800, "O texto do Sobre pode ter até 800 letras."),
      imagem: imagem(so.imagem, "Envie a imagem do Sobre de novo."),
    };

    let video: TemaLoja["video"] = null;
    if (entrada.video != null) {
      const o = objeto(entrada.video, "Confira o vídeo.");
      const ok = (o.plataforma === "youtube" && ehTexto(o.id) && /^[A-Za-z0-9_-]{11}$/.test(o.id)) || (o.plataforma === "vimeo" && ehTexto(o.id) && /^[0-9]{5,12}$/.test(o.id));
      if (!ok) return erro("Use um link do YouTube ou do Vimeo.");
      video = { plataforma: o.plataforma as "youtube" | "vimeo", id: o.id as string, titulo: texto(o.titulo, 80, "O título do vídeo pode ter até 80 letras.") };
    }

    const faq = lista(entrada.faq, MAX_FAQ, `Use até ${MAX_FAQ} perguntas.`).flatMap((x) => {
      const o = objeto(x, "Confira as perguntas.");
      const p = texto(o.p, 120, "A pergunta pode ter até 120 letras.");
      const r = texto(o.r, 600, "A resposta pode ter até 600 letras.");
      if (!p && !r) return [];
      if (!p || !r) return erro("Complete a pergunta e a resposta, ou apague a linha.");
      return [{ p, r }];
    });

    const r = objeto(entrada.rodape, "Confira o rodapé.");
    let whatsapp: string | null = null;
    if (r.whatsapp != null && String(r.whatsapp).trim() !== "") {
      let n = String(r.whatsapp).replace(/\D/g, "");
      if (n.length === 10 || n.length === 11) n = `55${n}`;
      whatsapp = /^[0-9]{10,13}$/.test(n) ? n : erro("Confira o WhatsApp: DDD e número.");
    }
    const rodape = {
      instagram: usuario(r.instagram, "Instagram"),
      facebook: usuario(r.facebook, "Facebook"),
      tiktok: usuario(r.tiktok, "TikTok"),
      youtube: usuario(r.youtube, "YouTube"),
      whatsapp,
      links: links(r.links, "Confira o rodapé."),
    };

    return {
      ok: true,
      tema: {
        versao: 2,
        modelo: modelo as ModeloLoja,
        secoes: secoesOk,
        destaques: destaques as string[],
        banners: bannersOk,
        anuncio,
        cabecalho,
        colecoes,
        sobre,
        video,
        faq,
        rodape,
      },
    };
  } catch (e) {
    if (e instanceof ErroTema) return { ok: false, erro: e.message };
    throw e;
  }
}

// Leitura tolerante (páginas públicas e editor): nunca quebra a loja.
// Sem tema salvo, o "layout" antigo vira o modelo. Blocos que faltam entram ocultos.
export function lerTemaLoja(json: unknown, layout?: string | null): TemaLoja {
  const v = json == null ? null : validarTemaLoja(json);
  if (!v || !v.ok) return temaDoModelo(LAYOUT_PARA_MODELO[layout ?? ""] ?? "classico");
  const faltam = TIPOS_SECAO.filter((t) => !v.tema.secoes.some((s) => s.tipo === t));
  return { ...v.tema, secoes: [...v.tema.secoes, ...faltam.map((tipo) => ({ tipo, visivel: false }))] };
}
