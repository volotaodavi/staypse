// Lê título, imagem e preço (Open Graph) de um link da Shopee, Mercado Livre
// ou TikTok Shop, para preencher o cartão "Minhas indicações".
//
// Segurança (o servidor busca um endereço digitado por alguém):
//  - só https e só os sites da lista abaixo (inclusive em cada redirecionamento);
//  - no máximo 5 s e 1,5 MB; nada de cookies;
//  - se algo falhar, o revendedor preenche à mão (fallback manual).
// O link SALVO é sempre o que o revendedor colou — nunca o endereço final.
import "server-only";

const SITES: { sufixo: string; plataforma: string }[] = [
  { sufixo: "shopee.com.br", plataforma: "shopee" },
  { sufixo: "shope.ee", plataforma: "shopee" },
  { sufixo: "mercadolivre.com.br", plataforma: "mercado_livre" },
  { sufixo: "mercadolivre.com", plataforma: "mercado_livre" },
  { sufixo: "mercadolibre.com", plataforma: "mercado_livre" },
  { sufixo: "meli.la", plataforma: "mercado_livre" },
  { sufixo: "tiktok.com", plataforma: "tiktok_shop" },
];

const LIMITE_BYTES = 1_500_000;
const MAX_REDIRECIONAMENTOS = 5;

// "produto.shopee.com.br" casa com "shopee.com.br"; "shopee.com.br.golpe.com" não.
export function plataformaDoLink(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
    const host = u.hostname.toLowerCase();
    return SITES.find((s) => host === s.sufixo || host.endsWith(`.${s.sufixo}`))?.plataforma ?? null;
  } catch {
    return null;
  }
}

export type Previa = { titulo?: string; imagem?: string; precoCentavos?: number };

export async function buscarPrevia(url: string): Promise<Previa | null> {
  if (!plataformaDoLink(url)) return null;
  const sinal = AbortSignal.timeout(5000);
  try {
    let atual = url;
    let resposta: Response | null = null;
    for (let i = 0; i <= MAX_REDIRECIONAMENTOS; i++) {
      resposta = await fetch(atual, {
        redirect: "manual",
        signal: sinal,
        cache: "no-store",
        headers: { "user-agent": "Mozilla/5.0 (compatible; StaypsePreview/1.0)", accept: "text/html" },
      });
      if (resposta.status >= 300 && resposta.status < 400) {
        const proximo = resposta.headers.get("location");
        if (!proximo) return null;
        atual = new URL(proximo, atual).toString();
        if (!plataformaDoLink(atual)) return null; // saiu dos sites permitidos
        continue;
      }
      break;
    }
    if (!resposta?.ok || !resposta.body) return null;
    if (!(resposta.headers.get("content-type") ?? "").includes("text/html")) return null;
    return lerMetas(await lerAte(resposta.body, LIMITE_BYTES));
  } catch {
    return null; // tempo esgotado, site fora do ar, bloqueio etc.
  }
}

// Lê o corpo até o limite (e para de baixar depois disso).
async function lerAte(corpo: ReadableStream<Uint8Array>, limite: number): Promise<string> {
  const leitor = corpo.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  while (total < limite) {
    const { done, value } = await leitor.read();
    if (done) break;
    partes.push(value);
    total += value.length;
  }
  await leitor.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(partes).subarray(0, limite));
}

function decodificar(t: string): string {
  return t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// Procura <meta property|name="..." content="..."> em qualquer ordem de atributos.
function meta(html: string, nomes: string[]): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const chave = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (chave && nomes.includes(chave)) {
      const valor = tag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
      if (valor) return decodificar(valor);
    }
  }
  return undefined;
}

export function lerMetas(html: string): Previa {
  const titulo = meta(html, ["og:title", "twitter:title"]) ?? decodificar(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const imagem = meta(html, ["og:image", "og:image:secure_url", "twitter:image"]);
  const preco = meta(html, ["og:price:amount", "product:price:amount", "price"]);
  const valor = preco ? Number(preco.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) : NaN;
  // título que é só o nome do site (página de bloqueio/genérica) não serve
  const generico = /^(mercado\s*(livre|libre)|shopee(\s*brasil)?|tiktok(\s*shop)?)\b.{0,20}$/i.test(titulo ?? "");
  return {
    titulo: titulo && !generico ? titulo.slice(0, 140) : undefined,
    imagem: imagem?.startsWith("https://") && imagem.length <= 2000 ? imagem : undefined,
    precoCentavos: Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : undefined,
  };
}
