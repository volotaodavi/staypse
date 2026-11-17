// Página inicial de PRÉ-LANÇAMENTO: lista de espera.
// É para onde a bio do Instagram aponta — pensada primeiro para o celular.
// Regras de texto: não prometer "dinheiro na hora" nem valores de ganho;
// a Staypse nunca "recebe" o dinheiro — cada parte recebe no split.
import Link from "next/link";
import { Suspense } from "react";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import { IconeCheck, IconePessoa, IconeSelo, IconeSplit, IconeVolta, Perguntas, VitrineSplit } from "@/components/inicio";
import { urlDoSite } from "@/lib/supabase/env";
import { FormLista } from "./lista/FormLista";

const PASSOS = [
  ["O produtor cadastra", "Fábricas, lojas e criadores cadastram produtos físicos ou digitais e definem a comissão de cada um."],
  ["Você indica pelo seu link", "Você monta a sua vitrine com um endereço só seu e compartilha onde quiser. Sem estoque."],
  ["O pagamento é dividido na hora", "Quando alguém compra, o valor é dividido automaticamente entre produtor, revendedor e Staypse."],
] as const;

const REGRAS = [
  [IconeSplit, "Split automático", "Cada parte recebe a sua parte direto no pagamento. A Staypse não guarda o dinheiro de ninguém."],
  [IconeSelo, "Produtores verificados", "Só entra empresa com CNPJ ativo, que emite nota fiscal de todas as vendas. Todo produto passa por análise."],
  [IconeVolta, "Compra com garantia", "O comprador tem 7 dias para desistir, com reembolso proporcional ao split."],
  [IconePessoa, "Sem pirâmide", "Você ganha só sobre as suas vendas. Não existe taxa de adesão nem ganho por recrutar pessoas."],
] as const;

