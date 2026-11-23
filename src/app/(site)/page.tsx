// Página inicial de PRÉ-LANÇAMENTO. O ÚNICO botão da página é entrar na lista
// de espera (não há "Entrar" nem "Criar conta" aqui). É para onde a bio do
// Instagram aponta — pensada primeiro para o celular.
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro — o split acontece na Lytex.
import Link from "next/link";
import { Suspense } from "react";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import {
  COMPARATIVO,
  IconeCheck,
  IconeCrachaVendedor,
  IconeLink,
  IconeLoja,
  IconePessoa,
  IconeSacola,
  IconeSelo,
  IconeSplit,
  IconeVolta,
  PainelIlustrativo,
  Perguntas,
  VitrineSplit,
} from "@/components/inicio";
import { urlDoSite } from "@/lib/supabase/env";
import { FormLista } from "./lista/FormLista";

const PASSOS = [
  ["A loja cadastra os produtos", "Lojas e fábricas cadastram produtos físicos ou digitais e definem a comissão de cada um."],
  ["O afiliado divulga pelo seu link", "Cada afiliado monta a sua vitrine, com um endereço só seu, e compartilha onde quiser. Sem estoque."],
  ["A Lytex processa e divide o pagamento", "Quando alguém compra, o split acontece na Lytex: cada parte recebe a sua direto. A Staypse nunca recebe nem guarda o dinheiro de ninguém."],
] as const;

const CONFIANCA = [
  [IconeSplit, "Split automático na Lytex"],
  [IconeSelo, "Lojas com CNPJ e nota fiscal"],
  [IconeVolta, "7 dias para desistir da compra"],
] as const;

