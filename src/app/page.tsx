// Página inicial PROVISÓRIA (Etapa 1): só a logo, as cores e os acessos.
// A landing definitiva vem numa etapa própria.
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Logo } from "@/components/Logo";

export default function Inicio() {
  return (
    <>
      <Cabecalho />
      <main className="flex flex-1 flex-col">
        <section className="bg-gelo">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
            <Logo className="h-12 w-auto sm:h-16" />
            <h1 className="max-w-2xl text-4xl leading-tight sm:text-5xl">
              Indique produtos pela sua vitrine e ganhe em cada venda.
            </h1>
            <p className="max-w-xl text-lg text-petroleo/80">
              Sem estoque e sem precisar de seguidores. Produtores cadastram, revendedores
              indicam, e o pagamento é dividido automaticamente entre todos.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/cadastro"
                className="rounded-full bg-ciano px-6 py-3 text-center font-medium text-petroleo hover:brightness-95"
              >
                Quero revender
              </Link>
              <Link
                href="/cadastro"
                className="rounded-full bg-petroleo px-6 py-3 text-center font-medium text-branco hover:bg-petroleo/90"
              >
                Sou produtor
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3">
          {[
            ["Produtores", "Cadastram produtos físicos ou digitais e definem a comissão."],
            ["Revendedores", "Montam a vitrine em staypse.com.br/seu-nome e indicam pelo link."],
            ["Split automático", "No pagamento, cada um recebe a sua parte direto."],
          ].map(([titulo, texto]) => (
            <article key={titulo} className="rounded-2xl bg-petroleo p-6 text-gelo">
              <h2 className="text-xl text-ciano">{titulo}</h2>
              <p className="mt-2 text-gelo/85">{texto}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
