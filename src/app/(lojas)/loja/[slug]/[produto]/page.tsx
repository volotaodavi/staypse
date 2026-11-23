// Produto dentro do site da loja: /loja/[loja]/[produto]
// Quem chega por um link de afiliado (/@ana/produto) é redirecionado para cá,
// SEM o código na barra de endereço; a indicação fica no cookie de atribuição.
// Com COMPRAS_ABERTAS=1 o botão leva ao checkout; antes disso, à lista de espera
// (nada de checkout que não pode ser pago).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GaleriaFotos } from "@/components/GaleriaFotos";
import { ProdutosDaLoja, classeBotaoLoja } from "@/components/loja";
import { linkWhatsapp } from "@/components/publico";
import { COOKIE_ATRIBUICAO, atribuicaoDoItem } from "@/lib/atribuicao";
import { linkDenuncia } from "@/lib/denuncias";
import { comprasAbertas } from "@/lib/pedidos";
import { formatarCnpj, formatarPreco, urlFoto } from "@/lib/produtor";
import { buscarEntrega, buscarLoja, buscarProduto, type EntregaProduto } from "@/lib/publico";
import { supabaseUrl, urlDoSite } from "@/lib/supabase/env";
import { ROTULO_TIPO } from "@/lib/vitrine";

// Ícones de linha (24px, traço 1.5), todos da mesma família
function Icone({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-neutral-600">
      <path d={d} />
    </svg>
  );
}
const ICONES = {
  loja: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3M10 20v-5h4v5",
  cartao: "M3 6h18v12H3zM3 10h18M7 15h3",
  volta: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  nota: "M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21zM10 8h4M10 12h4",
  caixa: "M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10",
  nuvem: "M7 18a4 4 0 01-.5-8 5.5 5.5 0 0110.7-1A4.5 4.5 0 0117 18zM12 11v5m0 0l-2-2m2 2l2-2",
  ponto: "M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4",
};

