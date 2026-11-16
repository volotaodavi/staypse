import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { FormCadastro } from "./FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <Cabecalho />
      <main className="flex flex-1 items-start justify-center bg-gelo px-4 py-12">
        <section className="w-full max-w-md rounded-3xl bg-branco p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl">Criar conta</h1>
          <p className="mt-1 mb-6 text-petroleo/75">Grátis, sem taxa de adesão.</p>
          <FormCadastro />
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
