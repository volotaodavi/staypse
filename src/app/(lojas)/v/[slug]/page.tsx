// Vitrine do afiliado: /@[slug] (o proxy reescreve para /v/[slug]).
// Produtos da Staypse primeiro — cada um aponta para o link curto
// /@afiliado/produto, então a compra sempre acontece no site da loja.
// Depois, "Minhas indicações": links externos marcados como publicidade.
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CartaoProdutoLoja, classeGrade } from "@/components/loja";
import { linkWhatsapp } from "@/components/publico";
import { CopiarLink, LinkRastreado } from "@/components/rastreio";
import { linkDenuncia } from "@/lib/denuncias";
import { classesFontesLoja } from "@/lib/fontes-loja";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import { buscarVitrine } from "@/lib/publico";
import { supabaseUrl, urlDoSite } from "@/lib/supabase/env";
import { montarTema } from "@/lib/tema";
import type { ItemVitrine } from "@/lib/publico";
import { PLATAFORMAS, ROTULO_NICHO_VITRINE, organizarVitrine } from "@/lib/vitrine";

export const instant = false;

// Grade de produtos. Cada produto continua indo pelo link curto /@afiliado/produto,
// que leva à loja vendedora (a compra nunca acontece aqui).
function GradeProdutos({ slug, itens }: { slug: string; itens: ItemVitrine[] }) {
  return (
    <ul className={classeGrade}>
      {itens.map((item, i) => (
        <li key={`${item.produtor_nome}-${item.slug}`}>
          <CartaoProdutoLoja
            href={`/@${slug}/${item.slug}`}
            redirecionamento
            nome={item.nome}
            foto={item.fotos[0]}
            precoCentavos={item.preco_centavos}
            prioridade={i < 2}
            rodape={<span className="text-sm text-neutral-600">Vendido por {item.produtor_nome} · pagamento pela Staypse</span>}
          />
        </li>
      ))}
    </ul>
  );
}

const nomeDa = (v: { nome_exibicao: string | null; slug: string }) => v.nome_exibicao || `@${v.slug}`;

export async function generateMetadata({ params }: PageProps<"/v/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dados = await buscarVitrine(slug);
  if (!dados) return { title: "Vitrine não encontrada", robots: { index: false } };
  const nome = nomeDa(dados.vitrine);
  const descricao = dados.vitrine.bio || `Produtos escolhidos por ${nome}.`;
  return {
    title: { absolute: `${nome} (@${slug})` },
    description: descricao,
    alternates: { canonical: `/@${slug}` },
    openGraph: { type: "website", url: `/@${slug}`, title: nome, description: descricao },
  };
}

