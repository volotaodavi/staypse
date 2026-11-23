// Motor de tema da loja: 4 MODELOS PRONTOS + seções, banner e destaques em JSON.
// Sem HTML nem CSS livre: tudo o que a loja pode escolher está listado aqui.
// As cores e a fonte continuam em lib/tema.ts (contraste AA automático).
// O mesmo formato é conferido no banco (função tema_loja_valido) e no servidor.

export const MODELOS_LOJA = {
  classico: { rotulo: "Clássico", dica: "Grade de produtos. Simples e direto." },
  vitrine: { rotulo: "Vitrine", dica: "Banner grande e produtos em destaque." },
  catalogo: { rotulo: "Catálogo", dica: "Lista compacta, boa para muitos produtos." },
  editorial: { rotulo: "Editorial", dica: "Fotos grandes, ótimo para moda e beleza." },
} as const;
export type ModeloLoja = keyof typeof MODELOS_LOJA;
export const LISTA_MODELOS = Object.keys(MODELOS_LOJA) as ModeloLoja[];

export const SECOES_LOJA = {
  banner: { rotulo: "Banner", dica: "Imagem grande com uma frase." },
  destaques: { rotulo: "Produtos em destaque", dica: "Os produtos que você escolher." },
  mais_vendidos: { rotulo: "Mais vendidos", dica: "Os que mais saíram nos últimos 30 dias." },
  todos_produtos: { rotulo: "Todos os produtos", dica: "A vitrine completa." },
  categorias: { rotulo: "Categorias", dica: "Produtos separados por categoria." },
  sobre: { rotulo: "Sobre a loja", dica: "Sua descrição e quem vende." },
  trocas_entrega: { rotulo: "Trocas e entrega", dica: "Direito de desistência e prazos." },
} as const;
export type TipoSecao = keyof typeof SECOES_LOJA;
export const TIPOS_SECAO = Object.keys(SECOES_LOJA) as TipoSecao[];

export type SecaoTema = { tipo: TipoSecao; visivel: boolean };
export type TemaLoja = {
  modelo: ModeloLoja;
  secoes: SecaoTema[];
  destaques: string[]; // ids de itens da própria loja (até 8)
  banner: { imagem: string | null; frase: string | null; produto: string | null };
};

export const MAX_DESTAQUES = 8;
export const MAX_FRASE_BANNER = 80;

// ---------- predefinições: mesma lista de seções, ordem e visibilidade mudam ----------
const ordem = (visiveis: TipoSecao[]): SecaoTema[] => [
  ...visiveis.map((tipo) => ({ tipo, visivel: true })),
  ...TIPOS_SECAO.filter((t) => !visiveis.includes(t)).map((tipo) => ({ tipo, visivel: false })),
];

const PREDEFINICOES: Record<ModeloLoja, TipoSecao[]> = {
  classico: ["todos_produtos", "sobre", "trocas_entrega"],
  vitrine: ["banner", "destaques", "mais_vendidos", "todos_produtos", "sobre", "trocas_entrega"],
  catalogo: ["categorias", "todos_produtos", "sobre", "trocas_entrega"],
  editorial: ["banner", "destaques", "todos_produtos", "sobre", "trocas_entrega"],
};

export function secoesDoModelo(modelo: ModeloLoja): SecaoTema[] {
  return ordem(PREDEFINICOES[modelo]);
}

export const temaDoModelo = (modelo: ModeloLoja): TemaLoja => ({
  modelo,
  secoes: secoesDoModelo(modelo),
  destaques: [],
  banner: { imagem: null, frase: null, produto: null },
});

// O "layout" antigo (grade, destaque, lista) vira um modelo; e vice-versa
// (a coluna antiga continua preenchida, para compatibilidade).
const LAYOUT_PARA_MODELO: Record<string, ModeloLoja> = { grade: "classico", destaque: "vitrine", lista: "editorial" };
const MODELO_PARA_LAYOUT: Record<ModeloLoja, string> = { classico: "grade", vitrine: "destaque", catalogo: "grade", editorial: "lista" };
export const layoutLegado = (m: ModeloLoja) => MODELO_PARA_LAYOUT[m];

