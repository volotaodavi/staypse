// Checkout: /loja/[loja]/[produto]/comprar — dentro da loja (mesma identidade visual).
// Fechado enquanto o pagamento (Etapa 6) não estiver ligado: COMPRAS_ABERTAS.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatarPreco } from "@/lib/produtor";
import { comprasAbertas } from "@/lib/pedidos";
import { usuarioAtual } from "@/lib/papeis";
import { buscarProduto } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormCompra } from "./FormCompra";

export const instant = false;
export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function Comprar({ params }: PageProps<"/loja/[slug]/[produto]/comprar">) {
  if (!comprasAbertas()) notFound();
  const { slug, produto } = await params;
  const item = await buscarProduto(slug, produto);
  if (!item) notFound();

  const supabase = await criarClienteServidor();
  const [{ data: opcoes }, usuario, { data: podeVender }] = await Promise.all([
    supabase.rpc("entregas_do_item", { p_item: item.id }).maybeSingle<{
      envio: boolean;
      retirada: boolean;
      digital: boolean;
      frete_fixo_centavos: number | null;
      frete_gratis_acima_centavos: number | null;
      frete_prazo_dias: number | null;
    }>(),
    usuarioAtual(),
    // sem recebedor aprovado na Lytex, a loja não recebe pedido novo
    supabase.rpc("loja_pode_vender", { p_item: item.id }),
  ]);
  const temEntrega = opcoes && (opcoes.envio || opcoes.retirada || opcoes.digital);

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href={`/loja/${slug}/${produto}`} className="inline-block py-2 text-sm font-semibold text-[var(--loja-link)] underline">
        ← Voltar ao produto
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Finalizar compra</h1>
        <p className="mt-1 text-base text-neutral-700">
          {item.nome} · {formatarPreco(item.preco_centavos)}
        </p>
      </div>
      {!podeVender ? (
        <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta loja ainda não pode receber pagamentos. Volte mais tarde ou fale com a loja.
        </p>
      ) : !temEntrega ? (
        <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A loja ainda não configurou a entrega deste produto. Fale com a loja ou volte mais tarde.
        </p>
      ) : (
        <FormCompra
          item={item.id}
          loja={slug}
          produto={produto}
          opcoes={opcoes}
          inicial={{ nome: usuario?.nome ?? "", email: usuario?.email ?? "" }}
        />
      )}
    </main>
  );
}
