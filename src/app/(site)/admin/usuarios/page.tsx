// Admin: usuários. Busca por nome ou e-mail, lista paginada e suspensão/reativação
// com motivo obrigatório. Conta suspensa não abre nenhum painel (ver exigirPapel).
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { MensagemAdmin, um } from "../comuns";
import { POR_PAGINA, Paginacao, lerPagina } from "../paginacao";
import { suspenderUsuario } from "./acoes";

export const metadata = { title: "Usuários" };
export const instant = false;

const PAPEL: Record<string, string> = { produtor: "Loja", revendedor: "Afiliado", admin: "Admin", vendedor_proprio: "Vendedor da loja" };
const estiloCampo = "w-full rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  papeis: string[];
  criado_em: string;
  suspenso_em: string | null;
  suspenso_motivo: string | null;
  total: number;
};

export default async function AdminUsuarios({ searchParams }: PageProps<"/admin/usuarios">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const busca = (um(sp.busca) ?? "").trim().slice(0, 100);
  const pagina = lerPagina(sp.pagina);
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_listar_usuarios", {
    p_busca: busca || undefined,
    p_limite: POR_PAGINA,
    p_offset: (pagina - 1) * POR_PAGINA,
  });
  if (error) throw new Error(`Usuários indisponíveis: ${error.message}`);
  const lista = (data ?? []) as unknown as Usuario[];
  const total = Number(lista[0]?.total ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Usuários</h1>
      <MensagemAdmin msg={um(sp.msg) ?? um(sp.erro)} tipo={um(sp.erro) ? "erro" : undefined} />

      <form method="get" className="flex flex-col gap-2 rounded-2xl bg-branco p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Buscar por nome ou e-mail
          <input name="busca" defaultValue={busca} maxLength={100} className={estiloCampo} />
        </label>
        <button className="min-h-11 rounded-full bg-petroleo px-6 font-medium text-branco">Buscar</button>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-2xl bg-branco p-5 text-sm">Nenhum usuário encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((u) => {
            const suspenso = Boolean(u.suspenso_em);
            const ehAdmin = u.papeis.includes("admin");
            return (
              <li key={u.id} className="rounded-2xl bg-branco p-4 sm:p-5" data-usuario={u.email}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-medium break-words">{u.nome}</p>
                  {suspenso && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800">Suspenso</span>}
                </div>
                <p className="text-sm break-all text-petroleo/80">{u.email}</p>
                <p className="text-sm text-petroleo/75">
                  {u.papeis.length ? u.papeis.map((p) => PAPEL[p] ?? p).join(", ") : "Sem papel"} · criado em {dataHora(u.criado_em)}
                </p>
                {suspenso && (
                  <p className="mt-2 text-sm text-red-800">
                    Suspenso em {dataHora(u.suspenso_em)}: {u.suspenso_motivo}
                  </p>
                )}
                {!ehAdmin && (
                  <form action={suspenderUsuario} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="busca" value={busca} />
                    <input type="hidden" name="acao" value={suspenso ? "reativar" : "suspender"} />
                    <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                      {suspenso ? "Motivo da reativação" : "Motivo da suspensão"}
                      <input name="motivo" required minLength={5} maxLength={500} className={estiloCampo} />
                    </label>
                    <button
                      className={`min-h-11 rounded-full px-5 text-sm font-medium ${
                        suspenso ? "bg-petroleo text-branco" : "border border-red-800 text-red-800"
                      }`}
                    >
                      {suspenso ? "Reativar" : "Suspender"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Paginacao caminho="/admin/usuarios" pagina={pagina} total={total} filtros={busca ? { busca } : {}} />
    </div>
  );
}
