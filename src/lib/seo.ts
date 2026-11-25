// SEO compartilhado: textos-base e montagem dos dados estruturados (JSON-LD).
// Só entra aqui o que existe de verdade na página: nada de avaliação ou
// número que a Staypse não tenha.
import { urlDoSite } from "@/lib/supabase/env";

export const INSTAGRAM_STAYPSE = "https://www.instagram.com/staypse/";

export const PALAVRAS_CHAVE = [
  "plataforma de afiliados",
  "vender com afiliados",
  "loja online com afiliados",
  "split de pagamento",
  "marketplace de afiliados",
  "programa de afiliados para lojas",
  "afiliados de produtos físicos",
];

// corta no limite sem quebrar palavra e sem reticências estranhas
export function limitar(texto: string, max: number) {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return `${corte.slice(0, corte.lastIndexOf(" ") > max * 0.6 ? corte.lastIndexOf(" ") : corte.length).replace(/[,.;:\s]+$/, "")}…`;
}

export function dadosOrganizacao() {
  const base = urlDoSite();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organizacao`,
        name: "Staypse",
        url: base,
        logo: `${base}/brand/staypse-icone-app-512px.png`,
        description: "Plataforma de afiliados para produtos físicos e digitais, com divisão automática do pagamento.",
        sameAs: [INSTAGRAM_STAYPSE],
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#site`,
        url: base,
        name: "Staypse",
        inLanguage: "pt-BR",
        publisher: { "@id": `${base}/#organizacao` },
      },
    ],
  };
}

export function dadosFaq(perguntas: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "pt-BR",
    mainEntity: perguntas.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
  };
}

export function dadosMigalhas(itens: { nome: string; caminho: string }[]) {
  const base = urlDoSite();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.nome, item: `${base}${m.caminho}` })),
  };
}

type LojaSeo = { nome: string; slug: string; descricao: string | null; cidade: string | null; uf: string | null; email: string | null; endereco: string | null; imagem?: string };

export function dadosLoja(l: LojaSeo) {
  const base = urlDoSite();
  const endereco =
    l.cidade || l.uf
      ? { "@type": "PostalAddress", ...(l.endereco ? { streetAddress: l.endereco } : {}), ...(l.cidade ? { addressLocality: l.cidade } : {}), ...(l.uf ? { addressRegion: l.uf } : {}), addressCountry: "BR" }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${base}/loja/${l.slug}#loja`,
    name: l.nome,
    url: `${base}/loja/${l.slug}`,
    ...(l.descricao ? { description: limitar(l.descricao, 300) } : {}),
    ...(l.imagem ? { image: l.imagem } : {}),
    ...(l.email ? { email: l.email } : {}),
    ...(endereco ? { address: endereco } : {}),
  };
}

type ProdutoSeo = {
  nome: string;
  slug: string;
  lojaSlug: string;
  lojaNome: string;
  descricao: string | null;
  fotos: string[];
  precoCentavos: number;
  fisico: boolean;
  categoria: string | null;
  comprasAbertas: boolean;
};

export function dadosProduto(p: ProdutoSeo) {
  const url = `${urlDoSite()}/loja/${p.lojaSlug}/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#produto`,
    name: p.nome,
    url,
    ...(p.descricao ? { description: limitar(p.descricao, 500) } : {}),
    ...(p.fotos.length ? { image: p.fotos } : {}),
    ...(p.categoria ? { category: p.categoria } : {}),
    brand: { "@type": "Brand", name: p.lojaNome },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "BRL",
      price: (p.precoCentavos / 100).toFixed(2),
      // checkout fechado = pré-venda; aberto = disponível
      availability: p.comprasAbertas ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      ...(p.fisico ? { itemCondition: "https://schema.org/NewCondition" } : {}),
      seller: { "@type": "Organization", name: p.lojaNome, url: `${urlDoSite()}/loja/${p.lojaSlug}` },
    },
  };
}
