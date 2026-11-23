// Link curto do afiliado: /@ana/tenis-runner  (o proxy reescreve para cá)
// 1. descobre o produto e se a Ana é afiliada aprovada dele (banco);
// 2. se for: registra o clique (1 por IP/item a cada 10 min, IP só em hash)
//    e grava o cookie de atribuição (30 dias, último clique vence);
// 3. redireciona (302) para o produto DENTRO do site da loja, sem código na URL.
// Robôs de prévia (WhatsApp, Facebook...) seguem o redirecionamento para montar
// a prévia, mas não contam clique nem recebem cookie.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ATRIBUICAO, DURACAO_ATRIBUICAO_S, atribuicaoDoItem, registrarAtribuicao } from "@/lib/atribuicao";
import { hashDoIp } from "@/lib/ip";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const ROBOS = /bot|crawl|spider|facebookexternalhit|whatsapp|telegram|slack|discord|preview|embedly|vkshare|pinterest|skype/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;

type Destino = {
  loja_slug: string;
  produto_slug: string;
  item_id: string;
  afiliado_id: string | null;
  afiliado_slug: string | null;
  atribuido: boolean;
};

// Lógica do link curto; o modo "checkout" vem da rota irmã /comprar.
export async function abrirLink(request: NextRequest, afiliado: string, produto: string, modoCheckout: boolean) {
  const arroba = afiliado.toLowerCase();
  if (!SLUG.test(arroba) || !SLUG.test(produto)) return new NextResponse("Link inválido", { status: 404 });

  const robo = ROBOS.test(request.headers.get("user-agent") ?? "");
  // de onde veio o clique (só o domínio, ex.: instagram.com), nada pessoal
  let origem: string | null = null;
  try {
    origem = new URL(request.headers.get("referer") ?? "").hostname.slice(0, 100) || null;
  } catch {}

  const { data, error } = await criarClienteAdmin()
    .rpc("abrir_link_afiliado", {
      p_afiliado: arroba,
      p_produto: produto,
      p_ip_hash: await hashDoIp(),
      p_origem: origem,
      p_registrar: !robo,
    })
    .maybeSingle<Destino>();

  if (error) console.error("abrir_link_afiliado:", error.message);
  // produto não existe (ou saiu do ar): mostra a vitrine de quem indicou
  if (!data) return NextResponse.redirect(new URL(`/@${arroba}`, request.url), 302);

  // Dois tipos de link: página do produto (padrão) ou direto ao checkout
  // (/@ana/produto/comprar). Robôs de prévia sempre vão para a página do
  // produto, que tem título e foto para montar a prévia.
  const checkout = modoCheckout && !robo;
  const destino = new URL(`/loja/${data.loja_slug}/${data.produto_slug}${checkout ? "/comprar" : ""}`, request.url);
  // repassa só parâmetros de campanha (utm_*), para o afiliado medir anúncios
  for (const [chave, valor] of request.nextUrl.searchParams) {
    if (/^utm_(source|medium|campaign|term|content)$/.test(chave)) destino.searchParams.set(chave, valor.slice(0, 100));
  }
  const resposta = NextResponse.redirect(destino, 302);
  resposta.headers.set("Cache-Control", "private, no-store");
  const atual = request.cookies.get(COOKIE_ATRIBUICAO)?.value;
  // Proteção contra "cookie stuffing": uma navegação que NÃO veio de um toque da
  // pessoa (ex.: outro site redirecionando sozinho) não troca a indicação que
  // já existe para o produto. Navegadores antigos não mandam o cabeçalho: aceita.
  const toqueDaPessoa = request.headers.get("sec-fetch-user") === "?1" || !request.headers.has("sec-fetch-site");
  const outraIndicacao = atribuicaoDoItem(atual, data.item_id);
  const podeGravar = toqueDaPessoa || !outraIndicacao || outraIndicacao.a === data.afiliado_id;
  if (data.atribuido && !robo && data.afiliado_id && data.afiliado_slug && podeGravar) {
    resposta.cookies.set(
      COOKIE_ATRIBUICAO,
      registrarAtribuicao(atual, { i: data.item_id, a: data.afiliado_id, h: data.afiliado_slug }),
      {
        maxAge: DURACAO_ATRIBUICAO_S,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    );
  }
  return resposta;
}
