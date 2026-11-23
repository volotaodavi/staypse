// Início da loja: /loja/[slug]. Mostra SOMENTE itens aprovados (regra no banco).
// A página é montada a partir do tema em JSON salvo pela loja (4 modelos prontos,
// seções na ordem escolhida, banner e destaques) — ver lib/tema-loja.ts.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SecoesLoja } from "@/components/loja-secoes";
import { buscarLoja } from "@/lib/publico";
import { lerTemaLoja } from "@/lib/tema-loja";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/loja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) return { title: "Loja não encontrada", robots: { index: false } };
  const descricao = dados.loja.loja_descricao || `Produtos de ${dados.loja.loja_nome}.`;
  return {
    title: { absolute: dados.loja.loja_nome },
    description: descricao,
    alternates: { canonical: `/loja/${slug}` },
    openGraph: { type: "website", url: `/loja/${slug}`, siteName: dados.loja.loja_nome, title: dados.loja.loja_nome, description: descricao },
  };
}

export default async function InicioLoja({ params }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) notFound();
  const { loja, itens } = dados;
  const tema = lerTemaLoja(loja.loja_tema, loja.layout);

  return (
    <main id="conteudo" tabIndex={-1} className="flex w-full flex-1 flex-col pb-6">
      <h1 className="sr-only">{loja.loja_nome}</h1>
      <SecoesLoja
        tema={tema}
        itens={itens}
        sobre={{
          slug,
          nome: loja.loja_nome,
          descricao: loja.loja_descricao,
          razaoSocial: loja.razao_social,
          cidade: loja.cidade,
          uf: loja.uf,
          email: loja.email_contato,
        }}
      />
    </main>
  );
}
