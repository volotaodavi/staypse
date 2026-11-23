// Leituras PÚBLICAS (vitrine, loja e produto) com cache: as páginas abrem
// rápido e o banco não é consultado a cada visita. O cache leva a etiqueta
// "vitrines" e é renovado na hora (updateTag) quando algo muda: item aprovado,
// pausado ou recusado, afiliação, links externos, dados da loja.
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseChavePublica, supabaseUrl } from "./supabase/env";

export const ETIQUETA_VITRINES = "vitrines";

// cliente sem login (não lê cookies, por isso pode ficar em cache)
const publico = () => createClient(supabaseUrl(), supabaseChavePublica(), { auth: { persistSession: false } });

export type ItemVitrine = {
  id: string;
  slug: string;
  nome: string;
  fotos: string[];
  preco_centavos: number;
  tipo: string;
  produtor_nome: string;
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
  cor_principal: string | null;
  foto_path: string | null;
  bio: string | null;
  // destaques, coleções e ordem manual (JSON validado no banco; lido por lib/vitrine)
  organizacao?: unknown;
};

export async function buscarVitrine(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const sb = publico();
  const { data: vitrine } = await sb
    .from("storefronts")
    .select("id, slug, nome_exibicao, nicho, modelo_visual, cor_principal, foto_path, bio, organizacao")
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

export type Loja = {
  id: string;
  loja_slug: string;
  loja_nome: string;
  loja_descricao: string | null;
  loja_foto_path: string | null;
  cor_principal: string | null;
  cor_destaque: string | null;
  fonte: string | null;
  layout: string | null;
  razao_social: string;
  cnpj: string;
  // Decreto 7.962/2013: endereço físico e eletrônico de quem vende
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  email_contato: string | null;
  // tema em JSON (modelo, seções, banner, destaques); nulo = usa o "layout" antigo
  loja_tema: unknown;
};
export type ItemLoja = {
  id: string;
  slug: string;
  nome: string;
  fotos: string[];
  preco_centavos: number;
  tipo: string;
  categoria: string | null;
  // posição entre os mais vendidos (30 dias); nulo = sem venda. Nunca o número de vendas.
  ordem_vendidos: number | null;
};

export async function buscarLoja(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const sb = publico();
  const { data: loja } = await sb.rpc("loja_publica", { p_slug: slug }).maybeSingle<Loja>();
  if (!loja) return null;
  const { data: itens } = await sb.rpc("itens_da_loja", { p_loja_slug: slug });
  return { loja, itens: (itens ?? []) as ItemLoja[] };
}

export type Produto = {
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
};

export async function buscarProduto(loja: string, produto: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const { data } = await publico().rpc("produto_da_loja", { p_loja: loja, p_produto: produto }).maybeSingle<Produto>();
  return data ?? null;
}
