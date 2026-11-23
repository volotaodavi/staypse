// Página de obrigado: posição na fila + link de indicação.
// O endereço (/lista/<código>) pode ser guardado para acompanhar a posição.
// Não mostra NENHUM dado pessoal: só posição, total e nº de indicações.
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { FILA_DO_PERFIL, codigoValido, linkDeIndicacao, type Perfil } from "@/lib/lista";
import { supabaseChavePublica, supabaseUrl, urlDoSite } from "@/lib/supabase/env";
import { Compartilhar } from "./Compartilhar";

export const metadata: Metadata = {
  title: "Você está na lista",
  robots: { index: false }, // página pessoal: fora do Google
};
// Busca a posição atual a cada acesso (ela muda conforme as indicações).
export const instant = false;

export default async function Obrigado({ params }: PageProps<"/lista/[codigo]">) {
  const { codigo } = await params;
  if (!codigoValido(codigo)) notFound();

  // Cliente público (sem login): a função só devolve números
  const supabase = createClient(supabaseUrl(), supabaseChavePublica(), {
    auth: { persistSession: false },
  });
  const { data } = await supabase.rpc("posicao_na_lista", { p_codigo: codigo }).maybeSingle<{
    posicao: number;
    total: number;
    indicacoes: number;
    interesse: string;
  }>();
  if (!data) notFound();

  const fila = FILA_DO_PERFIL[data.interesse as Perfil] ?? "inscritos";
  const link = linkDeIndicacao(urlDoSite(), codigo);

  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col bg-gelo px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          <section className="rounded-2xl bg-petroleo p-6 text-gelo">
            <p className="text-sm font-medium tracking-wide text-ciano uppercase">Inscrição confirmada</p>
            <h1 className="mt-2 text-3xl">Você está na lista!</h1>
            <p className="mt-6 text-gelo/80">Sua posição na fila de {fila}</p>
            <p className="text-6xl font-semibold text-ciano">{data.posicao}º</p>
            <p className="text-gelo/80">de {data.total}</p>
          </section>

          <section className="rounded-2xl bg-branco p-6">
            <h2 className="text-xl">Suba na fila indicando</h2>
            <p className="mt-2 text-petroleo/80">
              Quem trouxer mais pessoas entra primeiro no acesso antecipado. Não há sorteio nem
              prêmio em dinheiro: a vantagem é só a prioridade na entrada.
            </p>
            <p className="mt-4 text-lg">
              <strong className="font-semibold">{data.indicacoes}</strong>{" "}
              {data.indicacoes === 1 ? "pessoa entrou" : "pessoas entraram"} pelo seu link
            </p>

            <Compartilhar link={link} />
          </section>

          <p className="text-center text-sm text-petroleo/70">
            Guarde esta página para acompanhar sua posição.{" "}
            <Link href="/" className="underline">
              Voltar ao início
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
