// "Página da Lytex" SIMULADA (só com PAYMENTS_PROVIDER=mock e fora de produção).
// Faz o papel do onboarding do recebedor: aprova, recusa ou suspende — e manda
// o webhook ASSINADO para o nosso endereço, como a Lytex de verdade fará.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { simuladorAtivo } from "@/lib/pagamentos";
import { ROTULO_STATUS_RECEBEDOR } from "@/lib/pagamentos/recebedores";
import type { StatusRecebedor } from "@/lib/pagamentos/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarEventoSimulado } from "./acoes";

export const instant = false;
export const metadata: Metadata = { title: "Simulador de pagamentos", robots: { index: false } };

export default async function SimuladorRecebedor({ params, searchParams }: PageProps<"/simulador-pagamentos/recebedor/[id]">) {
  if (!simuladorAtivo()) notFound();
  const { id } = await params;
  const { volta, msg } = await searchParams;
  const { data: r } = await criarClienteAdmin()
    .from("recebedores")
    .select("papel, documento, status_recebedor, motivo")
    .eq("provedor", "mock")
    .eq("provedor_id", id)
    .maybeSingle();
  if (!r) notFound();
  const voltar = typeof volta === "string" && /^\/painel\/[a-z/-]*$/.test(volta) ? volta : "/painel";

  return (
    <>
      <Cabecalho logado />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <section className="flex w-full max-w-md flex-col gap-4 rounded-3xl border-2 border-dashed border-petroleo/40 bg-branco p-6">
          <p className="text-sm font-medium text-petroleo/75">Ambiente de teste · simula a Lytex</p>
          <h1 className="text-2xl">Cadastro de recebimento</h1>
          <p className="text-sm">
            Papel: {r.papel} · documento {r.documento}
            <br />
            Situação:{" "}
            <strong className="font-medium" data-status-recebedor>
              {ROTULO_STATUS_RECEBEDOR[r.status_recebedor as StatusRecebedor]}
            </strong>
            {r.motivo && <span className="block text-petroleo/75">Motivo: {r.motivo}</span>}
          </p>
          {typeof msg === "string" && (
            <p role="status" className="rounded-xl bg-gelo px-3 py-2 text-sm">
              {msg}
            </p>
          )}
          <form action={enviarEventoSimulado} className="flex flex-col gap-3">
            <input type="hidden" name="provedor_id" value={id} />
            <input type="hidden" name="volta" value={voltar} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Motivo (para recusar ou suspender)
              <input
                name="motivo"
                maxLength={200}
                defaultValue="Documento do titular não confere."
                className="min-h-11 rounded-xl border border-petroleo/60 px-3 font-normal"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button name="status" value="aprovado" className="min-h-11 rounded-full bg-petroleo px-5 font-medium text-branco">
                Aprovar (webhook)
              </button>
              <button name="status" value="recusado" className="min-h-11 rounded-full border border-petroleo px-5 font-medium">
                Recusar
              </button>
              <button name="status" value="suspenso" className="min-h-11 rounded-full border border-petroleo px-5 font-medium">
                Suspender
              </button>
            </div>
          </form>
          <a href={voltar} className="inline-block py-2 text-sm font-medium underline">
            Voltar para a Staypse
          </a>
        </section>
      </main>
    </>
  );
}
