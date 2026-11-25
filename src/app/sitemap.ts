// Mapa do site: páginas públicas + lojas aprovadas, produtos publicados e
// vitrines ativas (vindos de public.mapa_do_site). FORA: painéis, admin, pedido,
// checkout e /lista/<código> (páginas pessoais). Se o banco não responder, sai
// só a parte fixa (o mapa nunca quebra o build).
import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseChavePublica, supabaseUrl, urlDoSite } from "@/lib/supabase/env";

type Linha = { tipo: "loja" | "produto" | "vitrine"; slug: string; loja_slug: string | null; atualizado_em: string };

async function paginasPublicas(): Promise<Linha[]> {
  try {
    const sb = createClient(supabaseUrl(), supabaseChavePublica(), { auth: { persistSession: false } });
    const { data } = await sb.rpc("mapa_do_site").limit(50000);
    return (data ?? []) as Linha[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoSite();
  const fixas: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/cadastro`, priority: 0.8 },
    { url: `${base}/entrar`, priority: 0.5 },
    { url: `${base}/termos` },
    { url: `${base}/privacidade` },
    { url: `${base}/cookies` },
    { url: `${base}/reembolso` },
    { url: `${base}/produtos-proibidos` },
    { url: `${base}/atendimento` },
  ];
  const dinamicas: MetadataRoute.Sitemap = (await paginasPublicas()).flatMap((l) => {
    const lastModified = new Date(l.atualizado_em);
    if (l.tipo === "loja") return [{ url: `${base}/loja/${l.slug}`, lastModified, priority: 0.7 }];
    if (l.tipo === "vitrine") return [{ url: `${base}/@${l.slug}`, lastModified, priority: 0.5 }];
    return l.loja_slug ? [{ url: `${base}/loja/${l.loja_slug}/${l.slug}`, lastModified, priority: 0.6 }] : [];
  });
  return [...fixas, ...dinamicas];
}
