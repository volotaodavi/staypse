// Página pública do produto: /p/[slug]  (com ?a=[codigo] quando vem de um afiliado)
// O código do afiliado é guardado em cookie pelo proxy (src/proxy.ts) e o
// clique é contado no navegador (RegistraVisita) — assim a página fica em cache.
// Ainda NÃO há compra: o botão fica desativado e leva à lista de espera.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { BotaoWhatsapp, FotoItem } from "@/components/publico";
import { RegistraVisita } from "@/components/rastreio";
import { formatarPreco } from "@/lib/produtor";
import { buscarItem } from "@/lib/publico";
import { urlDoSite } from "@/lib/supabase/env";
import { ROTULO_TIPO } from "@/lib/vitrine";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await buscarItem(slug);
  if (!item) return { title: "Produto não encontrado", robots: { index: false } };
  const descricao = `${formatarPreco(item.preco_centavos)} · Vendido por ${item.produtor_nome}. ${item.descricao ?? ""}`.slice(0, 200);
  return {
    title: item.nome,
    description: descricao,
    alternates: { canonical: `/p/${slug}` },
    openGraph: { type: "website", url: `/p/${slug}`, title: item.nome, description: descricao },
  };
}

export default async function Produto({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const item = await buscarItem(slug);
  if (!item) notFound();
  const url = `${urlDoSite()}/p/${slug}`;

  return (
    <>
      <Cabecalho preLancamento />
      <RegistraVisita item={item.slug} />
      <main className="flex flex-1 flex-col bg-gelo">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:grid-cols-2 md:py-10">
          {/* fotos: a primeira grande; as demais em faixa rolável */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="overflow-hidden rounded-3xl">
              <FotoItem caminho={item.fotos[0]} alt={item.nome} prioridade sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
            {item.fotos.length > 1 && (
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {item.fotos.slice(1).map((foto, i) => (
                  <li key={foto} className="w-24 shrink-0 overflow-hidden rounded-xl">
                    <FotoItem caminho={foto} alt={`${item.nome} — foto ${i + 2}`} sizes="96px" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <p className="text-sm text-petroleo/70">{ROTULO_TIPO[item.tipo] ?? item.tipo}</p>
              <h1 className="text-3xl leading-tight">{item.nome}</h1>
              <p className="mt-2 text-3xl font-extrabold">{formatarPreco(item.preco_centavos)}</p>
              <p className="mt-2 text-sm text-petroleo/80">
                Vendido por{" "}
                {item.loja_slug ? (
                  <Link href={`/loja/${item.loja_slug}`} className="font-medium underline">
                    {item.produtor_nome}
                  </Link>
                ) : (
                  <span className="font-medium">{item.produtor_nome}</span>
                )}{" "}
                · pagamento pela Staypse
              </p>
            </div>

            {/* compra ainda fechada: nada de checkout de mentira */}
            <div className="flex flex-col gap-2 rounded-3xl bg-branco p-4">
              <button type="button" disabled className="w-full cursor-not-allowed rounded-full bg-petroleo/20 px-6 py-3 font-medium text-petroleo/70">
                Comprar
              </button>
              <Link href="/#lista" className="w-full rounded-full bg-ciano px-6 py-3 text-center font-medium text-petroleo hover:brightness-95">
                Compras abrem em breve — entre na lista de espera
              </Link>
            </div>

            <BotaoWhatsapp texto={`${item.nome} — ${formatarPreco(item.preco_centavos)}\nVendido por ${item.produtor_nome}.\n${url}`} rotulo="Enviar no WhatsApp" />

            {item.descricao && (
              <section>
                <h2 className="text-lg">Descrição</h2>
                <p className="mt-1 whitespace-pre-line text-petroleo/85">{item.descricao}</p>
              </section>
            )}

            <section className="rounded-3xl bg-branco p-4 text-sm">
              <h2 className="text-lg">Entrega e garantias</h2>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-petroleo/85">
                {item.tipo === "fisico" ? (
                  <>
                    {item.prazo_postagem_dias != null && (
                      <li>O produtor posta o pedido em até {item.prazo_postagem_dias} dia(s) úteis após a confirmação do pagamento.</li>
                    )}
                    {item.retirada_local && <li>Também há opção de retirada no local, combinada com o produtor.</li>}
                  </>
                ) : (
                  <li>Produto digital: o acesso é liberado pelo produtor após a confirmação do pagamento.</li>
                )}
                <li>O produtor emite nota fiscal de todas as vendas.</li>
                <li>
                  Direito de arrependimento: você pode desistir da compra em até 7 dias após o recebimento (Código de
                  Defesa do Consumidor, art. 49), com reembolso integral.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
