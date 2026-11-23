// Mapa do site: só páginas públicas e estáveis. FORA: /entrar e /cadastro
// (só para quem tem o link), painéis, admin e /lista/<código> (página pessoal).
import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/supabase/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlDoSite();
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/termos` },
    { url: `${base}/privacidade` },
    { url: `${base}/cookies` },
    { url: `${base}/reembolso` },
    { url: `${base}/produtos-proibidos` },
    { url: `${base}/atendimento` },
  ];
}
