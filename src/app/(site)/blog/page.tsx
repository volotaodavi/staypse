// Lista do blog: estática, gerada no build a partir de src/conteudo/blog.
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { JsonLd } from "@/components/JsonLd";
import { ARTIGOS } from "@/conteudo/blog";
import { dadosMigalhas } from "@/lib/seo";

const titulo = "Blog: vender com afiliados";
const descricao = "Guias práticos para lojas e afiliados: programa de afiliados, split de pagamento, divulgação no Instagram e WhatsApp, comissão e taxas.";

export const metadata: Metadata = {
  title: titulo,
  description: descricao,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "Staypse", url: "/blog", title: `${titulo} | Staypse`, description: descricao },
};

export const dataBR = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function Blog() {
  return (
    <>
      <Cabecalho preLancamento />
      <JsonLd dados={dadosMigalhas([{ nome: "Início", caminho: "/" }, { nome: "Blog", caminho: "/blog" }])} />
      <main className="mx-auto w-full max-w-[70ch] flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">Blog da Staypse</h1>
        <p className="mt-3 text-lg leading-8">Guias diretos para quem tem loja e para quem quer divulgar como afiliado.</p>
        <ul className="mt-10 space-y-5">
          {ARTIGOS.map((a) => (
            <li key={a.slug}>
              <article className="rounded-2xl border border-petroleo/10 bg-gelo p-5 transition-colors hover:border-petroleo/30">
                <p className="text-sm text-petroleo/75">
                  <time dateTime={a.publicadoEm}>{dataBR(a.publicadoEm)}</time> · {a.minutos} min de leitura
                </p>
                <h2 className="mt-1 text-xl leading-snug font-extrabold">
                  <Link href={`/blog/${a.slug}`} className="hover:underline">
                    {a.titulo}
                  </Link>
                </h2>
                <p className="mt-2 leading-7">{a.resumo}</p>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
