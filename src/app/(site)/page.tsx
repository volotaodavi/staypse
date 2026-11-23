// Página inicial de PRÉ-LANÇAMENTO. O ÚNICO botão da página é entrar na lista
// de espera (não há "Entrar" nem "Criar conta" aqui). É para onde a bio do
// Instagram aponta — pensada primeiro para o celular.
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro — o split acontece na Lytex.
import Link from "next/link";
import { Suspense } from "react";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import { IconeCheck, IconePessoa, IconeSelo, IconeSplit, IconeVolta, Perguntas, VitrineSplit } from "@/components/inicio";
import { urlDoSite } from "@/lib/supabase/env";
import { FormLista } from "./lista/FormLista";

const PASSOS = [
  ["A loja cadastra os produtos", "Lojas e fábricas cadastram produtos físicos ou digitais e definem a comissão de cada um."],
  ["O afiliado divulga pelo seu link", "Cada afiliado monta a sua vitrine, com um endereço só seu, e compartilha onde quiser. Sem estoque."],
  ["A Lytex processa e divide o pagamento", "Quando alguém compra, o split acontece na Lytex: cada parte recebe a sua direto. A Staypse nunca recebe nem guarda o dinheiro de ninguém."],
] as const;

// Uma faixa para cada perfil da lista de espera (as âncoras servem aos links do menu e da bio)
const PUBLICOS = [
  {
    id: "para-lojas",
    entrar: "entrar-loja",
    titulo: "Para quem tem loja ou fábrica",
    texto: "Coloque seus produtos, físicos ou digitais, na frente de uma rede de afiliados.",
    itens: [
      "Cadastre produtos e defina a comissão de cada um",
      "Afiliados divulgam pelo próprio link; você cuida do pedido e da nota fiscal",
      "A sua parte já vem separada no pagamento, pela Lytex",
    ],
    cta: "Entrar na lista como loja",
  },
  {
    id: "para-afiliados",
    entrar: "entrar-afiliado",
    titulo: "Para quem quer ser afiliado",
    texto: "Divulgue produtos de lojas verificadas pelo seu link, sem precisar ter estoque.",
    itens: [
      "Monte a sua vitrine, com um endereço só seu",
      "Compartilhe no Instagram, no WhatsApp ou onde preferir",
      "A comissão de cada produto é definida pela loja e aparece antes de você divulgar",
    ],
    cta: "Entrar na lista como afiliado",
  },
  {
    id: "para-quem-trabalha-em-loja",
    entrar: "entrar-vendedor",
    titulo: "Para quem trabalha em loja",
    texto: "Se você atende ou vende em uma loja, ela poderá convidar você como vendedor.",
    itens: [
      "A loja combina a sua comissão e convida você pelo e-mail",
      "Você acompanha as suas vendas em um painel só seu",
      "Entre na lista dizendo em qual loja trabalha e seja avisado",
    ],
    cta: "Entrar na lista como vendedor",
  },
  {
    id: "para-compradores",
    entrar: "entrar-comprador",
    titulo: "Para quem quer comprar",
    texto: "Produtos de lojas verificadas, com nota fiscal e prazo para desistir.",
    itens: [
      "Toda loja tem CNPJ ativo e emite nota fiscal",
      "Você tem 7 dias para desistir da compra",
      "O pagamento é processado pela Lytex",
    ],
    cta: "Entrar na lista como comprador",
  },
] as const;

const REGRAS = [
  [IconeSplit, "Split na Lytex", "Pagamentos processados pela Lytex. Cada parte recebe a sua direto; a Staypse nunca recebe nem guarda dinheiro de ninguém."],
  [IconeSelo, "Lojas verificadas", "Só entra loja com CNPJ ativo, que emite nota fiscal de todas as vendas. Todo produto passa por análise."],
  [IconeVolta, "Compra com garantia", "O comprador tem 7 dias para desistir e pedir de volta tudo o que pagou."],
  [IconePessoa, "Sem pirâmide", "A comissão vem só das vendas do próprio afiliado. Não existe taxa de adesão nem comissão por recrutar pessoas."],
] as const;

export default function Inicio() {
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
        {/* ---------- topo ---------- */}
        <section id="topo" className="overflow-hidden bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-24">
            <div className="flex flex-col gap-7">
              <h1 className="text-[3.1rem] leading-[0.98] tracking-[-0.04em] text-branco sm:text-7xl lg:text-8xl">
                A nova era tá chegando
              </h1>
              <p className="max-w-lg text-lg text-gelo/85 sm:text-xl">
                A Staypse é uma plataforma de afiliados para produtos físicos e digitais. Entre na lista de espera e
                seja avisado antes da abertura.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="#lista"
                  className="inline-flex min-h-14 items-center justify-center self-start rounded-full bg-ciano px-8 py-4 text-lg font-medium text-petroleo hover:brightness-95 max-sm:self-stretch"
                >
                  Entrar na lista de espera
                </a>
                <p className="text-sm text-gelo/75">Pagamentos processados pela Lytex.</p>
              </div>
            </div>
            <VitrineSplit host={urlDoSite().replace(/^https?:\/\//, "")} />
          </div>
        </section>

        {/* ---------- como funciona (sequência real: 1 → 2 → 3) ---------- */}
        <section id="como-funciona" className="scroll-mt-16 bg-gelo">
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

        {/* ---------- uma faixa para cada perfil ---------- */}
        {PUBLICOS.map((p, i) => (
          <section key={p.id} id={p.id} className={`scroll-mt-16 ${i % 2 === 0 ? "bg-branco" : "bg-gelo"}`}>
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:py-16 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="text-3xl leading-tight sm:text-4xl">{p.titulo}</h2>
                <p className="mt-3 max-w-sm text-lg text-petroleo/80">{p.texto}</p>
              </div>
              <div>
                <ul className="flex flex-col divide-y divide-petroleo/15 border-y border-petroleo/15">
                  {p.itens.map((t) => (
                    <li key={t} className="flex gap-3 py-4">
                      <IconeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                {/* <a> comum (não Link): o formulário escuta o "hashchange" para escolher o perfil */}
                <a href={`#${p.entrar}`} className="mt-4 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                  {p.cta}
                </a>
              </div>
            </div>
          </section>
        ))}

        {/* ---------- regras claras ---------- */}
        <section id="regras" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-16 sm:py-20">
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
          <p className="mt-8 text-sm text-petroleo/75">
            Veja também a{" "}
            <Link href="/produtos-proibidos" className="inline-flex min-h-11 items-center underline">
              lista de produtos proibidos
            </Link>
            .
          </p>
        </section>

        {/* ---------- formulário (único botão da página) ---------- */}
        <section id="lista" className="scroll-mt-16 bg-petroleo px-4 py-16 sm:py-20">
          {/* destinos dos links "Entrar na lista como ..." (o formulário escolhe o perfil) */}
          {PUBLICOS.map((p) => (
            <span key={p.entrar} id={p.entrar} className="block scroll-mt-20" />
          ))}
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="text-gelo">
              <h2 className="text-3xl leading-tight text-branco sm:text-4xl">Entre na lista de espera</h2>
              <p className="mt-3 max-w-md text-lg text-gelo/85">
                Leva menos de um minuto. Avisamos você quando abrir, e quem indicar mais pessoas entra antes no
                acesso antecipado. Não há sorteio nem prêmio em dinheiro.
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
        <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-16 px-4 py-16 sm:py-20">
          <h2 className="mb-8 text-3xl leading-tight sm:text-4xl">Perguntas frequentes</h2>
          <Perguntas />
        </section>
      </main>
      <BarraFixa />
    </>
  );
}
