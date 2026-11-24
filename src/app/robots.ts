// robots.txt. /entrar e /cadastro são indexáveis e estão no sitemap.
import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/painel", "/api/", "/auth/", "/lista/"] },
    sitemap: `${urlDoSite()}/sitemap.xml`,
  };
}
