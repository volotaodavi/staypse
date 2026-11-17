// Prévia do produto no WhatsApp: foto, nome, preço e quem vende.
import { cartaoOg, tamanhoOg } from "@/lib/og";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import { buscarItem } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";

export const alt = "Produto na Staypse";
export const size = tamanhoOg;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await buscarItem(slug);
  if (!item) return cartaoOg({ titulo: "Produto não encontrado" });
  return cartaoOg({
    titulo: item.nome,
    destaque: formatarPreco(item.preco_centavos),
    linha: `Vendido por ${item.produtor_nome}`,
    fotoUrl: item.fotos[0] ? urlFoto(supabaseUrl(), item.fotos[0]) : null,
  });
}
