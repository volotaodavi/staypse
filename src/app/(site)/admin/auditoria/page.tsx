// Admin: log de auditoria (somente leitura; o banco impede alterar ou apagar).
// Filtros por ação, entidade e período, com paginação.
import Link from "next/link";
import { FiltroPeriodo } from "@/components/painel/FiltroPeriodo";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { exigirPapel } from "@/lib/papeis";
import { lerPeriodo, parametrosPeriodo } from "@/lib/periodo";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ACOES, um } from "../comuns";
import { POR_PAGINA, Paginacao, lerPagina } from "../paginacao";

export const metadata = { title: "Log de auditoria" };
export const instant = false;

const ENTIDADES: Record<string, string> = {
  producer: "Loja",
  item: "Item",
  recebedor: "Recebedor",
  usuario: "Usuário",
  configuracao: "Configuração",
  denuncia: "Denúncia",
  pedido: "Pedido",
  sistema: "Sistema",
};
const estiloCampo = "min-h-11 w-full rounded-xl border border-petroleo/60 bg-branco px-3 text-base";

type Registro = {
  id: number;
  criado_em: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  detalhes: Record<string, unknown>;
  profiles: { nome: string } | null;
};

export default async function AdminAuditoria({ searchParams }: PageProps<"/admin/auditoria">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const periodo = lerPeriodo(sp, "30d");
  const pagina = lerPagina(sp.pagina);
  const supabase = await criarClienteServidor();

  const { data: acoesData } = await supabase.rpc("admin_acoes_auditoria");
  const acoes = (acoesData ?? []) as unknown as string[];
  const acao = acoes.includes(um(sp.acao) ?? "") ? um(sp.acao)! : "";
  const entidade = Object.hasOwn(ENTIDADES, um(sp.entidade) ?? "") ? um(sp.entidade)! : "";

  let q = supabase
    .from("audit_log")
    .select("id, criado_em, acao, entidade, entidade_id, detalhes, profiles(nome)", { count: "exact" })
    .gte("criado_em", periodo.inicio)
    .lt("criado_em", periodo.fim)
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (acao) q = q.eq("acao", acao);
  if (entidade) q = q.eq("entidade", entidade);
  const { data, count, error } = await q.returns<Registro[]>();
  if (error) throw new Error(`Log indisponível: ${error.message}`);

  const filtros: Record<string, string> = { ...(acao ? { acao } : {}), ...(entidade ? { entidade } : {}) };

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Log de auditoria</h1>
      <p className="text-sm text-petroleo/80">Registro imutável das decisões do admin: ninguém altera nem apaga.</p>

      <form method="get" className="grid gap-3 rounded-2xl bg-branco p-4 sm:grid-cols-3 sm:items-end">
        {Object.entries(parametrosPeriodo(periodo)).map(([k, val]) => (
          <input key={k} type="hidden" name={k} value={val} />
        ))}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Ação
          <select name="acao" defaultValue={acao} className={estiloCampo}>
            <option value="">Todas</option>
            {acoes.map((a) => (
              <option key={a} value={a}>
                {ACOES[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Entidade
          <select name="entidade" defaultValue={entidade} className={estiloCampo}>
            <option value="">Todas</option>
            {Object.entries(ENTIDADES).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded-full bg-petroleo px-6 font-medium text-branco">Filtrar</button>
      </form>

      <FiltroPeriodo periodo={periodo} caminho="/admin/auditoria" extras={filtros} />

      <TabelaDados
        legenda="Registros do log de auditoria"
        colunas={[
          { titulo: "Ação", principal: true },
          { titulo: "Quando" },
          { titulo: "Quem" },
          { titulo: "Entidade" },
          { titulo: "Detalhes" },
        ]}
        linhas={(data ?? []).map((r) => ({
          chave: String(r.id),
          celulas: [
            ACOES[r.acao] ?? r.acao,
            dataHora(r.criado_em),
            r.profiles?.nome ?? "Não informado",
            <span key="e" className="break-all">
              {ENTIDADES[r.entidade] ?? r.entidade} · {r.entidade_id.slice(0, 8)}
            </span>,
            Object.keys(r.detalhes ?? {}).length ? (
              <details key="d">
                <summary className="inline-flex min-h-11 cursor-pointer items-center underline">Ver</summary>
                <pre className="max-w-full overflow-x-auto rounded-lg bg-gelo p-2 text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(r.detalhes, null, 2)}
                </pre>
              </details>
            ) : (
              "Não informado"
            ),
          ],
        }))}
        vazio={{ texto: "Nenhum registro com esses filtros." }}
      />
      <Paginacao caminho="/admin/auditoria" pagina={pagina} total={count ?? 0} filtros={{ ...filtros, ...parametrosPeriodo(periodo) }} />
    </div>
  );
}
