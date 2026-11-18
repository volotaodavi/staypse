// Início da loja: /loja/[slug]. Mostra SOMENTE itens aprovados (regra no banco).
// Três layouts: grade, destaque (primeiro produto no topo) e centralizado.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartaoProdutoLoja, FotoProduto, classeBotaoLoja, classeGrade } from "@/components/loja";
import { formatarPreco } from "@/lib/produtor";
import { buscarLoja } from "@/lib/publico";
import { montarTema } from "@/lib/tema";

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
  const { layout } = montarTema({ layout: loja.layout });
  const centralizado = layout === "lista";
  const [primeiro, ...resto] = itens;
  const grade = layout === "destaque" ? resto : itens;

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
      {(loja.loja_descricao || centralizado) && (
        <section className={centralizado ? "mx-auto max-w-xl text-center" : "max-w-2xl"}>
          {centralizado && <h1 className="text-2xl font-semibold">{loja.loja_nome}</h1>}
          {loja.loja_descricao && <p className="mt-2 text-base text-neutral-600">{loja.loja_descricao}</p>}
        </section>
      )}
      {!centralizado && <h1 className="sr-only">{loja.loja_nome}</h1>}

      {layout === "destaque" && primeiro && (
        <section className="grid items-center gap-6 md:grid-cols-2" aria-label="Produto em destaque">
          <FotoProduto caminho={primeiro.fotos[0]} alt={primeiro.nome} formato="retrato" sizes="(min-width: 768px) 50vw, 100vw" prioridade />
          <div className="flex flex-col items-start gap-4">
            <h2 className="text-2xl font-semibold">{primeiro.nome}</h2>
            <p className="text-2xl font-semibold">{formatarPreco(primeiro.preco_centavos)}</p>
            <Link href={`/loja/${slug}/${primeiro.slug}`} className={classeBotaoLoja}>
              Ver produto
            </Link>
          </div>
        </section>
      )}

      {itens.length === 0 ? (
        <p className="text-base text-neutral-600">Esta loja ainda não tem produtos.</p>
      ) : (
        grade.length > 0 && (
          <section aria-label="Produtos">
            {layout === "destaque" && <h2 className="mb-4 text-base font-semibold">Todos os produtos</h2>}
            <ul className={classeGrade}>
              {grade.map((item, i) => (
                <li key={item.slug}>
                  <CartaoProdutoLoja
                    href={`/loja/${slug}/${item.slug}`}
                    nome={item.nome}
                    foto={item.fotos[0]}
                    precoCentavos={item.preco_centavos}
                    formato={centralizado ? "retrato" : "quadrado"}
                    centralizado={centralizado}
                    prioridade={i < 2}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </main>
  );
}
