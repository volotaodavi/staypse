// /painel: distribui cada pessoa para a página do seu papel.
// Quem é produtor E revendedor escolhe aqui por onde entrar.
import Link from "next/link";
import { redirect } from "next/navigation";
import { AREAS, destinoDoPainel, exigirPapel } from "@/lib/papeis";

export const metadata = { title: "Painel" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

export default async function Painel() {
  const usuario = await exigirPapel();
  const destino = destinoDoPainel(usuario.papeis);
  if (destino) redirect(destino);

  // Tem mais de uma área: mostra os atalhos de cada uma
  return (
    <>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>
      <p className="mt-1 text-petroleo/75">Por onde você quer começar?</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {AREAS.filter((a) => usuario.papeis.includes(a.papel)).map((a) => (
          <Link key={a.papel} href={a.caminho} className="rounded-3xl bg-petroleo p-6 text-gelo hover:bg-petroleo/90">
            <h2 className="text-2xl text-ciano">{a.titulo}</h2>
            <p className="mt-1 text-gelo/85">{a.texto}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
