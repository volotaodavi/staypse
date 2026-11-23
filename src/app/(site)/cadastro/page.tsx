import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { proximoSeguro } from "@/lib/redirecionamento";
import { FormCadastro } from "./FormCadastro";

// Fora do Google: no pré-lançamento só entra quem recebeu o link.
export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };
// lê ?proximo= (ex.: vindo de um convite de vendedor)
export const instant = false;

export default async function PaginaCadastro({ searchParams }: PageProps<"/cadastro">) {
  const { proximo: bruto } = await searchParams;
  const proximo = typeof bruto === "string" ? proximoSeguro(bruto) : undefined;
  return (
    <>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center bg-gelo px-4 py-12">
        <section className="w-full max-w-md rounded-3xl bg-branco p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl">Criar conta</h1>
          <p className="mt-1 mb-6 text-petroleo/75">Grátis, sem taxa de adesão.</p>
          <FormCadastro proximo={proximo} />
          <p className="mt-6 text-center text-sm">
            Já tem conta?{" "}
            <Link href="/entrar" className="font-medium underline">
              Entrar
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
