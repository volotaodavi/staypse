// Listas e regras das vitrines (revendedor) e lojas (produtor), usadas no
// navegador e no servidor. As listas fechadas espelham as regras do banco
// (migração 20261120000001), ao mudar aqui, mude lá também.

export const NICHOS_VITRINE = [
  { valor: "moda", rotulo: "Moda" },
  { valor: "beleza", rotulo: "Beleza" },
  { valor: "casa", rotulo: "Casa" },
  { valor: "fitness", rotulo: "Fitness" },
  { valor: "cursos", rotulo: "Cursos" },
  { valor: "ingressos", rotulo: "Ingressos" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export const ROTULO_NICHO_VITRINE: Record<string, string> = Object.fromEntries(
  NICHOS_VITRINE.map((n) => [n.valor, n.rotulo]),
);

// Visual da vitrine: padrão Staypse (petróleo/ciano, Outfit) ou "minhas cores"
// (cor principal + foto/logo do afiliado). O contraste é ajustado em lib/tema.ts.
export const MODELOS_VISUAIS = {
  staypse: { rotulo: "Usar padrão Staypse", dica: "Petróleo, ciano e a fonte Outfit." },
  proprio: { rotulo: "Minhas cores", dica: "Sua cor principal e sua foto ou logo." },
} as const;
export type ModeloVisual = keyof typeof MODELOS_VISUAIS;

export const PLATAFORMAS: Record<string, string> = {
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  tiktok_shop: "TikTok Shop",
  outra: "Outro site",
};

export const ROTULO_TIPO: Record<string, string> = { fisico: "Produto físico", digital: "Produto digital" };

// Palavras que não podem virar endereço (rotas do site). Cópia da lista do
// banco (slug_reservado) só para avisar antes de enviar; o banco é quem garante.
const RESERVADOS = new Set([
  "admin", "api", "auth", "entrar", "sair", "cadastro", "cadastrar", "conta",
  "painel", "produtor", "produtores", "revendedor", "revendedores", "vitrine",
  "vitrines", "marketplace", "loja", "lojas", "produtos", "produto", "itens", "item",
  "carrinho", "checkout", "pagamento", "pedido", "pedidos", "termos",
  "privacidade", "lgpd", "ajuda", "suporte", "contato", "sobre", "blog",
  "staypse", "brand", "static", "public", "_next", "www", "app", "login",
  "lista", "obrigado", "indicacao", "indicar", "espera",
  "produtos-proibidos", "proibidos", "contrato-produtor", "contrato",
  "v", "p", "afiliado", "afiliados", "catalogo", "links", "minha-loja",
]);

// "Ana Cosméticos!" → "ana-cosmeticos"
export function sugerirSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

// Devolve a mensagem de erro, ou null se o endereço é válido.
export function problemaNoSlug(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
    return "Use de 3 a 40 caracteres: letras minúsculas, números e hífen (sem hífen no começo ou no fim).";
  }
  if (RESERVADOS.has(slug)) return "Esse endereço é reservado pelo site. Escolha outro.";
  return null;
}

// Estimativa do que o revendedor recebe por venda: a comissão cheia (a taxa da plataforma
// é paga pela loja, não por quem indica).
export function estimativaComissao(precoCentavos: number, percentual: number): number {
  return Math.floor((precoCentavos * percentual) / 100);
}

// ---------------------------------------------------------------------------
// Organização da vitrine: destaques, coleções e ordem manual.
// Espelha storefronts.organizacao (migração 20261201000001): ao mudar os
// limites aqui, mude lá também. O banco é quem garante; isto serve para
// avisar antes de enviar e para montar a página pública.
// ---------------------------------------------------------------------------
export const LIMITE_DESTAQUES = 4;
export const LIMITE_COLECOES = 6;
export const LIMITE_NOME_COLECAO = 40;

export type Colecao = { nome: string; itens: string[] };
export type OrganizacaoVitrine = { destaques: string[]; colecoes: Colecao[]; ordem: string[] };

const ORGANIZACAO_VAZIA: OrganizacaoVitrine = { destaques: [], colecoes: [], ordem: [] };

const listaDeIds = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))] : [];

// Lê o JSON vindo do banco com tolerância: o que não faz sentido vira vazio.
export function lerOrganizacao(bruto: unknown): OrganizacaoVitrine {
  if (!bruto || typeof bruto !== "object") return ORGANIZACAO_VAZIA;
  const o = bruto as Record<string, unknown>;
  const colecoes: Colecao[] = Array.isArray(o.colecoes)
    ? o.colecoes
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
        .map((c) => ({ nome: typeof c.nome === "string" ? c.nome : "", itens: listaDeIds(c.itens) }))
        .filter((c) => c.nome.trim() !== "")
        .slice(0, LIMITE_COLECOES)
    : [];
  return { destaques: listaDeIds(o.destaques).slice(0, LIMITE_DESTAQUES), colecoes, ordem: listaDeIds(o.ordem) };
}

// Confere o que o afiliado montou (mesmas regras do banco). Devolve a mensagem
// de erro ou null.
export function problemaNaOrganizacao(o: OrganizacaoVitrine): string | null {
  if (o.destaques.length > LIMITE_DESTAQUES) return `Escolha no máximo ${LIMITE_DESTAQUES} destaques.`;
  if (o.colecoes.length > LIMITE_COLECOES) return `Você pode ter no máximo ${LIMITE_COLECOES} coleções.`;
  const nomes = new Set<string>();
  for (const c of o.colecoes) {
    const nome = c.nome.trim();
    if (nome.length < 1) return "Dê um nome a cada coleção.";
    if (nome.length > LIMITE_NOME_COLECAO) return `O nome da coleção pode ter até ${LIMITE_NOME_COLECAO} letras.`;
    if (nomes.has(nome.toLowerCase())) return "Duas coleções não podem ter o mesmo nome.";
    nomes.add(nome.toLowerCase());
  }
  return null;
}

// Move o elemento da posição i uma casa para cima (-1) ou para baixo (+1).
export function mover<T>(lista: T[], i: number, passo: -1 | 1): T[] {
  const j = i + passo;
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

// Ordena itens pela lista manual de ids: quem está na lista vem primeiro, na
// ordem dela; os demais mantêm a ordem em que entraram na vitrine. Ids que não
// existem mais (item saiu do ar) são ignorados.
export function ordenarPorLista<T extends { id: string }>(itens: T[], ids: string[]): T[] {
  const posicao = new Map(ids.map((id, i) => [id, i]));
  const com = itens.filter((i) => posicao.has(i.id)).sort((a, b) => posicao.get(a.id)! - posicao.get(b.id)!);
  return [...com, ...itens.filter((i) => !posicao.has(i.id))];
}

// Monta o que a vitrine pública mostra. "itens" são só os itens ativos
// (itens_da_vitrine), então tudo que saiu do ar some aqui sozinho.
export function organizarVitrine<T extends { id: string }>(itens: T[], organizacao: unknown) {
  const org = lerOrganizacao(organizacao);
  const porId = new Map(itens.map((i) => [i.id, i]));
  const pegar = (ids: string[]) => ids.map((id) => porId.get(id)).filter((i): i is T => Boolean(i));
  return {
    destaques: pegar(org.destaques),
    colecoes: org.colecoes
      .map((c) => ({ nome: c.nome, itens: pegar(c.itens) }))
      .filter((c) => c.itens.length > 0),
    todos: ordenarPorLista(itens, org.ordem),
  };
}