export default async function Vitrine({ params }: PageProps<"/v/[slug]">) {
  const { slug } = await params;
  const dados = await buscarVitrine(slug);
  if (!dados) notFound();
  const { vitrine, itens, links } = dados;
  // destaques, coleções e ordem manual; item que saiu do ar já não está em "itens"
  const { destaques, colecoes, todos } = organizarVitrine(itens, vitrine.organizacao);
  const secoesNav = [
    ...(destaques.length > 0 ? [{ id: "destaques", rotulo: "Destaques" }] : []),
    ...colecoes.map((c, i) => ({ id: `colecao-${i + 1}`, rotulo: c.nome })),
    ...(destaques.length > 0 || colecoes.length > 0 ? [{ id: "titulo-produtos", rotulo: "Todos os produtos" }] : []),
  ];
  const tituloSecao = "mb-4 text-base font-semibold";
  const proprio = vitrine.modelo_visual === "proprio";
  // padrão Staypse (petróleo/ciano, Outfit) ou "minhas cores" (cor principal)
  const tema = montarTema({ principal: proprio ? vitrine.cor_principal : null });
  const nome = nomeDa(vitrine);
  const url = `${urlDoSite()}/@${slug}`;
  const botao = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold";

  return (
    <div className={`${classesFontesLoja} flex flex-1 flex-col`} style={{ ...tema.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}>
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8">
          <div className="flex items-center gap-4">
            {vitrine.foto_path ? (
              <Image
                src={urlFoto(supabaseUrl(), vitrine.foto_path)}
                alt=""
                width={64}
                height={64}
                priority
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--loja-principal)] text-2xl font-semibold text-[var(--loja-principal-texto)]"
              >
                {nome.replace("@", "").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{nome}</h1>
              <p className="text-sm text-neutral-600">
                @{slug}
                {vitrine.nicho ? ` · ${ROTULO_NICHO_VITRINE[vitrine.nicho]}` : ""}
              </p>
            </div>
          </div>
          {vitrine.bio && <p className="max-w-2xl text-base text-neutral-700">{vitrine.bio}</p>}
          {/* CDC art. 36 / CONAR: publicidade identificada */}
          <p className="max-w-2xl text-sm text-neutral-600">
            Publicidade: esta vitrine reúne indicações e @{slug} recebe comissão pelas vendas feitas por aqui, sem custo extra para você.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={linkWhatsapp(`Olha a minha vitrine: ${nome}\n${url}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${botao} bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]`}
            >
              Compartilhar no WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            <CopiarLink url={url} className={`${botao} border border-neutral-300 text-neutral-900`} />
            <Link href={linkDenuncia("vitrine", vitrine.id)} rel="nofollow" className={`${botao} min-h-11 border border-neutral-300 text-neutral-900`}>
              Denunciar
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-8">
        {/* atalhos para as seções (links comuns: funcionam sem JavaScript) */}
        {destaques.length + colecoes.length > 0 && (
          <nav aria-label="Seções da vitrine" className="-mt-4">
            <ul className="flex flex-wrap gap-2">
              {secoesNav.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 px-4 text-sm font-medium text-neutral-900"
                  >
                    {s.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {destaques.length > 0 && (
          <section id="destaques" aria-labelledby="titulo-destaques" className="scroll-mt-4">
            <h2 id="titulo-destaques" className={tituloSecao}>
              Destaques
            </h2>
            <GradeProdutos slug={slug} itens={destaques} />
          </section>
        )}

        {colecoes.map((c, i) => (
          <section key={c.nome} id={`colecao-${i + 1}`} aria-labelledby={`titulo-colecao-${i + 1}`} className="scroll-mt-4">
            <h2 id={`titulo-colecao-${i + 1}`} className={tituloSecao}>
              {c.nome}
            </h2>
            <GradeProdutos slug={slug} itens={c.itens} />
          </section>
        ))}

        <section aria-labelledby="titulo-produtos" className="scroll-mt-4">
          <h2 id="titulo-produtos" className={tituloSecao}>
            {destaques.length + colecoes.length > 0 ? "Todos os produtos" : "Produtos"}
          </h2>
          {todos.length === 0 ? (
            <p className="text-base text-neutral-600">Ainda não há produtos nesta vitrine.</p>
          ) : (
            <GradeProdutos slug={slug} itens={todos} />
          )}
        </section>

        {links.length > 0 && (
          <section aria-labelledby="titulo-indicacoes">
            <h2 id="titulo-indicacoes" className="text-base font-semibold">
              Minhas indicações
            </h2>
            <p className="mt-1 mb-4 text-sm text-neutral-600">
              Produtos de outras lojas. A compra, a entrega e o atendimento são feitos pelo outro site.
            </p>
            <ul className="grid gap-4 md:grid-cols-2">
              {links.map((link) => (
                <li key={link.id}>
                  <LinkRastreado href={link.url} vitrine={slug} linkId={link.id} className="group flex items-center gap-4">
                    {link.imagem_url ? (
                      // imagem de outro site: <img> simples (não passa pelo otimizador)
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={link.imagem_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-20 w-20 shrink-0 rounded-md bg-neutral-100 object-cover" />
                    ) : (
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-sm text-neutral-600">
                        {PLATAFORMAS[link.plataforma]}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="line-clamp-2 text-sm group-hover:underline">{link.titulo}</span>
                      {link.preco_centavos != null && <span className="text-base font-semibold">{formatarPreco(link.preco_centavos)}</span>}
                      <span className="text-sm text-neutral-600">
                        Publicidade · a compra acontece em outro site ({PLATAFORMAS[link.plataforma] ?? "outro site"}). Confira o preço lá: ele pode ter mudado.
                      </span>
                    </span>
                  </LinkRastreado>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
