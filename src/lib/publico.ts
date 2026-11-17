// Leituras PÚBLICAS (vitrine, produto, loja) com cache: as páginas abrem
// rápido e o banco não é consultado a cada visita. O cache leva a etiqueta
// "vitrines" e é renovado na hora (updateTag) quando algo muda: item aprovado,
// pausado ou recusado, afiliação, links externos.
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseChavePublica, supabaseUrl } from "./supabase/env";

export const ETIQUETA_VITRINES = "vitrines";

// cliente sem login (não lê cookies, por isso pode ficar em cache)
const publico = () => createClient(supabaseUrl(), supabaseChavePublica(), { auth: { persistSession: false } });

export type ItemVitrine = {
  slug: string;
  nome: string;
  fotos: string[];
  preco_centavos: number;
  tipo: string;
  produtor_nome: string;
  codigo: string;
};
export type LinkExterno = {
  id: string;
  url: string;
  titulo: string;
  imagem_url: string | null;
  preco_centavos: number | null;
  plataforma: string;
};
export type Vitrine = {
  slug: string;
  nome_exibicao: string | null;
  nicho: string | null;
  modelo_visual: string;
  bio: string | null;
};

export async function buscarVitrine(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const sb = publico();
  const { data: vitrine } = await sb
    .from("storefronts")
    .select("id, slug, nome_exibicao, nicho, modelo_visual, bio")
    .eq("slug", slug)
    .maybeSingle<Vitrine & { id: string }>();
  if (!vitrine) return null;
  const [{ data: itens }, { data: links }] = await Promise.all([
    sb.rpc("itens_da_vitrine", { p_slug: slug }),
    sb.from("external_links").select("id, url, titulo, imagem_url, preco_centavos, plataforma")
      .eq("storefront_id", vitrine.id).order("ordem").order("criado_em"),
  ]);
  return { vitrine, itens: (itens ?? []) as ItemVitrine[], links: (links ?? []) as LinkExterno[] };
}

export type ItemPublico = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  fotos: string[];
  preco_centavos: number;
  tipo: string;
  tipo_digital: string | null;
  categoria: string | null;
  prazo_postagem_dias: number | null;
  retirada_local: boolean;
  produtor_nome: string;
  loja_slug: string | null;
};

export async function buscarItem(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const { data } = await publico().rpc("item_publico", { p_slug: slug }).maybeSingle<ItemPublico>();
  return data ?? null;
}

export async function buscarLoja(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const sb = publico();
  const { data: loja } = await sb.rpc("loja_publica", { p_slug: slug }).maybeSingle<{
    id: string; loja_slug: string; loja_nome: string; loja_descricao: string | null; loja_foto_path: string | null;
  }>();
  if (!loja) return null;
  const { data: itens } = await sb.rpc("itens_da_loja", { p_loja_slug: slug });
  return { loja, itens: (itens ?? []) as Omit<ItemVitrine, "produtor_nome" | "codigo">[] };
}
