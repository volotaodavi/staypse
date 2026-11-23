// Moldura do site da loja: aplica a identidade visual (cores, fonte, modelo) como
// variáveis CSS em tudo que está dentro de /loja/[slug] (início e produtos), e
// monta faixa de anúncio, cabeçalho e rodapé a partir do tema salvo.
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { AnuncioLoja, CabecalhoLoja, RodapeLoja, itensDoMenu } from "@/components/loja";
import { classesFontesLoja } from "@/lib/fontes-loja";
import { buscarLoja } from "@/lib/publico";
import { montarTema } from "@/lib/tema";
import { MODELOS_LOJA, lerTemaLoja, varsDoModelo } from "@/lib/tema-loja";

export const instant = false;

export default async function LayoutLoja({ children, params }: LayoutProps<"/loja/[slug]">) {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) notFound();
  const { loja, itens } = dados;
  const tema = lerTemaLoja(loja.loja_tema, loja.layout);
  const cfg = MODELOS_LOJA[tema.modelo];
  const visual = montarTema({ principal: loja.cor_principal ?? cfg.principal, destaque: loja.cor_destaque ?? cfg.destaque, fonte: loja.fonte ?? cfg.fonte, layout: loja.layout });

  return (
    // @container: as seções respondem à largura da loja (e não da janela)
    <div
      data-modelo={tema.modelo}
      className={`${classesFontesLoja} @container flex flex-1 flex-col bg-[var(--loja-fundo)]`}
      style={{ ...varsDoModelo(tema.modelo), ...visual.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
    >
      <AnuncioLoja anuncio={tema.anuncio} />
      <CabecalhoLoja
        href={`/loja/${slug}`}
        slug={slug}
        nome={loja.loja_nome}
        logo={loja.loja_foto_path}
        tipo={cfg.cabecalho}
        menu={itensDoMenu(tema, slug, itens)}
        busca={tema.cabecalho.busca}
      />
      {children}
      <RodapeLoja nome={loja.loja_nome} descricao={loja.loja_descricao} email={loja.email_contato} rodape={tema.rodape} />
    </div>
  );
}
