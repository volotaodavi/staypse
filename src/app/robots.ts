// robots.txt. /entrar e /cadastro NÃO são bloqueados aqui de propósito: eles
// têm <meta robots noindex>, que o Google só enxerga se puder abrir a página.
import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/painel", "/api/", "/auth/", "/lista/"] },
    sitemap: `${urlDoSite()}/sitemap.xml`,
  };
}
