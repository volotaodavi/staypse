import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { proximoSeguro } from "@/lib/redirecionamento";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const proximo = proximoSeguro(params.proximo);
  const linkInvalido = params.erro === "link";

  return (
    <>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center bg-gelo px-4 py-12">
        <section className="w-full max-w-md rounded-3xl bg-branco p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl">Entrar</h1>
          <p className="mt-1 mb-6 text-petroleo/75">Acesse seu painel na Staypse.</p>

          {linkInvalido && (
            <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              O link expirou ou já foi usado. Peça um novo abaixo.
            </p>
          )}

          <FormEntrar proximo={proximo} />

          <p className="mt-6 text-center text-sm">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium underline">
              Criar conta
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
