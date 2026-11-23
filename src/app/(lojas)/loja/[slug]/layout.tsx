// Moldura do site da loja: aplica a identidade visual (cores, fonte) como
// variáveis CSS em tudo que está dentro de /loja/[slug] (início e produtos).
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { CabecalhoLoja } from "@/components/loja";
import { classesFontesLoja } from "@/lib/fontes-loja";
import { buscarLoja } from "@/lib/publico";
import { montarTema } from "@/lib/tema";
import { lerTemaLoja } from "@/lib/tema-loja";

export const instant = false;

export default async function LayoutLoja({ children, params }: LayoutProps<"/loja/[slug]">) {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) notFound();
  const { loja } = dados;
  const tema = montarTema({ principal: loja.cor_principal, destaque: loja.cor_destaque, fonte: loja.fonte, layout: loja.layout });
  const modelo = lerTemaLoja(loja.loja_tema, loja.layout).modelo;

  return (
    // @container: as seções respondem à largura da loja (e não da janela)
    <div
      className={`${classesFontesLoja} @container flex flex-1 flex-col bg-white`}
      style={{ ...tema.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
    >
      <CabecalhoLoja href={`/loja/${slug}`} nome={loja.loja_nome} logo={loja.loja_foto_path} centralizado={modelo === "editorial"} />
      {children}
    </div>
  );
}
