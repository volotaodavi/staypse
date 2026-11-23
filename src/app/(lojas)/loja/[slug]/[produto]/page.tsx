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
import { classeBotaoLoja } from "@/components/loja";
import { linkWhatsapp } from "@/components/publico";
import { COOKIE_ATRIBUICAO, atribuicaoDoItem } from "@/lib/atribuicao";
import { linkDenuncia } from "@/lib/denuncias";
import { comprasAbertas } from "@/lib/pedidos";
import { formatarCnpj, formatarPreco, urlFoto } from "@/lib/produtor";
import { buscarLoja, buscarProduto } from "@/lib/publico";
import { supabaseUrl, urlDoSite } from "@/lib/supabase/env";
import { ROTULO_TIPO } from "@/lib/vitrine";

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
  const url = `${urlDoSite()}/loja/${slug}/${produto}`;
  const fotos = item.fotos.map((f) => urlFoto(supabaseUrl(), f));

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

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-6 md:grid-cols-2 md:pb-12">
      <GaleriaFotos fotos={fotos} nome={item.nome} />

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600">{ROTULO_TIPO[item.tipo] ?? item.tipo}</p>
          <h1 className="text-2xl font-semibold">{item.nome}</h1>
          <p className="text-2xl font-semibold">{formatarPreco(item.preco_centavos)}</p>
          {indicacao && (
            // CDC art. 36 / CONAR: a indicação é remunerada e isso fica claro
            <p className="text-sm text-neutral-600">
              <span data-indicacao>
                Indicado por <strong className="font-semibold text-neutral-900">@{indicacao.h}</strong>
              </span>
              <span className="block">Quem indicou recebe uma comissão se você comprar. O preço é o mesmo.</span>
            </p>
          )}
        </div>

        {/* desktop: botão no fluxo da página */}
        <div className="hidden flex-col gap-2 md:flex">
          {!abertas && <p className="text-sm text-neutral-600">Compras abrem em breve.</p>}
          {botaoComprar}
        </div>

        <a
          href={linkWhatsapp(`${item.nome} — ${formatarPreco(item.preco_centavos)}\n${url}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block py-2 text-sm font-semibold text-[var(--loja-link)] underline"
        >
          Enviar no WhatsApp
          <span className="sr-only"> (abre em nova aba)</span>
        </a>

        {item.descricao && (
          <section className="flex flex-col gap-2 border-t border-neutral-200 pt-6">
            <h2 className="text-base font-semibold">Descrição</h2>
            <p className="text-base whitespace-pre-line text-neutral-700">{item.descricao}</p>
          </section>
        )}

        <section className="flex flex-col gap-2 border-t border-neutral-200 pt-6">
          <h2 className="text-base font-semibold">Entrega</h2>
          <ul className="flex flex-col gap-1 text-sm text-neutral-700">
            {item.tipo === "fisico" ? (
              <>
                {item.prazo_postagem_dias != null && <li>Postagem em até {item.prazo_postagem_dias} dia(s) útil(eis) após o pagamento.</li>}
                {item.retirada_local && <li>Retirada no local, combinada com a loja.</li>}
              </>
            ) : (
              <li>Acesso liberado pela loja após a confirmação do pagamento.</li>
            )}
            <li>A loja emite nota fiscal de todas as vendas.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 border-t border-neutral-200 pt-6">
          <h2 className="text-base font-semibold">Trocas e devoluções</h2>
          <p className="text-sm text-neutral-700">
            Você pode desistir da compra em até 7 dias depois de receber o produto (Código de Defesa do Consumidor,
            art. 49) e recebe de volta tudo o que pagou, inclusive o frete. A garantia contra defeitos segue o CDC.
          </p>
        </section>

        {/* Decreto 7.962/2013: nome empresarial, CNPJ, endereço físico e eletrônico */}
        <section className="flex flex-col gap-2 border-t border-neutral-200 pt-6">
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
          <Link href={`/loja/${slug}`} className="inline-block py-2 text-sm font-semibold text-[var(--loja-link)] underline">
            Ver todos os produtos da loja
          </Link>
          <Link href={linkDenuncia("item", item.id)} rel="nofollow" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--loja-link)] underline">
            Denunciar este produto
          </Link>
          <Link href={linkDenuncia("loja", loja.id)} rel="nofollow" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-[var(--loja-link)] underline">
            Denunciar esta loja
          </Link>
        </section>
      </div>

      {/* celular: barra de compra presa ao rodapé da tela enquanto o produto está
          visível; "sticky" (e não "fixed") para nunca cobrir o rodapé legal */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-base font-semibold">{formatarPreco(item.preco_centavos)}</p>
            {!abertas && <p className="text-sm text-neutral-600">Em breve</p>}
          </div>
          {botaoComprar}
        </div>
      </div>
    </main>
  );
}
