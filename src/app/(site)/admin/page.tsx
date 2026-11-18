// Painel administrativo (Etapa 1: números gerais).
// Os números vêm direto do banco com a sessão do admin: a RLS libera
// "admin vê tudo". Se um não-admin chegar aqui, exigirPapel o devolve.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Admin" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

// início da janela "últimas N horas" (servidor, a cada acesso)
function horasAtras(horas: number) {
  return new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();
}

export default async function Admin() {
  const usuario = await exigirPapel("admin");
  const supabase = await criarClienteServidor();

  // head: true = só conta, não baixa as linhas
  const contar = (tabela: "profiles" | "producers" | "items" | "waitlist") =>
    supabase.from(tabela).select("*", { count: "exact", head: true });

  const ontem = horasAtras(24);
  const [usuarios, produtoresPendentes, itensEmAnalise, listaEspera, atendimentos, desistencias, erros] = await Promise.all([
    contar("profiles"),
    contar("producers").eq("status_verificacao", "em_analise"),
    contar("items").eq("status_aprovacao", "em_analise"),
    contar("waitlist"),
    supabase.from("atendimentos").select("*", { count: "exact", head: true }).eq("status", "aberto"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "em_reembolso"),
    supabase.from("erros_app").select("*", { count: "exact", head: true }).gte("criado_em", ontem),
  ]);

  const numeros = [
    ["Usuários", usuarios.count],
    ["Produtores aguardando aprovação", produtoresPendentes.count],
    ["Itens aguardando análise", itensEmAnalise.count],
    ["Lista de espera", listaEspera.count],
    ["Atendimentos abertos", atendimentos.count],
    ["Desistências a reembolsar", desistencias.count],
    ["Erros nas últimas 24 h", erros.count],
  ] as const;

  return (
    <>
      <p className="text-sm font-medium text-petroleo/75">Admin</p>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {numeros.map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-3xl bg-petroleo p-6 text-gelo">
            <p className="text-4xl font-extrabold text-ciano">{valor ?? 0}</p>
            <p className="mt-1 text-sm text-gelo/85">{rotulo}</p>
          </div>
        ))}
      </div>
      <nav className="mt-6 flex flex-col flex-wrap gap-3 sm:flex-row" aria-label="Áreas do admin">
        {[
          ["/admin/produtores", "Analisar produtores →"],
          ["/admin/itens", "Analisar itens →"],
          ["/admin/lista", "Lista de espera →"],
          ["/admin/pedidos", "Pedidos →"],
          ["/admin/atendimentos", "Atendimentos →"],
          ["/admin/erros", "Erros →"],
        ].map(([href, rotulo]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full bg-ciano px-6 py-3 text-center font-medium text-petroleo hover:brightness-95"
          >
            {rotulo}
          </Link>
        ))}
      </nav>
    </>
  );
}
