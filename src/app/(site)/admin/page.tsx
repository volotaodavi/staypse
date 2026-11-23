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
  const usuario = await exigirPapel("admin");
  const supabase = await criarClienteServidor();

  const [{ data, error }, usuarios, listaEspera, desistencias] = await Promise.all([
    supabase.rpc("admin_contadores"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "em_reembolso"),
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
  ];

  return (
    <>
      <p className="text-sm font-medium text-petroleo/75">Admin</p>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>

      <h2 className="mt-6 text-xl">Filas</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filas.map((f) => (
          <li key={f.href}>
            <Link
              href={f.href}
              data-fila={f.href}
              className={`flex h-full min-h-11 flex-col justify-between rounded-3xl p-5 hover:brightness-110 ${
                f.valor > 0 ? "bg-petroleo text-gelo" : "bg-branco text-petroleo"
              }`}
            >
              <span className={`text-4xl font-extrabold tabular-nums ${f.valor > 0 ? "text-ciano" : "text-petroleo"}`}>{f.valor}</span>
              <span className="mt-1 text-sm">{f.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-xl">Visão geral</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {gerais.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="flex min-h-11 flex-col rounded-2xl bg-branco p-4 hover:bg-white">
              <span className="text-3xl font-extrabold tabular-nums">{g.valor}</span>
              <span className="text-sm text-petroleo/80">{g.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-xl">Áreas</h2>
      <nav className="mt-3 flex flex-col flex-wrap gap-3 sm:flex-row" aria-label="Áreas do admin">
        {[
          ["/admin/pedidos", "Pedidos"],
          ["/admin/lista", "Inscritos da lista"],
          ["/admin/configuracoes", "Configurações"],
          ["/admin/auditoria", "Log de auditoria"],
        ].map(([href, rotulo]) => (
          <Link
            key={href}
            href={href}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ciano px-6 py-3 text-center font-medium text-petroleo hover:brightness-95"
          >
            {rotulo} →
          </Link>
        ))}
      </nav>
    </>
  );
}
