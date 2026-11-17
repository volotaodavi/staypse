// Prévia da loja do produtor no WhatsApp.
import { cartaoOg, tamanhoOg } from "@/lib/og";
import { urlFoto } from "@/lib/produtor";
import { buscarLoja } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";

export const alt = "Loja na Staypse";
export const size = tamanhoOg;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) return cartaoOg({ titulo: "Loja não encontrada" });
  const foto = dados.loja.loja_foto_path ?? dados.itens.find((i) => i.fotos[0])?.fotos[0];
  return cartaoOg({
    titulo: dados.loja.loja_nome,
    linha: "Loja verificada na Staypse",
    fotoUrl: foto ? urlFoto(supabaseUrl(), foto) : null,
  });
}
