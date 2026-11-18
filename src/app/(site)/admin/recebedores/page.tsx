// Admin: recebedores (cadastro de recebimento na Lytex). SÓ LEITURA: o status
// vem da Lytex; a Staypse não aprova identidade. "Reconsultar" busca o status
// atual no provedor (em produção, depende da integração oficial).
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { ROTULO_STATUS_RECEBEDOR } from "@/lib/pagamentos/recebedores";
import type { StatusRecebedor } from "@/lib/pagamentos/tipos";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { reconsultarAcao } from "./acoes";

export const metadata = { title: "Recebedores" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const FILTROS: Record<string, string> = { pendentes: "Pendentes", recusados: "Recusados e suspensos", aprovados: "Aprovados", todos: "Todos" };
const PAPEL: Record<string, string> = { produtor: "Loja", afiliado: "Afiliado", vendedor: "Vendedor (split direto)" };

type Linha = {
  id: string;
  papel: string;
  documento: string;
  documento_provedor: string | null;
  provedor: string;
  provedor_id: string | null;
  status_recebedor: StatusRecebedor;
  motivo: string | null;
  atualizado_em: string;
  profiles: { nome: string } | null;
};

export default async function AdminRecebedores({ searchParams }: PageProps<"/admin/recebedores">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const filtro = Object.hasOwn(FILTROS, um(sp.filtro) ?? "") ? um(sp.filtro)! : "pendentes";
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("recebedores")
    .select("id, papel, documento, documento_provedor, provedor, provedor_id, status_recebedor, motivo, atualizado_em, profiles(nome)")
    .order("atualizado_em", { ascending: false })
    .limit(300);
  if (filtro === "pendentes") q = q.in("status_recebedor", ["nao_iniciado", "em_analise"]);
  if (filtro === "recusados") q = q.in("status_recebedor", ["recusado", "suspenso"]);
  if (filtro === "aprovados") q = q.eq("status_recebedor", "aprovado");
  const { data, error } = await q;
  if (error) throw new Error(`Recebedores indisponíveis: ${error.message}`);
  const lista = (data ?? []) as unknown as Linha[];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Recebedores</h1>
      <p className="text-sm text-petroleo/80">
        A verificação de identidade é feita pela Lytex. Aqui só aparece o status que ela informa; a Staypse não vê documentos
        nem dados bancários.
      </p>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}
      <nav aria-label="Filtro" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2 text-sm">
          {Object.entries(FILTROS).map(([valor, rotulo]) => (
            <li key={valor}>
              <Link
                href={`/admin/recebedores?filtro=${valor}`}
                aria-current={filtro === valor ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 ${filtro === valor ? "bg-petroleo text-branco" : "bg-branco"}`}
              >
                {rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {lista.length === 0 ? (
        <p className="rounded-2xl bg-branco p-5 text-sm">Nenhum recebedor neste filtro.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-2xl bg-branco p-4 text-sm sm:flex-row sm:items-center"
              data-recebedor-admin={r.status_recebedor}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.profiles?.nome ?? "—"} · {PAPEL[r.papel] ?? r.papel}
                </p>
                <p className="text-petroleo/80">
                  {ROTULO_STATUS_RECEBEDOR[r.status_recebedor]}
                  {r.motivo ? ` · ${r.motivo}` : ""} · {r.provedor} · atualizado {dataHora(r.atualizado_em)}
                </p>
                {r.documento_provedor && r.documento_provedor !== r.documento && (
                  <p className="text-red-800">CPF/CNPJ na Lytex diferente do cadastro: bloqueado.</p>
                )}
              </div>
              {r.provedor_id && (
                <form action={reconsultarAcao}>
                  <input type="hidden" name="provedor" value={r.provedor} />
                  <input type="hidden" name="provedor_id" value={r.provedor_id} />
                  <button className="min-h-11 rounded-full border border-petroleo px-4 font-medium">Reconsultar na Lytex</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