// Frete e prazo reais da loja (mesma regra do checkout: frete fixo, grátis acima de X, ou a loja assume o frete)
function linhasEntrega(tipo: string, prazoPostagem: number | null, retirada: boolean, e: EntregaProduto | null) {
  const linhas: { icone: keyof typeof ICONES; titulo: string; texto?: string }[] = [];
  if (tipo !== "fisico") {
    linhas.push({ icone: "nuvem", titulo: "Entrega digital", texto: "Acesso liberado pela loja depois da confirmação do pagamento." });
    return linhas;
  }
  if (e?.envio && e.frete_fixo_centavos != null) {
    const gratis = e.frete_fixo_centavos === 0;
    linhas.push({
      icone: "caixa",
      titulo: gratis ? "Frete grátis" : `Frete ${formatarPreco(e.frete_fixo_centavos)}`,
      texto: [
        e.frete_quem_paga === "loja" ? "A loja paga o envio." : "",
        !gratis && e.frete_gratis_acima_centavos ? `Grátis em compras a partir de ${formatarPreco(e.frete_gratis_acima_centavos)}.` : "",
        prazoPostagem != null ? `Postagem em até ${prazoPostagem} dia(s) útil(eis) depois do pagamento.` : "",
        e.frete_prazo_dias ? `Chega em até ${e.frete_prazo_dias} dia(s) útil(eis) depois da postagem.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  } else if (prazoPostagem != null) {
    linhas.push({ icone: "caixa", titulo: "Envio", texto: `Postagem em até ${prazoPostagem} dia(s) útil(eis) depois do pagamento.` });
  }
  if (retirada) linhas.push({ icone: "ponto", titulo: "Retirada no local", texto: "Sem frete. A loja combina local e horário com você." });
  return linhas;
}


export const instant = false;

export async function generateMetadata({ params }: PageProps<"/loja/[slug]/[produto]">): Promise<Metadata> {
  const { slug, produto } = await params;
  const [item, dados] = await Promise.all([buscarProduto(slug, produto), buscarLoja(slug)]);
  if (!item || !dados) return { title: "Produto não encontrado", robots: { index: false } };
  const descricao = `${formatarPreco(item.preco_centavos)} · ${dados.loja.loja_nome}. ${item.descricao ?? ""}`.slice(0, 200);
  return {
    title: { absolute: `${item.nome} | ${dados.loja.loja_nome}` },
    description: descricao,
    alternates: { canonical: `/loja/${slug}/${produto}` },
    openGraph: { type: "website", url: `/loja/${slug}/${produto}`, siteName: dados.loja.loja_nome, title: item.nome, description: descricao },
  };
}

export default async function PaginaProduto({ params }: PageProps<"/loja/[slug]/[produto]">) {
  const { slug, produto } = await params;
  const [item, dados, jar] = await Promise.all([buscarProduto(slug, produto), buscarLoja(slug), cookies()]);
  if (!item || !dados) notFound();
  const { loja } = dados;
  // a indicação vence em 30 dias: a conferência usa a hora do acesso
  await connection();
  const indicacao = atribuicaoDoItem(jar.get(COOKIE_ATRIBUICAO)?.value, item.id);
  const entrega = await buscarEntrega(item.id);
  const url = `${urlDoSite()}/loja/${slug}/${produto}`;
  const fotos = item.fotos.map((f) => urlFoto(supabaseUrl(), f));
  // outros produtos da mesma loja: os da mesma categoria primeiro
  const outros = dados.itens
    .filter((i) => i.id !== item.id)
    .sort((a, b) => Number(b.categoria === item.categoria) - Number(a.categoria === item.categoria))
    .slice(0, 4);
  const linhas = linhasEntrega(item.tipo, item.prazo_postagem_dias, item.retirada_local, entrega);

  const abertas = comprasAbertas();
  const botaoComprar = abertas ? (
    <Link href={`/loja/${slug}/${produto}/comprar`} className={`${classeBotaoLoja} w-full`}>
      Comprar
    </Link>
  ) : (
    <Link href="/#lista" className={`${classeBotaoLoja} w-full`}>
      Entrar na lista de espera
    </Link>
  );
  const secao = "flex flex-col gap-2 border-t border-neutral-200 pt-6";

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-2 md:pb-12">
      <nav aria-label="Você está em" className="text-sm text-neutral-700">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li>
            <Link href={`/loja/${slug}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
              {loja.loja_nome}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="min-w-0 truncate">
            {item.nome}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="min-w-0 md:sticky md:top-4 md:self-start">
          <GaleriaFotos fotos={fotos} nome={item.nome} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-700">{ROTULO_TIPO[item.tipo] ?? item.tipo}</p>
            <h1 className="text-2xl leading-tight font-semibold text-balance md:text-3xl">{item.nome}</h1>
            <p className="text-3xl font-semibold tabular-nums">{formatarPreco(item.preco_centavos)}</p>
            {indicacao && (
              // CDC art. 36 / CONAR: a indicação é remunerada e isso fica claro
              <p className="text-sm text-neutral-700">
                <span data-indicacao>
                  Indicado por <strong className="font-semibold text-neutral-900">@{indicacao.h}</strong>
                </span>
                <span className="block">Quem indicou recebe uma comissão se você comprar. O preço é o mesmo.</span>
              </p>
            )}
          </div>

          {/* desktop: botão no fluxo da página */}
          <div className="hidden flex-col gap-2 md:flex">
            {!abertas && <p className="text-sm text-neutral-700">Compras abrem em breve.</p>}
            {botaoComprar}
          </div>

          {linhas.length > 0 && (
            <section aria-labelledby="entrega" className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
              <h2 id="entrega" className="text-base font-semibold">
                Entrega
              </h2>
              <ul className="flex flex-col gap-3">
                {linhas.map((l) => (
                  <li key={l.titulo} className="flex gap-3">
                    <Icone d={ICONES[l.icone]} />
                    <span className="text-sm leading-5 text-neutral-800">
                      <span className="block font-medium">{l.titulo}</span>
                      {l.texto && <span className="block text-neutral-700">{l.texto}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* confiança: só o que a Staypse e a loja garantem de fato */}
          <section aria-label="Compra segura" className="rounded-lg bg-neutral-50 p-4">
            <ul className="flex flex-col gap-3 text-sm leading-5 text-neutral-800">
              <li className="flex gap-3">
                <Icone d={ICONES.loja} />
                <span>
                  <span className="block font-medium">Loja oficial {loja.loja_nome}</span>
                  <span className="block text-neutral-700">Quem vende e entrega é a própria loja.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Icone d={ICONES.cartao} />
                <span>
                  <span className="block font-medium">Pagamentos processados pela Lytex</span>
                  <span className="block text-neutral-700">Você não digita dados de cartão nesta página.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Icone d={ICONES.volta} />
                <span>
                  <span className="block font-medium">Arrependimento em 7 dias</span>
                  <Link href="/reembolso" className="inline-flex min-h-11 items-center text-neutral-900 underline underline-offset-4">
                    Ver política de reembolso
                  </Link>
                </span>
              </li>
              <li className="flex gap-3">
                <Icone d={ICONES.nota} />
                <span className="font-medium">A loja emite nota fiscal de todas as vendas</span>
              </li>
            </ul>
          </section>

          {item.descricao && (
            <section className={secao}>
              <h2 className="text-base font-semibold">Descrição</h2>
              <p className="max-w-prose text-base leading-7 whitespace-pre-line text-neutral-800">{item.descricao}</p>
            </section>
          )}

          <section className={secao}>
            <h2 className="text-base font-semibold">Trocas e devoluções</h2>
            <p className="max-w-prose text-sm leading-6 text-neutral-700">
              Você pode desistir da compra em até 7 dias depois de receber o produto (Código de Defesa do Consumidor,
              art. 49) e recebe de volta tudo o que pagou, inclusive o frete. A garantia contra defeitos segue o CDC.
            </p>
          </section>

          {/* Decreto 7.962/2013: nome empresarial, CNPJ, endereço físico e eletrônico */}
          <section className={secao}>
            <h2 className="text-base font-semibold">Quem vende</h2>
            <address className="flex flex-col gap-0.5 text-sm text-neutral-700 not-italic">
              <span>
                {loja.razao_social} · CNPJ {formatarCnpj(loja.cnpj)}
              </span>
              {(loja.endereco || loja.cidade) && (
                <span>{[loja.endereco, [loja.cidade, loja.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ")}</span>
              )}
              {loja.email_contato && <span>{loja.email_contato}</span>}
            </address>
            <div className="flex flex-wrap gap-x-6">
              <a
                href={linkWhatsapp(`${item.nome} — ${formatarPreco(item.preco_centavos)}\n${url}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--loja-link)] underline"
              >
                Enviar no WhatsApp
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
              <Link href={linkDenuncia("item", item.id)} rel="nofollow" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--loja-link)] underline">
                Denunciar este produto
              </Link>
              <Link href={linkDenuncia("loja", loja.id)} rel="nofollow" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--loja-link)] underline">
                Denunciar esta loja
              </Link>
            </div>
          </section>
        </div>
      </div>

      <ProdutosDaLoja slug={slug} itens={outros} />

      {/* celular: barra de compra presa ao rodapé da tela. É "sticky" dentro do <main>
          (e não "fixed"): fica sempre visível ao rolar, ocupa o próprio espaço e nunca
          cobre o conteúdo nem o rodapé legal. O recuo de baixo respeita a área segura. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-neutral-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-lg font-semibold tabular-nums">{formatarPreco(item.preco_centavos)}</p>
            {!abertas && <p className="text-sm text-neutral-700">Em breve</p>}
          </div>
          {botaoComprar}
        </div>
      </div>
    </main>
  );
}
