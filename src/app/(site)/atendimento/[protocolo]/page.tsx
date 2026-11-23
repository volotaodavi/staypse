// Acompanhar atendimento: /atendimento/[protocolo]?t=[token secreto]
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { CopiarLink } from "@/components/rastreio";
import { ASSUNTOS_ATENDIMENTO, data, dataHora } from "@/lib/pedidos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/supabase/env";

export const instant = false;
export const metadata: Metadata = { title: "Seu atendimento", robots: { index: false } };

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATUS: Record<string, string> = { aberto: "Aberto: aguardando resposta", respondido: "Respondido", encerrado: "Encerrado" };

type Atendimento = {
  protocolo: string;
  assunto: string;
  mensagem: string;
  status: string;
  resposta: string | null;
  respondido_em: string | null;
  prazo_ate: string;
  criado_em: string;
};

export default async function VerAtendimento({ params, searchParams }: PageProps<"/atendimento/[protocolo]">) {
  const { protocolo } = await params;
  const sp = await searchParams;
  const token = um(sp.t) ?? "";
  if (!/^[0-9]{8}-[A-Za-z0-9]{6}$/.test(protocolo) || !/^[0-9a-f]{64}$/.test(token)) redirect("/atendimento");
  const { data: a } = await criarClienteAdmin()
    .rpc("ver_atendimento", { p_protocolo: protocolo, p_token: token })
    .maybeSingle<Atendimento>();
  if (!a) redirect("/atendimento");

  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <div className="flex w-full max-w-xl flex-col gap-4">
          {um(sp.novo) === "1" && (
            <section className="flex flex-col gap-3 rounded-2xl bg-petroleo p-6 text-branco">
              <h2 className="text-2xl text-ciano">Recebemos sua mensagem</h2>
              <p className="text-gelo/90">
                Protocolo <strong className="font-medium text-branco">{a.protocolo}</strong>. Respondemos até {data(a.prazo_ate)}.
                Guarde este link para ver a resposta.
              </p>
              <CopiarLink
                url={`${urlDoSite()}/atendimento/${a.protocolo}?t=${token}`}
                rotulo="Copiar link do atendimento"
                className="w-fit rounded-full bg-ciano px-5 py-3 text-sm font-medium text-petroleo"
              />
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-2xl bg-branco p-6 text-sm">
            <p className="text-petroleo/75">Protocolo {a.protocolo}</p>
            <h1 className="text-2xl">{STATUS[a.status] ?? a.status}</h1>
            <p className="text-petroleo/80">
              {ASSUNTOS_ATENDIMENTO[a.assunto]}, aberto em {dataHora(a.criado_em)}, resposta até {data(a.prazo_ate)}
            </p>
            <div className="rounded-2xl bg-gelo p-4">
              <p className="font-medium">Sua mensagem</p>
              <p className="mt-1 whitespace-pre-line">{a.mensagem}</p>
            </div>
            {a.resposta ? (
              <div className="rounded-2xl border border-petroleo/20 p-4" data-resposta>
                <p className="font-medium">Resposta de {dataHora(a.respondido_em)}</p>
                <p className="mt-1 whitespace-pre-line">{a.resposta}</p>
              </div>
            ) : (
              <p className="text-petroleo/80">Ainda sem resposta. Volte a este link para acompanhar.</p>
            )}
            <Link href="/atendimento" className="inline-block py-2 font-medium underline">
              Abrir outro atendimento
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
