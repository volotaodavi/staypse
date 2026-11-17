// Prévia da vitrine no WhatsApp: nome da vitrine + foto do primeiro produto.
import { cartaoOg, tamanhoOg } from "@/lib/og";
import { urlFoto } from "@/lib/produtor";
import { buscarVitrine } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { ROTULO_NICHO_VITRINE } from "@/lib/vitrine";

export const alt = "Vitrine na Staypse";
export const size = tamanhoOg;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await buscarVitrine(slug);
  if (!dados) return cartaoOg({ titulo: "Vitrine não encontrada" });
  const { vitrine, itens } = dados;
  const foto = itens.find((i) => i.fotos[0])?.fotos[0];
  const qtd = itens.length + dados.links.length;
  return cartaoOg({
    titulo: `Vitrine ${vitrine.nome_exibicao || vitrine.slug}`,
    destaque: vitrine.nicho ? ROTULO_NICHO_VITRINE[vitrine.nicho] : undefined,
    linha: qtd > 0 ? `${qtd} ${qtd === 1 ? "produto escolhido" : "produtos escolhidos"}` : undefined,
    fotoUrl: foto ? urlFoto(supabaseUrl(), foto) : null,
  });
}
