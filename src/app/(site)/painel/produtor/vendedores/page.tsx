// "Vendedores próprios" da loja: convite, comissão conforme contrato, forma de
// pagamento (folha/split direto), desativação, histórico e relatório mensal.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { alternarVendedor, atualizarVendedor } from "./acoes";
import { FormConvite } from "./FormConvite";

export const metadata = { title: "Vendedores próprios" };
export const instant = false;

type Vendedor = {
  id: string;
  email: string;
  nome: string | null;
  arroba: string | null;
  comissao_percentual: number;
  forma_pagamento: string;
  declaracao_nao_empregado: boolean;
  status: string;
  convite_expira_em: string | null;
  aceito_em: string | null;
  cliques_30d: number;
};
type Historico = { vendedor_id: string; alterado_por: string | null; alterado_em: string; campo: string; valor_antigo: string | null; valor_novo: string | null };

const STATUS: Record<string, string> = { convidado: "Convite enviado", ativo: "Ativo", desativado: "Desativado" };
const FORMA: Record<string, string> = { folha: "Folha", split_direto: "Split direto" };
const CAMPO: Record<string, string> = {
  comissao_percentual: "Comissão (%)",
  forma_pagamento: "Forma de pagamento",
  declaracao_nao_empregado: "Declaração “não é empregado”",
  status: "Situação",
};
const valor = (campo: string, v: string | null) =>
  v == null ? "—" : campo === "forma_pagamento" ? FORMA[v] ?? v : campo === "status" ? STATUS[v] ?? v : campo === "declaracao_nao_empregado" ? (v === "true" ? "sim" : "não") : v.replace(".", ",");

