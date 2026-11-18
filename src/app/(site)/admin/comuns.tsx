// Peças compartilhadas das filas de análise do admin.
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const ACOES: Record<string, string> = {
  enviado_para_analise: "Enviado para análise",
  produtor_aprovado: "Produtor aprovado",
  produtor_recusado: "Produtor recusado",
  recebedor_lytex_definido: "Id Lytex definido",
  loja_aprovada: "Loja aprovada",
  loja_recusada: "Loja recusada",
  recebedor_iniciado: "Cadastro de recebimento iniciado",
  recebedor_status: "Status do recebedor atualizado",
  item_aprovado: "Item aprovado",
  item_recusado: "Item recusado",
};

type Registro = {
  entidade_id: string;
  acao: string;
  criado_em: string;
  detalhes: { motivo?: string };
  profiles: { nome: string } | null;
};

// Busca o histórico (log de auditoria) de vários registros de uma vez.
export async function buscarHistorico(entidade: "producer" | "item", ids: string[]) {
  if (!ids.length) return new Map<string, Registro[]>();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("audit_log")
    .select("entidade_id, acao, criado_em, detalhes, profiles(nome)")
    .eq("entidade", entidade)
    .in("entidade_id", ids)
    .order("criado_em", { ascending: false })
    .returns<Registro[]>();
  const mapa = new Map<string, Registro[]>();
  for (const r of data ?? []) mapa.set(r.entidade_id, [...(mapa.get(r.entidade_id) ?? []), r]);
  return mapa;
}

export function Historico({ registros }: { registros?: Registro[] }) {
  if (!registros?.length) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer py-1 font-medium">Histórico ({registros.length})</summary>
      <ul className="mt-2 space-y-1 text-petroleo/80" data-historico>
        {registros.map((r, i) => (
          <li key={i}>
            {new Date(r.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} —{" "}
            {ACOES[r.acao] ?? r.acao}
            {r.profiles?.nome && ` por ${r.profiles.nome}`}
            {r.detalhes?.motivo && ` · "${r.detalhes.motivo}"`}
          </li>
        ))}
      </ul>
    </details>
  );
}

// Mensagem depois de uma decisão (?msg=)
export function MensagemAdmin({ msg, tipo }: { msg?: string; tipo?: string }) {
  if (!msg) return null;
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${tipo === "erro" ? "bg-red-50 text-red-800" : "bg-branco"}`}
    >
      {msg}
    </p>
  );
}

// Filtro por status (links)
export function FiltroStatus({
  caminho,
  atual,
  opcoes,
}: {
  caminho: string;
  atual: string;
  opcoes: Record<string, string>;
}) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Filtrar por situação">
      {Object.entries(opcoes).map(([valor, rotulo]) => (
        <Link
          key={valor}
          href={`${caminho}?status=${valor}`}
          aria-current={atual === valor ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 ${atual === valor ? "bg-petroleo text-branco" : "bg-branco"}`}
        >
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

// Primeiro valor de um parâmetro da URL
export const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
