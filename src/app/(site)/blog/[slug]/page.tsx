// Artigo do blog: estático (generateStaticParams), com Article + BreadcrumbList em JSON-LD.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCorpo } from "@/components/BlogCorpo";
import { Cabecalho } from "@/components/Cabecalho";
import { JsonLd } from "@/components/JsonLd";
import { ARTIGOS, artigoPorSlug } from "@/conteudo/blog";
import { dadosMigalhas } from "@/lib/seo";
import { urlDoSite } from "@/lib/supabase/env";
import { dataBR } from "../page";

export function generateStaticParams() {
  return ARTIGOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = artigoPorSlug((await params).slug);
  if (!a) return {};
  const url = `/blog/${a.slug}`;
  return {
    title: a.tituloSeo,
    description: a.descricao,
    alternates: { canonical: url },
    authors: [{ name: "Equipe Staypse" }],
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Staypse",
      url,
      title: `${a.tituloSeo} | Staypse`,
      description: a.descricao,
      publishedTime: a.publicadoEm,
      modifiedTime: a.atualizadoEm,
      authors: ["Equipe Staypse"],
    },
  };
}

export default async function ArtigoBlog({ params }: { params: Promise<{ slug: string }> }) {
  const a = artigoPorSlug((await params).slug);
  if (!a) notFound();
  const base = urlDoSite();
  const url = `${base}/blog/${a.slug}`;
  const artigoLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#artigo`,
    headline: a.titulo,
    description: a.descricao,
    inLanguage: "pt-BR",
    mainEntityOfPage: url,
    datePublished: a.publicadoEm,
    dateModified: a.atualizadoEm,
    author: { "@type": "Organization", name: "Equipe Staypse", url: base },
    publisher: { "@id": `${base}/#organizacao` },
  };
  const outros = ARTIGOS.filter((o) => o.slug !== a.slug).slice(0, 3);
  return (
    <>
      <Cabecalho preLancamento />
      <JsonLd
        dados={[
          artigoLd,
          dadosMigalhas([
            { nome: "Início", caminho: "/" },
            { nome: "Blog", caminho: "/blog" },
            { nome: a.titulo, caminho: `/blog/${a.slug}` },
          ]),
        ]}
      />
      <main className="mx-auto w-full max-w-[70ch] flex-1 px-4 py-10 sm:py-14">
        <nav aria-label="Você está em" className="text-sm text-petroleo/75">
          <Link href="/blog" className="underline hover:text-petroleo">
            Blog
          </Link>
        </nav>
        <article>
          <h1 className="mt-3 text-3xl leading-tight font-extrabold sm:text-4xl">{a.titulo}</h1>
          <p className="mt-3 text-sm text-petroleo/75">
            Por Equipe Staypse · <time dateTime={a.publicadoEm}>{dataBR(a.publicadoEm)}</time>
            {a.atualizadoEm !== a.publicadoEm && <> · atualizado em <time dateTime={a.atualizadoEm}>{dataBR(a.atualizadoEm)}</time></>} · {a.minutos} min de leitura
          </p>
          <BlogCorpo corpo={a.corpo} />
        </article>

        <aside className="mt-12 rounded-2xl bg-petroleo p-6 text-gelo">
          <h2 className="text-2xl leading-snug font-extrabold">Pronto para vender com afiliados?</h2>
          <p className="mt-2 leading-7">Crie sua conta, cadastre a loja e deixe a divisão do pagamento por conta da Staypse.</p>
          <Link href="/cadastro" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ciano px-6 py-2 font-medium text-petroleo hover:brightness-95">
            Criar conta grátis
          </Link>
        </aside>

        <section aria-labelledby="leia-tambem" className="mt-12">
          <h2 id="leia-tambem" className="text-xl font-extrabold">
            Leia também
          </h2>
          <ul className="mt-3 space-y-1">
            {outros.map((o) => (
              <li key={o.slug}>
                <Link href={`/blog/${o.slug}`} className="inline-flex min-h-11 items-center underline underline-offset-2 hover:decoration-2">
                  {o.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