export default async function Vendedores({ searchParams }: PageProps<"/painel/produtor/vendedores">) {
  const usuario = await exigirPapel("produtor");
  const { msg, tipo } = await searchParams;
  const supabase = await criarClienteServidor();
  const [{ data: produtor }, { data: vendedores }] = await Promise.all([
    supabase.from("producers").select("razao_social, loja_nome").eq("user_id", usuario.id).maybeSingle(),
    supabase.rpc("meus_vendedores"),
  ]);
  const lista = (vendedores ?? []) as Vendedor[];
  // RLS: a loja vê só o histórico dos próprios vendedores
  const { data: historico } = lista.length
    ? await supabase
        .from("loja_vendedores_historico")
        .select("vendedor_id, alterado_por, alterado_em, campo, valor_antigo, valor_novo")
        .in("vendedor_id", lista.map((v) => v.id))
        .order("alterado_em", { ascending: false })
        .returns<Historico[]>()
    : { data: [] as Historico[] };
  const mesAtual = new Date().toISOString().slice(0, 7);
  const campoNumero = "w-20 rounded-lg border border-petroleo/20 px-2 py-1.5 text-sm";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/painel/produtor" className="text-sm underline">
        ← Painel do produtor
      </Link>
      <div>
        <h1 className="text-3xl">Vendedores próprios</h1>
        <p className="mt-1 max-w-2xl text-petroleo/80">
          Pessoas da sua equipe que vendem pela sua loja com link próprio. Elas entram automaticamente em todos os seus
          produtos aprovados e não veem dados de outros vendedores nem o faturamento da loja.
        </p>
      </div>
      {typeof msg === "string" && (
        <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${tipo === "erro" ? "bg-red-50 text-red-800" : "bg-branco"}`}>
          {msg}
        </p>
      )}

      <section className="rounded-3xl bg-branco p-5">
        <h2 className="mb-3 text-xl">Convidar vendedor</h2>
        <FormConvite loja={produtor?.loja_nome || produtor?.razao_social || "loja"} />
      </section>

      <section className="rounded-3xl bg-branco p-5">
        <h2 className="text-xl">Sua equipe ({lista.length})</h2>
        {lista.length === 0 ? (
          <p className="mt-2 text-petroleo/70">Ninguém convidado ainda.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-petroleo/10">
            {lista.map((v) => {
              const hist = (historico ?? []).filter((h) => h.vendedor_id === v.id);
              return (
                <li key={v.id} className="flex flex-col gap-3 py-4" data-vendedor={v.email}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{v.nome ?? v.email}</p>
                      <p className="text-sm text-petroleo/70">
                        {v.email}
                        {v.arroba && ` · @${v.arroba}`} · {v.cliques_30d} cliques em 30 dias
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${v.status === "ativo" ? "bg-ciano text-petroleo" : "bg-gelo"}`}>
                      {STATUS[v.status]}
                      {v.status === "convidado" && v.convite_expira_em && new Date(v.convite_expira_em) < new Date() && " (expirado)"}
                    </span>
                  </div>

                  {/* comissão conforme contrato + forma de pagamento */}
                  <form action={atualizarVendedor} className="flex flex-wrap items-end gap-3 text-sm">
                    <input type="hidden" name="vendedor_id" value={v.id} />
                    <label className="flex flex-col gap-1">
                      Comissão (%)
                      <input name="comissao_percentual" defaultValue={String(Number(v.comissao_percentual)).replace(".", ",")} inputMode="decimal" className={campoNumero} />
                    </label>
                    <label className="flex flex-col gap-1">
                      Forma
                      <select name="forma_pagamento" defaultValue={v.forma_pagamento} className="rounded-lg border border-petroleo/20 px-2 py-1.5 text-sm">
                        <option value="folha">Folha</option>
                        <option value="split_direto">Split direto</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="declaracao_nao_empregado" value="sim" defaultChecked={v.declaracao_nao_empregado} className="h-4 w-4 accent-petroleo" />
                      Não é meu empregado
                    </label>
                    <button className="rounded-full bg-petroleo px-4 py-1.5 font-medium text-branco">Salvar</button>
                  </form>

                  <div className="flex flex-wrap gap-3 text-sm">
                    {v.status !== "convidado" && (
                      <form action={alternarVendedor}>
                        <input type="hidden" name="vendedor_id" value={v.id} />
                        <input type="hidden" name="acao" value={v.status === "ativo" ? "desativar" : "ativar"} />
                        <button className={v.status === "ativo" ? "text-red-800 underline" : "underline"}>
                          {v.status === "ativo" ? "Desativar vendedor" : "Reativar vendedor"}
                        </button>
                      </form>
                    )}
                    {hist.length > 0 && (
                      <details>
                        <summary className="cursor-pointer underline">Histórico de alterações</summary>
                        <table className="mt-2 text-xs">
                          <thead>
                            <tr className="text-left text-petroleo/70">
                              <th className="pr-3 font-medium">Quando</th>
                              <th className="pr-3 font-medium">Quem</th>
                              <th className="pr-3 font-medium">O quê</th>
                              <th className="pr-3 font-medium">De</th>
                              <th className="font-medium">Para</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hist.map((h, i) => (
                              <tr key={i}>
                                <td className="pr-3">{new Date(h.alterado_em).toLocaleString("pt-BR")}</td>
                                <td className="pr-3">{h.alterado_por === usuario.id ? "Você" : h.alterado_por ? "Vendedor/Staypse" : "Sistema"}</td>
                                <td className="pr-3">{CAMPO[h.campo] ?? h.campo}</td>
                                <td className="pr-3">{valor(h.campo, h.valor_antigo)}</td>
                                <td>{valor(h.campo, h.valor_novo)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-branco p-5">
        <h2 className="text-xl">Relatório mensal de comissões</h2>
        <p className="mt-1 text-sm text-petroleo/75">
          Para o RH: vendas pagas e comissão de cada vendedor no mês. Vendedores em “folha” recebem pela loja; os de
          “split direto” recebem a parte deles no split automático.
        </p>
        <form action="/painel/produtor/vendedores/relatorio" className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Mês
            <input type="month" name="mes" defaultValue={mesAtual} required className="rounded-xl border border-petroleo/20 px-3 py-2 text-base" />
          </label>
          <button className="rounded-full bg-petroleo px-5 py-2.5 font-medium text-branco">Baixar CSV</button>
          <button formAction="/painel/produtor/vendedores/relatorio/imprimir" className="rounded-full border border-petroleo px-5 py-2.5 font-medium">
            Ver para imprimir / PDF
          </button>
        </form>
      </section>
    </div>
  );
}
