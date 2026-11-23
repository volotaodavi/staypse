// Admin: todos os pedidos, com destaque para desistências a reembolsar.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_PEDIDO, dataHora } from "@/lib/pedidos";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { concluirReembolso } from "../operacao";

export const metadata = { title: "Pedidos" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminPedidos({ searchParams }: PageProps<"/admin/pedidos">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const status = Object.hasOwn(STATUS_PEDIDO, um(sp.status) ?? "") ? um(sp.status)! : "";
  const supabase = await criarClienteServidor();
  // fila "sem nota fiscal": pagos há mais de X dias (configuração prazo_nf_dias) com item sem NF
  const semNf = um(sp.fila) === "sem_nf";
  const idsSemNf = semNf ? ((await supabase.rpc("admin_pedidos_sem_nf")).data as string[] | null) ?? [] : [];
  let consulta = supabase
    .from("orders")
    .select("id, codigo, status, criado_em, total_centavos, arrependimento_solicitado_em, arrependimento_motivo, chargeback_em, cobranca_id, producers(razao_social)")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (status) consulta = consulta.eq("status", status);
  if (semNf) consulta = consulta.in("id", idsSemNf);
  const { data, error } = await consulta;
  if (error) throw new Error(`Pedidos indisponíveis: ${error.message}`);
  const pedidos = (data ?? []) as unknown as {
    id: string;
    codigo: string;
    status: string;
    criado_em: string;
    total_centavos: number;
    arrependimento_solicitado_em: string | null;
    arrependimento_motivo: string | null;
    chargeback_em: string | null;
    cobranca_id: string | null;
    producers: { razao_social: string } | null;
  }[];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Pedidos</h1>
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
      {semNf && (
        <p className="rounded-xl bg-branco px-4 py-3 text-sm">
          Fila: pedidos pagos há mais tempo que o prazo de nota fiscal e ainda sem nota.{" "}
          <Link href="/admin/pedidos" className="inline-flex min-h-11 items-center font-medium underline">
            Ver todos os pedidos
          </Link>
        </p>
      )}
      <nav aria-label="Filtrar por situação" className="flex flex-wrap gap-2 text-sm">
        {[["", "Todos"], ...Object.entries(STATUS_PEDIDO)].map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={valor ? `/admin/pedidos?status=${valor}` : "/admin/pedidos"}
            aria-current={status === valor ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 ${status === valor ? "bg-petroleo text-branco" : "bg-branco"}`}
          >
            {rotulo}
          </Link>
        ))}
      </nav>
      {pedidos.length === 0 ? (
        <p className="rounded-2xl bg-branco p-4 text-sm">Nenhum pedido.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-3xl bg-branco p-5 text-sm" data-pedido={p.codigo}>
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">
                  {p.codigo} · {p.producers?.razao_social}
                </p>
                <p>{formatarPreco(p.total_centavos)}</p>
              </div>
              <p className="text-petroleo/75">
                {dataHora(p.criado_em)} · {STATUS_PEDIDO[p.status]}
              </p>
              {p.status === "chargeback" && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                  Pagamento contestado (chargeback) em {dataHora(p.chargeback_em)}. Comissões estornadas; o valor foi debitado pela
                  instituição de pagamento. Veja o registro em auditoria.
                </p>
              )}
              {p.status === "em_reembolso" && (
                <>
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                    Desistência em {dataHora(p.arrependimento_solicitado_em)}
                    {p.arrependimento_motivo ? ` · motivo: ${p.arrependimento_motivo}` : ""}. Reembolso total, inclusive frete.
                    {p.cobranca_id ? " O pedido só vira reembolsado quando a instituição de pagamento confirmar o estorno." : ""}
                  </p>
                  <form action={concluirReembolso}>
                    <input type="hidden" name="pedido" value={p.id} />
                    <button className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-4 text-branco">
                      Pedir estorno à instituição de pagamento
                    </button>
                  </form>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
