// Loja pública do produtor: /loja/[slug]
// Mostra nome, foto, descrição e SOMENTE os itens aprovados (regra no banco:
// loja_publica e itens_da_loja só devolvem produtor e itens aprovados).
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { BotaoWhatsapp, CartaoItem } from "@/components/publico";
import { urlFoto } from "@/lib/produtor";
import { buscarLoja } from "@/lib/publico";
import { supabaseUrl, urlDoSite } from "@/lib/supabase/env";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/loja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) return { title: "Loja não encontrada", robots: { index: false } };
  const descricao = dados.loja.loja_descricao || `Produtos de ${dados.loja.loja_nome} na Staypse.`;
  return {
    title: dados.loja.loja_nome,
    description: descricao,
    alternates: { canonical: `/loja/${slug}` },
    openGraph: { type: "website", url: `/loja/${slug}`, title: dados.loja.loja_nome, description: descricao },
  };
}

export default async function Loja({ params }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  const dados = await buscarLoja(slug);
  if (!dados) notFound();
  const { loja, itens } = dados;

  return (
    <>
      <Cabecalho preLancamento />
      <main className="flex flex-1 flex-col bg-gelo">
        <section className="bg-petroleo text-branco">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
            <div className="flex items-center gap-4">
              {loja.loja_foto_path ? (
                <Image
                  src={urlFoto(supabaseUrl(), loja.loja_foto_path)}
                  alt={`Foto da loja ${loja.loja_nome}`}
                  width={72}
                  height={72}
                  priority
                  className="h-18 w-18 shrink-0 rounded-full bg-gelo object-cover"
                />
              ) : (
                <span className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-ciano text-3xl font-extrabold text-petroleo">
                  {loja.loja_nome.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl leading-tight">{loja.loja_nome}</h1>
                <p className="text-sm text-gelo/80">Loja verificada na Staypse</p>
              </div>
            </div>
            {loja.loja_descricao && <p className="max-w-prose text-gelo/85">{loja.loja_descricao}</p>}
            <div>
              <BotaoWhatsapp
                texto={`Conheça a loja ${loja.loja_nome} na Staypse:\n${urlDoSite()}/loja/${slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-branco px-4 py-2 text-sm font-medium text-petroleo hover:bg-gelo"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <h2 className="text-xl">Produtos</h2>
          {itens.length === 0 ? (
            <p className="mt-2 text-petroleo/70">Esta loja ainda não tem produtos aprovados.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {itens.map((item, i) => (
                <li key={item.slug} className="flex">
                  <CartaoItem href={`/p/${item.slug}`} nome={item.nome} foto={item.fotos[0]} precoCentavos={item.preco_centavos} prioridade={i < 2} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
