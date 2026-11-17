// Página "não encontrada" (loja, vitrine, produto ou endereço que não existe).
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";

export const metadata = { title: "Página não encontrada", robots: { index: false } };

export default function NaoEncontrada() {
  return (
    <>
      <Cabecalho preLancamento />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-gelo px-4 py-16 text-center">
        <h1 className="text-3xl">Página não encontrada</h1>
        <p className="max-w-md text-petroleo/80">
          Esse endereço não existe ou saiu do ar. Se alguém te enviou o link, confira se ele está completo.
        </p>
        <Link href="/" className="rounded-full bg-petroleo px-6 py-3 font-medium text-branco">
          Ir para o início
        </Link>
      </main>
      <Rodape />
    </>
  );
}
