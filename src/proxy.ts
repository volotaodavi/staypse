// Roda ANTES de cada página (no Next 16 o antigo "middleware" virou "proxy").
// Faz duas coisas:
//  1. Renova a sessão do Supabase (o token expira em 1h).
//  2. Manda para /entrar quem tenta abrir área logada sem estar logado.
// A checagem de PAPEL (produtor/revendedor/admin) fica em cada página,
// consultando o banco, o proxy só sabe se há alguém logado.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseChavePublica, supabaseUrl } from "@/lib/supabase/env";

const AREAS_LOGADAS = ["/painel", "/admin"];
const PAGINAS_DE_ENTRADA = ["/entrar", "/cadastro"];

export async function proxy(request: NextRequest) {
  // Links curtos do afiliado (no Next, pasta com "@" é reservada, por isso a
  // reescrita): /@ana → vitrine; /@ana/tenis-runner → abre o link (clique +
  // atribuição + redirecionamento para a loja). A barra de endereço não muda.
  // só letras, números e hífen (o mesmo formato dos endereços no banco)
  // /@ana/tenis-runner/comprar → mesmo link, mas leva direto ao checkout da loja.
  const arroba = request.nextUrl.pathname.match(/^\/(?:@|%40)([A-Za-z0-9-]{1,60})(?:\/([a-z0-9-]{1,60})(\/comprar)?)?\/?$/);
  if (arroba) {
    const url = request.nextUrl.clone();
    url.pathname = arroba[2] ? `/ir/${arroba[1]}/${arroba[2]}${arroba[3] ?? ""}` : `/v/${arroba[1].toLowerCase()}`;
    return NextResponse.rewrite(url);
  }

  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseChavePublica(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar, headers) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesParaGravar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        );
        // evita que a Vercel guarde em cache uma resposta com cookie de sessão
        Object.entries(headers).forEach(([chave, valor]) => resposta.headers.set(chave, valor));
      },
    },
  });

  // getClaims() valida o token do usuário. Não colocar código entre a
  // criação do cliente e esta linha (recomendação do Supabase).
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const caminho = request.nextUrl.pathname;

  if (!logado && AREAS_LOGADAS.some((area) => caminho.startsWith(area))) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?proximo=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(url);
  }

  if (logado && PAGINAS_DE_ENTRADA.includes(caminho)) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  // Não roda em arquivos estáticos, imagens e na pasta /brand (logos).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
