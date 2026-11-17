// Vitrine pública do revendedor: /v/[slug]
// Ordem: itens vendidos pela Staypse primeiro (com selo do produtor) e depois
// "Minhas indicações" (links externos, marcados como publicidade).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { BotaoWhatsapp, CartaoItem, CartaoLink } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { buscarVitrine } from "@/lib/publico";
import { urlDoSite } from "@/lib/supabase/env";
import { MODELOS_VISUAIS, ROTULO_NICHO_VITRINE, modeloVisual } from "@/lib/vitrine";

// Os dados vêm do cache (buscarVitrine); a página em si é montada a cada visita.
export const instant = false;

const nomeDa = (v: { nome_exibicao: string | null; slug: string }) => v.nome_exibicao || v.slug;

export async function generateMetadata({ params }: PageProps<"/v/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dados = await buscarVitrine(slug);
  if (!dados) return { title: "Vitrine não encontrada", robots: { index: false } };
  const titulo = `Vitrine ${nomeDa(dados.vitrine)}`;
  const descricao =
    dados.vitrine.bio ||
    `Produtos escolhidos por ${nomeDa(dados.vitrine)}${dados.vitrine.nicho ? ` · ${ROTULO_NICHO_VITRINE[dados.vitrine.nicho]}` : ""}.`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/v/${slug}` },
    openGraph: { type: "website", url: `/v/${slug}`, title: titulo, description: descricao },
  };
}

export default async function Vitrine({ params }: PageProps<"/v/[slug]">) {
  const { slug } = await params;
  const dados = await buscarVitrine(slug);
  if (!dados) notFound();
  const { vitrine, itens, links } = dados;
  const modelo = MODELOS_VISUAIS[modeloVisual(vitrine.modelo_visual)];
  const nome = nomeDa(vitrine);
  const url = `${urlDoSite()}/v/${slug}`;

  return (
    <>
      <Cabecalho preLancamento />
      <main className="flex flex-1 flex-col bg-gelo">
        {/* topo com as cores do modelo visual escolhido */}
        <section className={modelo.topo}>
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
            <div className="flex items-center gap-3">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold ${modelo.selo}`}>
                {nome.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl leading-tight">{nome}</h1>
                {vitrine.nicho && <p className={`text-sm ${modelo.detalhe}`}>{ROTULO_NICHO_VITRINE[vitrine.nicho]}</p>}
              </div>
            </div>
            {vitrine.bio && <p className={`max-w-prose ${modelo.detalhe}`}>{vitrine.bio}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <BotaoWhatsapp
                texto={`Olha a minha vitrine na Staypse: ${nome}\n${url}`}
                className="inline-flex items-center gap-2 rounded-full bg-branco px-4 py-2 text-sm font-medium text-petroleo hover:bg-gelo"
              />
              <CopiarLink url={url} className="rounded-full bg-branco/90 px-4 py-2 text-sm font-medium text-petroleo hover:bg-gelo" />
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8">
          <section aria-labelledby="titulo-staypse">
            <h2 id="titulo-staypse" className="text-xl">
              Produtos
            </h2>
            {itens.length === 0 ? (
              <p className="mt-2 text-petroleo/70">Ainda não há produtos nesta vitrine.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {itens.map((item, i) => (
                  <li key={item.slug} className="flex">
                    <CartaoItem
                      href={`/p/${item.slug}?a=${item.codigo}`}
                      nome={item.nome}
                      foto={item.fotos[0]}
                      precoCentavos={item.preco_centavos}
                      produtorNome={item.produtor_nome}
                      prioridade={i < 2}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {links.length > 0 && (
            <section aria-labelledby="titulo-indicacoes">
              <h2 id="titulo-indicacoes" className="text-xl">
                Minhas indicações
              </h2>
              <p className="mt-1 text-sm text-petroleo/70">
                Produtos de outras lojas que eu recomendo. A compra, a entrega e o atendimento são feitos pelo outro site.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.id}>
                    <CartaoLink link={link} vitrine={slug} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
