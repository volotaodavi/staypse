// Prévia da loja no WhatsApp: marca da loja + foto do primeiro produto.
import { cartaoOg, tamanhoOg } from "@/lib/og";
import { urlFoto } from "@/lib/produtor";
import { buscarLoja } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { montarTema } from "@/lib/tema";

export const alt = "Loja";
export const size = tamanhoOg;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) return cartaoOg({ titulo: "Loja não encontrada" });
  const { loja, itens } = dados;
  const base = supabaseUrl();
  const foto = itens.find((i) => i.fotos[0])?.fotos[0];
  return cartaoOg({
    titulo: loja.loja_descricao?.slice(0, 80) || "Conheça nossos produtos",
    cor: montarTema({ principal: loja.cor_principal }).vars["--loja-principal"],
    marca: { nome: loja.loja_nome, logoUrl: loja.loja_foto_path ? urlFoto(base, loja.loja_foto_path) : null },
    fotoUrl: foto ? urlFoto(base, foto) : null,
  });
}
