// Produto dentro do site da loja: /loja/[loja]/[produto]
// Quem chega por um link de afiliado (/@ana/produto) é redirecionado para cá,
// SEM o código na barra de endereço; a indicação fica no cookie de atribuição.
// Compra ainda fechada: o botão leva à lista de espera (nada de checkout falso).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GaleriaFotos } from "@/components/GaleriaFotos";
import { classeBotaoLoja } from "@/components/loja";
import { linkWhatsapp } from "@/components/publico";
import { COOKIE_ATRIBUICAO, atribuicaoDoItem } from "@/lib/atribuicao";
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
  const indicacao = atribuicaoDoItem(jar.get(COOKIE_ATRIBUICAO)?.value, item.id);
  const url = `${urlDoSite()}/loja/${slug}/${produto}`;
  const fotos = item.fotos.map((f) => urlFoto(supabaseUrl(), f));

  const botaoComprar = (
    <Link href="/#lista" className={`${classeBotaoLoja} w-full`}>
      Entrar na lista de espera
    </Link>
  );

  return (
    // pb-28 no celular: espaço para a barra de compra fixa
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-6 pb-28 md:grid-cols-2 md:pb-12">
      <GaleriaFotos fotos={fotos} nome={item.nome} />

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600">{ROTULO_TIPO[item.tipo] ?? item.tipo}</p>
          <h1 className="text-2xl font-semibold">{item.nome}</h1>
          <p className="text-2xl font-semibold">{formatarPreco(item.preco_centavos)}</p>
          {indicacao && (
            <p className="text-sm text-neutral-600" data-indicacao>
              Indicado por{" "}
              <a href={`/@${indicacao.h}`} className="font-semibold text-[var(--loja-link)] underline">
                @{indicacao.h}
              </a>
            </p>
          )}
        </div>

        {/* desktop: botão no fluxo da página */}
        <div className="hidden flex-col gap-2 md:flex">
          <p className="text-sm text-neutral-600">Compras abrem em breve.</p>
          {botaoComprar}
        </div>

        <a
          href={linkWhatsapp(`${item.nome} — ${formatarPreco(item.preco_centavos)}\n${url}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[var(--loja-link)] underline"
        >
          Enviar no WhatsApp
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
            art. 49) e recebe o valor de volta integralmente.
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t border-neutral-200 pt-6">
          <h2 className="text-base font-semibold">Quem vende</h2>
          <p className="text-sm text-neutral-700">
            {loja.razao_social} · CNPJ {formatarCnpj(loja.cnpj)}
            {loja.cidade && ` · ${loja.cidade}/${loja.uf}`}
          </p>
          <Link href={`/loja/${slug}`} className="text-sm font-semibold text-[var(--loja-link)] underline">
            Ver todos os produtos da loja
          </Link>
        </section>
      </div>

      {/* celular: barra de compra fixa no rodapé */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-base font-semibold">{formatarPreco(item.preco_centavos)}</p>
            <p className="text-sm text-neutral-600">Em breve</p>
          </div>
          {botaoComprar}
        </div>
      </div>
    </main>
  );
}
