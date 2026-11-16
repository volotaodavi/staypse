// /painel: distribui cada pessoa para a página do seu papel.
// Quem é produtor E revendedor escolhe aqui por onde entrar.
import Link from "next/link";
import { redirect } from "next/navigation";
import { destinoDoPainel, exigirPapel } from "@/lib/papeis";

export const metadata = { title: "Painel" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

export default async function Painel() {
  const usuario = await exigirPapel();
  const destino = destinoDoPainel(usuario.papeis);
  if (destino) redirect(destino);

  // Tem os dois papéis: mostra os dois atalhos
  return (
    <>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>
      <p className="mt-1 text-petroleo/75">Por onde você quer começar?</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/painel/produtor" className="rounded-3xl bg-petroleo p-6 text-gelo hover:bg-petroleo/90">
          <h2 className="text-2xl text-ciano">Produtor</h2>
          <p className="mt-1 text-gelo/85">Empresa, produtos e pedidos.</p>
        </Link>
        <Link href="/painel/revendedor" className="rounded-3xl bg-petroleo p-6 text-gelo hover:bg-petroleo/90">
          <h2 className="text-2xl text-ciano">Revendedor</h2>
          <p className="mt-1 text-gelo/85">Sua vitrine, links e vendas.</p>
        </Link>
      </div>
    </>
  );
}
