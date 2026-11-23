// Regras de anúncios pagos para afiliados e vendedores da loja.
// Texto único: aparece nos Termos de uso (seção "Anúncios pagos") e no resumo
// do catálogo. Ao mudar, troque TERMOS_VERSAO em src/config/empresa.ts.

export const PLATAFORMAS_ANUNCIO = "Meta, Google e TikTok";

export const ANUNCIO_PERMITIDO = `Você pode anunciar nos canais pagos (${PLATAFORMAS_ANUNCIO}) apontando para o seu link de indicação.`;

export const ANUNCIO_PROIBIDO = [
  "comprar a marca ou o nome da loja como palavra-chave em buscadores (por exemplo, no Google);",
  "se passar pela loja, ou criar página, perfil ou anúncio que pareça ser da loja;",
  "prometer desconto, brinde, frete grátis ou prazo que a loja não oferece;",
  "usar a marca Staypse como se fosse a loja ou como se a Staypse vendesse o produto.",
] as const;

export const ANUNCIO_REGRA_DA_LOJA =
  "Cada loja pode ter regras mais restritas para um produto. Elas aparecem em “Regras de divulgação da loja”, no card do produto, e valem mais do que o resumo acima.";

export const ANUNCIO_IDENTIFICAR = "Deixe claro que o anúncio é uma indicação com comissão (por exemplo, “link de afiliado” ou “#publi”).";
