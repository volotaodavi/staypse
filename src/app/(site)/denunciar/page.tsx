// Denunciar um produto, uma loja ou uma vitrine: /denunciar?tipo=item&id=...
// Formulário simples, sem login. A denúncia vai para a fila do admin.
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { ALVOS_DENUNCIA, UUID } from "@/lib/denuncias";
import { usuarioAtual } from "@/lib/papeis";
import { FormDenuncia } from "./FormDenuncia";

export const metadata: Metadata = { title: "Denunciar", robots: { index: false } };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Denunciar({ searchParams }: PageProps<"/denunciar">) {
  const sp = await searchParams;
  const usuario = await usuarioAtual();
  const tipo = um(sp.tipo);
  const id = um(sp.id);
  const valido = Object.hasOwn(ALVOS_DENUNCIA, tipo) && UUID.test(id);

  return (
    <>
      <Cabecalho logado={Boolean(usuario)} />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <section className="flex h-fit w-full max-w-xl flex-col gap-4 rounded-3xl bg-branco p-6 sm:p-8">
          <h1 className="text-3xl">Denunciar</h1>
          {valido ? (
            <>
              <p className="text-petroleo/80">
                Você está denunciando {tipo === "loja" ? "uma" : "um"} {ALVOS_DENUNCIA[tipo as keyof typeof ALVOS_DENUNCIA]}. A equipe analisa cada denúncia.
              </p>
              <FormDenuncia tipo={tipo} id={id} />
            </>
          ) : (
            <p>Não encontramos o que você quer denunciar. Volte à página e toque em &quot;Denunciar&quot; de novo.</p>
          )}
          <Link href="/" className="inline-flex min-h-11 w-fit items-center text-sm underline">
            Ir para o início
          </Link>
        </section>
      </main>
    </>
  );
}