// Um cartão para cada perfil da lista de espera (as âncoras servem aos links do menu e da bio)
const PUBLICOS = [
  {
    id: "para-lojas",
    entrar: "entrar-loja",
    Icone: IconeLoja,
    titulo: "Para quem tem loja ou fábrica",
    texto: "Coloque seus produtos na frente de uma rede de afiliados.",
    itens: [
      "Loja oficial pronta, com 4 modelos para escolher",
      "Afiliados e vendedores próprios, cada um com a sua comissão",
      "Split automático na Lytex e nota fiscal de cada venda",
    ],
    cta: "Entrar na lista como loja",
  },
  {
    id: "para-afiliados",
    entrar: "entrar-afiliado",
    Icone: IconeLink,
    titulo: "Para quem quer ser afiliado",
    texto: "Divulgue produtos de lojas verificadas, sem precisar ter estoque.",
    itens: [
      "Vitrine própria, com endereço só seu e código de indicação",
      "Link para a página do produto ou direto para o pagamento",
      "Comissão definida pela loja e visível antes de você divulgar",
    ],
    cta: "Entrar na lista como afiliado",
  },
  {
    id: "para-quem-trabalha-em-loja",
    entrar: "entrar-vendedor",
    Icone: IconeCrachaVendedor,
    titulo: "Para quem trabalha em loja",
    texto: "Se você atende ou vende em uma loja, ela poderá convidar você como vendedor.",
    itens: [
      "A loja combina a sua comissão e convida você pelo e-mail",
      "Cada venda sai pelo seu link, e você a acompanha no seu painel",
      "Entre na lista dizendo em qual loja trabalha e seja avisado",
    ],
    cta: "Entrar na lista como vendedor",
  },
  {
    id: "para-compradores",
    entrar: "entrar-comprador",
    Icone: IconeSacola,
    titulo: "Para quem quer comprar",
    texto: "Compre na loja oficial do produto, com nota fiscal e prazo para desistir.",
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

const BOTAO =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-ciano px-8 py-4 text-lg font-medium text-petroleo hover:brightness-95";

export default function Inicio() {
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
        {/* ---------- topo ---------- */}
        <section id="topo" className="overflow-hidden bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-14 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-20">
            <div className="flex flex-col gap-7">
              <h1 className="text-[3.1rem] leading-[0.98] tracking-[-0.04em] text-branco sm:text-7xl lg:text-8xl">
                A nova era tá chegando
              </h1>
              <p className="max-w-lg text-lg text-gelo/85 sm:text-xl">
                A Staypse é uma plataforma de afiliados para produtos físicos e digitais: a loja define a comissão,
                o afiliado divulga pelo seu link e o pagamento já sai dividido. Entre na lista de espera e seja
                avisado antes da abertura.
              </p>
              <div className="flex flex-col gap-3">
                <a href="#lista" className={`${BOTAO} self-start max-sm:self-stretch`}>
                  Entrar na lista de espera
                </a>
                <p className="text-sm text-gelo/75">Pagamentos processados pela Lytex.</p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-gelo/15 pt-5 text-sm text-gelo/85 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {CONFIANCA.map(([Icone, t]) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="text-ciano"><Icone /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <VitrineSplit host={urlDoSite().replace(/^https?:\/\//, "")} />
          </div>
        </section>

        {/* ---------- como é hoje x com a Staypse ---------- */}
        <section id="diferenca" className="scroll-mt-16 bg-branco">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="max-w-2xl text-3xl leading-tight sm:text-4xl">O que muda quando a venda por afiliados tem regras</h2>
            <div className="mt-10 hidden grid-cols-[0.7fr_1fr_1fr] gap-x-8 border-b border-petroleo/15 pb-3 text-sm font-medium text-petroleo/75 md:grid">
              <span />
              <span>Como costuma ser hoje</span>
              <span>Com a Staypse</span>
            </div>
            <dl className="divide-y divide-petroleo/15 md:divide-y-0">
              {COMPARATIVO.map(([tema, hoje, staypse]) => (
                <div key={tema} className="grid gap-2 py-5 md:grid-cols-[0.7fr_1fr_1fr] md:gap-x-8 md:border-b md:border-petroleo/10">
                  <dt className="text-xl font-extrabold">{tema}</dt>
                  <dd className="text-petroleo/75">
                    <span className="mb-0.5 block text-sm font-medium md:hidden">Como costuma ser hoje</span>
                    {hoje}
                  </dd>
                  <dd className="font-medium">
                    <span className="mb-0.5 block text-sm font-medium text-petroleo/75 md:hidden">Com a Staypse</span>
                    {staypse}
                  </dd>
                </div>
              ))}
            </dl>
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

        {/* ---------- um cartão para cada perfil ---------- */}
        <div id="para-quem" className="scroll-mt-16 bg-branco">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="max-w-2xl text-3xl leading-tight sm:text-4xl">Um lugar para cada papel na venda</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {PUBLICOS.map((p) => (
                <section key={p.id} id={p.id} className="scroll-mt-20 flex flex-col rounded-3xl border border-petroleo/15 bg-gelo p-6 sm:p-8">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-petroleo text-ciano">
                    <p.Icone />
                  </span>
                  <h3 className="mt-5 text-2xl leading-tight">{p.titulo}</h3>
                  <p className="mt-2 text-petroleo/80">{p.texto}</p>
                  <ul className="mt-5 flex flex-col gap-3">
                    {p.itens.map((t) => (
                      <li key={t} className="flex gap-3">
                        <IconeCheck className="mt-1 h-5 w-5 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  {/* <a> comum (não Link): o formulário escuta o "hashchange" para escolher o perfil */}
                  <a href={`#${p.entrar}`} className="mt-auto inline-flex min-h-11 items-center pt-5 font-medium underline underline-offset-4">
                    {p.cta}
                  </a>
                </section>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <a href="#lista" className={`${BOTAO} max-sm:w-full`}>
                Entrar na lista de espera
              </a>
            </div>
          </div>
        </div>

        {/* ---------- demonstração ilustrativa do painel ---------- */}
        <section id="painel" className="scroll-mt-16 bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
            <div>
              <h2 className="text-3xl leading-tight text-branco sm:text-4xl">Cada pedido, em um painel só</h2>
              <p className="mt-3 max-w-md text-lg text-gelo/85">
                A loja vê os produtos, a comissão que definiu e as etapas de cada pedido, da aprovação do pagamento à nota fiscal.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-gelo/90">
                {["Comissão de cada produto escolhida pela loja", "Pagamento e split registrados na Lytex", "Pedidos, nota fiscal e devoluções no mesmo lugar"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <IconeCheck className="mt-1 h-5 w-5 shrink-0 text-ciano" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <PainelIlustrativo />
          </div>
        </section>

        {/* ---------- regras claras ---------- */}
        <section id="regras" className="scroll-mt-16 bg-gelo">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
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
          </div>
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
              <ul className="mt-6 flex flex-col gap-3 text-gelo/90">
                {["Entrar na lista é grátis", "Você escolhe o seu perfil e só pedimos o necessário", "Pode pedir a exclusão dos seus dados quando quiser"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <IconeCheck className="mt-1 h-5 w-5 shrink-0 text-ciano" />
                    {t}
                  </li>
                ))}
              </ul>
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
        <section id="faq" className="scroll-mt-16 bg-branco">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-20 lg:grid-cols-[0.6fr_1.4fr]">
            <div>
              <h2 className="text-3xl leading-tight sm:text-4xl">Perguntas frequentes</h2>
              <p className="mt-3 max-w-xs text-petroleo/80">Preço, pagamento, devolução e dados: tudo o que dá para responder antes da abertura.</p>
            </div>
            <Perguntas />
          </div>
        </section>

        {/* ---------- fecho ---------- */}
        <section className="bg-gelo">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-2xl font-extrabold leading-tight">Seja avisado antes da abertura da Staypse.</p>
            <a href="#lista" className={`${BOTAO} max-sm:w-full`}>
              Entrar na lista de espera
            </a>
          </div>
        </section>
      </main>
      <BarraFixa />
    </>
  );
}