export default function Inicio() {
  return (
    <>
      <Cabecalho preLancamento />
      <main className="flex flex-1 flex-col">
        {/* ---------- topo ---------- */}
        <section id="topo" className="overflow-hidden bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 pb-16 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:pb-24">
            <div className="flex flex-col gap-6">
              <h1 className="text-[2.6rem] leading-[1.02] tracking-[-0.035em] sm:text-6xl">
                Plataforma de afiliados para produtos físicos e digitais
              </h1>
              <p className="max-w-md text-lg text-gelo/80 sm:text-xl">Indique, venda e receba sua parte no split automático.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href="#revender" className="rounded-full bg-ciano px-7 py-4 text-center text-lg font-medium text-petroleo hover:brightness-95">
                  Quero revender
                </a>
                <a href="#produtos" className="rounded-full border border-gelo/30 px-7 py-4 text-center text-lg font-medium text-branco hover:bg-gelo/10">
                  Tenho produtos para vender
                </a>
              </div>
              <ul className="flex flex-col gap-2 text-gelo/80 sm:flex-row sm:gap-6">
                {["Sem taxa de adesão", "Sem estoque", "Sem precisar de seguidores"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <IconeCheck className="h-5 w-5 shrink-0 text-ciano" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <VitrineSplit host={urlDoSite().replace(/^https?:\/\//, "")} />
          </div>
        </section>

        {/* ---------- escolha o seu caminho ---------- */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="max-w-xl text-3xl leading-tight sm:text-4xl">Dois jeitos de usar a Staypse</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="flex flex-col rounded-[2rem] bg-petroleo p-7 text-gelo">
              <h3 className="text-2xl">Para quem quer revender</h3>
              <ul className="mt-5 flex flex-col gap-3 text-gelo/85">
                {["Monte sua vitrine com os produtos que combinam com você", "Indique pelo seu link no Instagram, WhatsApp ou onde quiser", "Ganhe a comissão de cada venda feita por você"].map((t) => (
                  <li key={t} className="flex gap-3"><IconeCheck className="mt-0.5 h-5 w-5 shrink-0 text-ciano" />{t}</li>
                ))}
              </ul>
              <a href="#revender" className="mt-7 self-start rounded-full bg-ciano px-6 py-3 font-medium text-petroleo hover:brightness-95">
                Quero revender
              </a>
            </article>
            <article className="flex flex-col rounded-[2rem] border-2 border-petroleo p-7">
              <h3 className="text-2xl">Para quem tem produtos</h3>
              <ul className="mt-5 flex flex-col gap-3 text-petroleo/85">
                {["Cadastre produtos físicos ou digitais e defina a comissão", "Ganhe uma rede de revendedores sem montar equipe de vendas", "Receba a sua parte no split e emita a nota fiscal da venda"].map((t) => (
                  <li key={t} className="flex gap-3"><IconeCheck className="mt-0.5 h-5 w-5 shrink-0" />{t}</li>
                ))}
              </ul>
              <a href="#produtos" className="mt-7 self-start rounded-full bg-petroleo px-6 py-3 font-medium text-branco hover:bg-petroleo/90">
                Tenho produtos para vender
              </a>
            </article>
          </div>
        </section>

        {/* ---------- como funciona (sequência real: 1 → 2 → 3) ---------- */}
        <section className="bg-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl leading-tight sm:text-4xl">Como funciona</h2>
            <ol className="relative ml-5 flex flex-col gap-8 border-l-2 border-petroleo/15 pl-8">
              {PASSOS.map(([titulo, texto], i) => (
                <li key={titulo} className="relative">
                  <span className="absolute -left-[3.3rem] flex h-10 w-10 items-center justify-center rounded-full bg-petroleo font-extrabold text-ciano">
                    {i + 1}
                  </span>
                  <h3 className="text-xl">{titulo}</h3>
                  <p className="mt-1 max-w-md text-petroleo/80">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- regras claras ---------- */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="max-w-xl text-3xl leading-tight sm:text-4xl">Regras claras para todo mundo</h2>
          <ul className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {REGRAS.map(([Icone, titulo, texto]) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-petroleo text-ciano">
                  <Icone />
                </span>
                <div>
                  <h3 className="text-xl">{titulo}</h3>
                  <p className="mt-1 text-petroleo/80">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-petroleo/70">
            Veja também a{" "}
            <Link href="/produtos-proibidos" className="underline">
              lista de produtos proibidos
            </Link>
            .
          </p>
        </section>

        {/* ---------- formulário: os botões apontam para #revender e #produtos ---------- */}
        <section id="lista" className="bg-petroleo px-4 py-16 sm:py-20">
          <span id="revender" className="block scroll-mt-4" />
          <span id="produtos" className="block scroll-mt-4" />
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="text-gelo">
              <h2 className="text-3xl leading-tight sm:text-4xl">Entre na lista de espera</h2>
              <p className="mt-3 max-w-md text-lg text-gelo/80">
                Leva menos de um minuto. Avisamos você pelo WhatsApp quando abrir, e quem indicar mais amigos entra primeiro.
              </p>
            </div>
            <div className="w-full rounded-[2rem] bg-branco p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] sm:p-8">
              {/* Suspense: o formulário lê ?ref= do endereço */}
              <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gelo" />}>
                <FormLista />
              </Suspense>
            </div>
          </div>
        </section>

        {/* ---------- perguntas frequentes ---------- */}
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="mb-8 text-3xl leading-tight sm:text-4xl">Perguntas frequentes</h2>
          <Perguntas />
        </section>

        {/* ---------- chamada final ---------- */}
        <section className="px-4 pb-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-[2rem] bg-ciano p-8 text-petroleo sm:flex-row sm:items-center sm:justify-between sm:p-12">
            <h2 className="max-w-lg text-3xl leading-tight sm:text-4xl">Garanta seu lugar no acesso antecipado.</h2>
            <a href="#lista" className="shrink-0 rounded-full bg-petroleo px-7 py-4 text-lg font-medium text-branco hover:bg-petroleo/90">
              Entrar na lista de espera
            </a>
          </div>
        </section>
      </main>
      <BarraFixa />
    </>
  );
}
