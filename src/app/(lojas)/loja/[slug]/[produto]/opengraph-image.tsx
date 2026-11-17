// Prévia do produto no WhatsApp: foto, nome e preço com a MARCA da loja
// (cor principal e logo/nome). Também é a prévia dos links /@afiliado/produto,
// que redirecionam para esta página.
import { cartaoOg, tamanhoOg } from "@/lib/og";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import { buscarLoja, buscarProduto } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { montarTema } from "@/lib/tema";

export const alt = "Produto";
export const size = tamanhoOg;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; produto: string }> }) {
  const { slug, produto } = await params;
  const [item, dados] = await Promise.all([buscarProduto(slug, produto), buscarLoja(slug)]);
  if (!item || !dados) return cartaoOg({ titulo: "Produto não encontrado" });
  const { loja } = dados;
  const base = supabaseUrl();
  return cartaoOg({
    titulo: item.nome,
    destaque: formatarPreco(item.preco_centavos),
    cor: montarTema({ principal: loja.cor_principal }).vars["--loja-principal"],
    marca: { nome: loja.loja_nome, logoUrl: loja.loja_foto_path ? urlFoto(base, loja.loja_foto_path) : null },
    fotoUrl: item.fotos[0] ? urlFoto(base, item.fotos[0]) : null,
  });
}
