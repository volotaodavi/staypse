// Listas e regras das vitrines (revendedor) e lojas (produtor), usadas no
// navegador e no servidor. As listas fechadas espelham as regras do banco
// (migração 20261120000001) — ao mudar aqui, mude lá também.

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

// Os 3 modelos visuais: cores da marca no topo da vitrine.
// (nunca texto ciano sobre fundo claro — no modelo "ciano" o texto é petróleo)
export const MODELOS_VISUAIS = {
  petroleo: { rotulo: "Petróleo", topo: "bg-petroleo text-branco", detalhe: "text-gelo/80", selo: "bg-ciano text-petroleo" },
  gelo: { rotulo: "Gelo", topo: "bg-gelo text-petroleo", detalhe: "text-petroleo/70", selo: "bg-petroleo text-branco" },
  ciano: { rotulo: "Ciano", topo: "bg-ciano text-petroleo", detalhe: "text-petroleo/80", selo: "bg-petroleo text-branco" },
} as const;
export type ModeloVisual = keyof typeof MODELOS_VISUAIS;
export const modeloVisual = (m: string | null | undefined): ModeloVisual =>
  m && m in MODELOS_VISUAIS ? (m as ModeloVisual) : "petroleo";

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

// Estimativa do que o revendedor recebe por venda, ANTES das taxas
// (taxa da instituição de pagamento e da Staypse são descontadas no split).
export function estimativaComissao(precoCentavos: number, percentual: number): number {
  return Math.floor((precoCentavos * percentual) / 100);
}
