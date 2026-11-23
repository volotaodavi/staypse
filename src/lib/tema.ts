// Identidade visual das lojas e vitrines: cores, fonte e layout viram
// variáveis CSS (--loja-*). Também garante contraste mínimo WCAG AA (4,5:1)
// para textos, roda no servidor (páginas) e no navegador (prévia ao vivo).

export const FONTES_LOJA = {
  inter: "Inter",
  outfit: "Outfit",
  dm_sans: "DM Sans",
  playfair: "Playfair Display",
  space_grotesk: "Space Grotesk",
} as const;
export type FonteLoja = keyof typeof FONTES_LOJA;

export const LAYOUTS_LOJA = {
  grade: { rotulo: "Grade", dica: "Logo à esquerda e produtos em grade." },
  destaque: { rotulo: "Destaque", dica: "Primeiro produto em destaque no topo." },
  lista: { rotulo: "Centralizado", dica: "Logo e nome centralizados, fotos maiores." },
} as const;
export type LayoutLoja = keyof typeof LAYOUTS_LOJA;

// Padrão Staypse (usado quando a loja/afiliado não escolhe)
export const PADRAO = { principal: "#062c30", destaque: "#14d6c4", fonte: "outfit" as FonteLoja, layout: "grade" as LayoutLoja };

const BRANCO = "#ffffff";
// preto puro: com ele, TODA cor passa AA (4,5:1) com branco ou com preto
// (o pior caso fica em ~4,58:1). Com um "quase preto" isso deixa de valer.
const PRETO = "#000000";
export const AA = 4.5;

export const corValida = (c: string | null | undefined): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c);

// Luminância relativa (WCAG 2.x)
function luminancia(hex: string): number {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Texto que vai POR CIMA de uma cor (botão): preto ou branco, o que contrastar mais.
// Toda cor passa AA com um dos dois.
export const textoSobre = (fundo: string) => (contraste(fundo, BRANCO) >= contraste(fundo, PRETO) ? BRANCO : PRETO);

export type Tema = {
  vars: Record<string, string>;
  fonte: FonteLoja;
  layout: LayoutLoja;
  avisos: string[];
};

export function montarTema(op: {
  principal?: string | null;
  destaque?: string | null;
  fonte?: string | null;
  layout?: string | null;
}): Tema {
  const principal = corValida(op.principal) ? op.principal.toLowerCase() : PADRAO.principal;
  const destaque = corValida(op.destaque) ? op.destaque.toLowerCase() : PADRAO.destaque;
  const fonte = op.fonte && op.fonte in FONTES_LOJA ? (op.fonte as FonteLoja) : PADRAO.fonte;
  const layout = op.layout && op.layout in LAYOUTS_LOJA ? (op.layout as LayoutLoja) : PADRAO.layout;
  const avisos: string[] = [];

  // Links e preços em cor sobre fundo branco: se a cor for clara demais, usa quase-preto
  const passaNoBranco = contraste(principal, BRANCO) >= AA;
  if (!passaNoBranco) {
    avisos.push(
      `A cor principal tem contraste ${contraste(principal, BRANCO).toFixed(1)}:1 com o fundo branco (mínimo ${AA}:1). ` +
        "Nos textos e links usamos preto; a cor continua nos botões.",
    );
  }
  const textoBotao = textoSobre(principal);
  const textoDestaque = textoSobre(destaque);
  if (contraste(principal, textoBotao) < AA) {
    avisos.push("O texto dos botões pode ficar difícil de ler com essa cor. Escolha um tom mais claro ou mais escuro.");
  }

  return {
    fonte,
    layout,
    avisos,
    vars: {
      "--loja-principal": principal,
      "--loja-principal-texto": textoBotao,
      "--loja-link": passaNoBranco ? principal : PRETO,
      "--loja-destaque": destaque,
      "--loja-destaque-texto": textoDestaque,
      "--loja-fonte": `var(--fonte-${fonte.replace("_", "-")}), system-ui, sans-serif`,
    },
  };
}
