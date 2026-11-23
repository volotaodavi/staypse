// Admin: SAC e pedidos LGPD, do prazo mais curto para o mais longo.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { ASSUNTOS_ATENDIMENTO, data, dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { responderAtendimentoAdmin } from "../operacao";

export const metadata = { title: "Atendimentos" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminAtendimentos({ searchParams }: PageProps<"/admin/atendimentos">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const todos = um(sp.todos) === "1";
  const vencidos = um(sp.vencidos) === "1";
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("atendimentos")
    .select("id, protocolo, nome, email, assunto, mensagem, status, resposta, respondido_em, prazo_ate, criado_em, pedido_id")
    .order("prazo_ate")
    .limit(200);
  if (!todos) consulta = consulta.neq("status", "encerrado");
  // fila "vencidos": ainda abertos depois do prazo de resposta
  if (vencidos) consulta = consulta.eq("status", "aberto").lt("prazo_ate", new Date().toISOString());
  const { data: lista, error } = await consulta;
  if (error) throw new Error(`Atendimentos indisponíveis: ${error.message}`);
  const agora = new Date().toISOString();

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">Atendimentos</h1>
        <Link href={todos ? "/admin/atendimentos" : "/admin/atendimentos?todos=1"} className="inline-block py-2 text-sm underline">
          {todos ? "Só os abertos" : "Ver também os encerrados"}
        </Link>
      </div>
      {vencidos && (
        <p className="rounded-xl bg-branco px-4 py-3 text-sm">
          Fila: atendimentos abertos com o prazo de resposta vencido.{" "}
          <Link href="/admin/atendimentos" className="inline-flex min-h-11 items-center font-medium underline">
            Ver todos
          </Link>
        </p>
      )}
      <p className="text-sm text-petroleo/80">
        Prazo: 5 dias para responder (Decreto 7.962/2013). Pedidos sobre dados pessoais: até 15 dias (LGPD).
      </p>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}
      {um(sp.erro) && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {um(sp.erro)}
        </p>
      )}
      {!lista?.length ? (
        <p className="rounded-2xl bg-branco p-4 text-sm">Nenhum atendimento.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((a) => {
            const atrasado = a.status === "aberto" && a.prazo_ate < agora;
            return (
              <li key={a.id} className="flex flex-col gap-2 rounded-3xl bg-branco p-5 text-sm">
                <p className={atrasado ? "font-medium text-red-800" : "text-petroleo/75"}>
                  {a.protocolo} · {ASSUNTOS_ATENDIMENTO[a.assunto]} · {a.status}
                  {a.status === "aberto" && ` · responder até ${data(a.prazo_ate)}${atrasado ? " (atrasado)" : ""}`}
                </p>
                <p className="font-medium">
                  {a.nome} ({a.email}){a.pedido_id ? " · ligado a um pedido" : ""}
                </p>
                <p className="whitespace-pre-line">{a.mensagem}</p>
                {a.resposta && (
                  <p className="rounded-xl bg-gelo px-3 py-2">
                    Resposta ({dataHora(a.respondido_em)}): {a.resposta}
                  </p>
                )}
                {a.status !== "encerrado" && (
                  <form action={responderAtendimentoAdmin} className="flex flex-col gap-2">
                    <input type="hidden" name="atendimento" value={a.id} />
                    <label className="flex flex-col gap-1 font-medium">
                      Resposta
                      <textarea
                        name="resposta"
                        required
                        maxLength={4000}
                        rows={3}
                        className="rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base font-normal"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="encerrar" value="sim" className="h-5 w-5 accent-petroleo" /> Resolvido (encerrar)
                    </label>
                    <button className="inline-flex min-h-11 w-fit items-center rounded-full bg-petroleo px-4 text-branco">Enviar resposta</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
