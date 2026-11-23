// Painel administrativo: visão geral com as FILAS e contadores.
// Cada número é um link para a fila correspondente. Os números vêm do banco
// (função admin_contadores, que confere se quem chama é admin).
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Admin" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

type Contadores = {
  lojas_curadoria: number;
  itens_analise: number;
  recebedores_pendentes: number;
  recebedores_recusados: number;
  denuncias_abertas: number;
  pedidos_sem_nf: number;
  atendimentos_vencidos: number;
  erros_24h: number;
  prazo_nf_dias: number;
};

export default async function Admin() {
  await exigirPapel("admin");
  const supabase = await criarClienteServidor();

  const [{ data, error }, usuarios, listaEspera, desistencias, chargebacks] = await Promise.all([
    supabase.rpc("admin_contadores"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "em_reembolso"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "chargeback"),
  ]);
  if (error || !data) throw new Error(`Contadores indisponíveis: ${error?.message}`);
  const c = data as unknown as Contadores;

  // fila = tem trabalho a fazer; destaque quando o número é maior que zero
  const filas = [
    { href: "/admin/produtores", rotulo: "Lojas aguardando curadoria", valor: c.lojas_curadoria },
    { href: "/admin/itens", rotulo: "Itens aguardando análise", valor: c.itens_analise },
    { href: "/admin/recebedores?filtro=pendentes", rotulo: "Recebedores pendentes", valor: c.recebedores_pendentes },
    { href: "/admin/recebedores?filtro=recusados", rotulo: "Recebedores recusados ou suspensos", valor: c.recebedores_recusados },
    { href: "/admin/denuncias", rotulo: "Denúncias abertas", valor: c.denuncias_abertas },
    {
      href: "/admin/pedidos?fila=sem_nf",
      rotulo: `Pedidos pagos há mais de ${c.prazo_nf_dias} dias sem nota fiscal`,
      valor: c.pedidos_sem_nf,
    },
    { href: "/admin/atendimentos?vencidos=1", rotulo: "Atendimentos vencidos", valor: c.atendimentos_vencidos },
    { href: "/admin/erros", rotulo: "Erros nas últimas 24 h", valor: c.erros_24h },
  ];
  const gerais = [
    { href: "/admin/usuarios", rotulo: "Usuários", valor: usuarios.count ?? 0 },
    { href: "/admin/lista-espera", rotulo: "Lista de espera", valor: listaEspera.count ?? 0 },
    { href: "/admin/pedidos?status=em_reembolso", rotulo: "Desistências a reembolsar", valor: desistencias.count ?? 0 },
    { href: "/admin/pedidos?status=chargeback", rotulo: "Chargebacks", valor: chargebacks.count ?? 0 },
  ];

  return (
    <>
      <p className="text-sm text-petroleo/75">Admin</p>
      <h1 className="text-3xl">Visão geral</h1>

      <h2 className="mt-8 text-xl">Filas de trabalho</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filas.map((f) => (
          <li key={f.href}>
            <Link
              href={f.href}
              data-fila={f.href}
              className={`relative flex h-full min-h-28 flex-col justify-between gap-3 rounded-2xl border p-5 transition-colors hover:bg-gelo ${
                f.valor > 0 ? "border-petroleo/30 bg-branco" : "border-petroleo/10 bg-branco"
              }`}
            >
              <span className={`text-3xl font-semibold tabular-nums ${f.valor > 0 ? "text-petroleo" : "text-petroleo/75"}`}>{f.valor}</span>
              <span className="text-sm text-petroleo/80">{f.rotulo}</span>
              {/* fila com trabalho: ponto ciano (decoração; o número já diz o resto) */}
              {f.valor > 0 && <span aria-hidden="true" className="absolute right-4 top-4 size-2 rounded-full bg-ciano ring-1 ring-petroleo/30" />}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl">Em números</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {gerais.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="flex min-h-11 flex-col gap-1 rounded-2xl border border-petroleo/10 bg-branco p-5 transition-colors hover:bg-gelo">
              <span className="text-2xl font-semibold tabular-nums">{g.valor}</span>
              <span className="text-sm text-petroleo/80">{g.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