const ehTexto = (v: unknown): v is string => typeof v === "string";
const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// mesma regra do banco (caminho_valido): "<uuid do dono>/<arquivo>", sem subpastas nem ".."
const CAMINHO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/;

export type ResultadoTema = { ok: true; tema: TemaLoja } | { ok: false; erro: string };

// Conferência estrita (servidor, antes de gravar). Devolve o tema já limpo.
export function validarTemaLoja(entrada: unknown): ResultadoTema {
  const falha = (erro: string): ResultadoTema => ({ ok: false, erro });
  if (!ehObjeto(entrada)) return falha("Tema da loja inválido.");
  const { modelo, secoes, destaques, banner } = entrada;
  if (!ehTexto(modelo) || !Object.hasOwn(MODELOS_LOJA, modelo)) return falha("Escolha um dos 4 modelos.");

  if (!Array.isArray(secoes) || secoes.length < 1 || secoes.length > TIPOS_SECAO.length) return falha("Confira a lista de seções.");
  const vistos = new Set<string>();
  const secoesOk: SecaoTema[] = [];
  for (const s of secoes) {
    if (!ehObjeto(s) || !ehTexto(s.tipo) || !Object.hasOwn(SECOES_LOJA, s.tipo) || typeof s.visivel !== "boolean") {
      return falha("Confira a lista de seções.");
    }
    if (vistos.has(s.tipo)) return falha("Uma seção aparece duas vezes.");
    vistos.add(s.tipo);
    secoesOk.push({ tipo: s.tipo as TipoSecao, visivel: s.visivel });
  }

  const listaDestaques = destaques ?? [];
  if (!Array.isArray(listaDestaques) || listaDestaques.length > MAX_DESTAQUES) return falha(`Escolha até ${MAX_DESTAQUES} produtos em destaque.`);
  if (!listaDestaques.every((d) => ehTexto(d) && UUID.test(d)) || new Set(listaDestaques).size !== listaDestaques.length) {
    return falha("Confira os produtos em destaque.");
  }

  const b = banner ?? {};
  if (!ehObjeto(b)) return falha("Confira o banner.");
  const imagem = b.imagem == null || b.imagem === "" ? null : b.imagem;
  const frase = b.frase == null ? null : b.frase;
  const produto = b.produto == null || b.produto === "" ? null : b.produto;
  if (imagem !== null && (!ehTexto(imagem) || !CAMINHO.test(imagem))) return falha("Envie a imagem do banner de novo.");
  if (frase !== null && (!ehTexto(frase) || frase.trim().length > MAX_FRASE_BANNER)) return falha(`A frase do banner pode ter até ${MAX_FRASE_BANNER} letras.`);
  if (produto !== null && (!ehTexto(produto) || !UUID.test(produto))) return falha("Confira o produto do banner.");

  return {
    ok: true,
    tema: {
      modelo: modelo as ModeloLoja,
      secoes: secoesOk,
      destaques: listaDestaques as string[],
      banner: { imagem, frase: frase?.trim() || null, produto },
    },
  };
}

// Leitura tolerante (páginas públicas e editor): nunca quebra a loja.
// Sem tema salvo, o "layout" antigo vira o modelo. Seções que faltam entram ocultas.
export function lerTemaLoja(json: unknown, layout?: string | null): TemaLoja {
  const v = json == null ? null : validarTemaLoja(json);
  if (!v || !v.ok) return temaDoModelo(LAYOUT_PARA_MODELO[layout ?? ""] ?? "classico");
  const faltam = TIPOS_SECAO.filter((t) => !v.tema.secoes.some((s) => s.tipo === t));
  return { ...v.tema, secoes: [...v.tema.secoes, ...faltam.map((tipo) => ({ tipo, visivel: false }))] };
}
