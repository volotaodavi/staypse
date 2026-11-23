// Destino de quem tem a conta suspensa: mostra o motivo e leva ao atendimento.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { usuarioAtual } from "@/lib/papeis";

export const metadata: Metadata = { title: "Conta suspensa", robots: { index: false } };
export const instant = false;

export default async function ContaSuspensa() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (!usuario.suspensoMotivo) redirect("/painel");
  return (
    <>
      <Cabecalho logado />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <section className="flex h-fit w-full max-w-xl flex-col gap-4 rounded-3xl bg-branco p-6 sm:p-8">
          <h1 className="text-3xl">Conta suspensa</h1>
          <p>Sua conta está suspensa e os painéis ficam indisponíveis.</p>
          <p className="rounded-xl bg-gelo px-4 py-3 text-sm">Motivo informado: {usuario.suspensoMotivo}</p>
          <p className="text-sm text-petroleo/80">Se acha que foi um engano, fale com a gente pelo atendimento.</p>
          <Link href="/atendimento" className="inline-flex min-h-11 w-fit items-center rounded-full bg-petroleo px-6 font-medium text-branco">
            Falar com o atendimento
          </Link>
        </section>
      </main>
    </>
  );
}
