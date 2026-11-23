// Encontrar meu pedido: código + e-mail da compra geram um link novo.
import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { FormEncontrar } from "./FormEncontrar";

export const metadata: Metadata = { title: "Encontrar meu pedido", robots: { index: false } };
export const instant = false;

export default async function EncontrarPedido({ searchParams }: PageProps<"/pedido">) {
  const { invalido } = await searchParams;
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center bg-gelo px-4 py-12">
        <section className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-branco p-6 sm:p-8">
          <h1 className="text-3xl">Encontrar meu pedido</h1>
          <p className="text-petroleo/80">
            Use o código do pedido (10 letras e números) e o e-mail que você informou na compra. Geramos um link novo e o
            antigo deixa de valer.
          </p>
          {invalido && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              Esse link não vale mais. Peça um novo abaixo.
            </p>
          )}
          <FormEncontrar />
        </section>
      </main>
    </>
  );
}
