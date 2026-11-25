// robots.txt. /entrar e /cadastro são indexáveis e estão no sitemap. Páginas pessoais
// (pedido, convites, lista) ficam fora; o checkout leva noindex na própria página.
import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/painel", "/api/", "/auth/", "/lista/", "/ir/", "/sair", "/pedido", "/afiliar/", "/convite/", "/simulador-pagamentos"] },
    sitemap: `${urlDoSite()}/sitemap.xml`,
  };
}
