// Página inicial de PRÉ-LANÇAMENTO: lista de espera.
// É para onde a bio do Instagram aponta — pensada primeiro para o celular.
// Regras de texto: não prometer "dinheiro na hora" nem valores de ganho.
import { Suspense } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { FormLista } from "./lista/FormLista";

const PASSOS = [
  ["1", "O produtor cadastra", "Fábricas, lojas e criadores cadastram produtos físicos ou digitais e definem a comissão."],
  ["2", "O revendedor indica", "Você monta sua vitrine e indica pelo seu link. Sem estoque e sem precisar de seguidores."],
  ["3", "O pagamento é dividido", "Na hora da venda, o pagamento é dividido automaticamente entre produtor, revendedor e Staypse."],
] as const;

export default function Inicio() {
  return (
    <>
      <Cabecalho preLancamento />
      <main className="flex flex-1 flex-col">
        {/* Topo */}
        <section className="bg-petroleo text-gelo">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pt-10 pb-12 sm:py-20">
            <p className="text-sm font-medium tracking-wide text-ciano uppercase">Lista de espera aberta</p>
            <h1 className="text-[2.1rem] leading-[1.1] sm:text-5xl">
              Plataforma de afiliados para produtos físicos e digitais
            </h1>
            <p className="text-lg text-gelo/85">Indique, venda e receba direto na plataforma.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#revender"
                className="rounded-full bg-ciano px-6 py-4 text-center font-medium text-petroleo hover:brightness-95"
              >
                Quero revender
              </a>
              <a
                href="#produtos"
                className="rounded-full border border-gelo/40 px-6 py-4 text-center font-medium text-branco hover:bg-gelo/10"
              >
                Tenho produtos para vender
              </a>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="mx-auto w-full max-w-5xl px-4 py-12">
          <h2 className="text-2xl sm:text-3xl">Como funciona</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {PASSOS.map(([numero, titulo, texto]) => (
              <li key={numero} className="flex gap-4 rounded-3xl bg-gelo p-5 sm:flex-col">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-petroleo font-extrabold text-ciano">
                  {numero}
                </span>
                <div>
                  <h3 className="text-lg">{titulo}</h3>
                  <p className="mt-1 text-petroleo/80">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Formulário: os botões do topo apontam para #revender e #produtos */}
        <section className="bg-gelo px-4 py-12">
          <span id="revender" className="block scroll-mt-4" />
          <span id="produtos" className="block scroll-mt-4" />
          <div className="mx-auto w-full max-w-md rounded-3xl bg-branco p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl">Entre na lista de espera</h2>
            <p className="mt-1 mb-6 text-petroleo/75">
              Leva menos de um minuto. Avisamos você pelo WhatsApp quando abrir.
            </p>
            {/* Suspense: o formulário lê ?ref= do endereço */}
            <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gelo" />}>
              <FormLista />
            </Suspense>
          </div>
        </section>
      </main>
    </>
  );
}
