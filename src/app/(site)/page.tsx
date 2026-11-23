// Página inicial de PRÉ-LANÇAMENTO. O ÚNICO botão da página é entrar na lista
// de espera (não há "Entrar" nem "Criar conta" aqui). É para onde a bio do
// Instagram aponta, pensada primeiro para o celular.
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro, o split acontece na Lytex.
import Link from "next/link";
import { Suspense } from "react";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import { COMPARATIVO, LinkParaLoja, PainelLoja, Perguntas } from "@/components/inicio";
import { urlDoSite } from "@/lib/supabase/env";
import { FormLista } from "./lista/FormLista";

const PASSOS = [
  ["A loja cadastra o produto", "A Lia Calçados coloca o Tênis Runner no ar e define a comissão dele. Pode ser produto físico ou digital."],
  ["O afiliado divulga o link", "A Ana monta a vitrine dela e compartilha /@ana/tenis-runner no Instagram. Quem clica cai na loja da Lia. Ela não precisa ter estoque."],
  ["A Lytex processa e divide o pagamento", "Quando alguém compra, o split acontece na Lytex: cada parte recebe a sua direto. A Staypse nunca recebe nem guarda o dinheiro de ninguém."],
] as const;

// Um bloco para cada perfil da lista de espera (as âncoras servem aos links do menu e da bio)
const PUBLICOS = [
  {
    id: "para-lojas",
    entrar: "entrar-loja",
    titulo: "Tenho loja ou fábrica",
    texto:
      "Você cadastra os produtos, define a comissão de cada um e ganha uma loja oficial pronta, com 4 modelos para escolher. Pode convidar vendedores próprios, cada um com a sua comissão. O split é na Lytex e a nota fiscal de cada venda é da sua loja.",
    cta: "Entrar na lista como loja",
  },
  {
    id: "para-afiliados",
    entrar: "entrar-afiliado",
    titulo: "Quero divulgar produtos",
    texto:
      "Você monta uma vitrine com endereço só seu e um código de indicação. Cada produto ganha um link curto, como /@ana/tenis-runner, que leva à página do produto ou direto ao pagamento. A comissão aparece antes de você divulgar.",
    cta: "Entrar na lista como afiliado",
  },
  {
    id: "para-quem-trabalha-em-loja",
    entrar: "entrar-vendedor",
    titulo: "Trabalho em uma loja",
    texto:
      "A loja convida você como vendedor pelo e-mail e combina a sua comissão. Cada venda sai pelo seu link e você acompanha no seu painel. Na lista, diga em qual loja trabalha.",
    cta: "Entrar na lista como vendedor",
  },
  {
    id: "para-compradores",
    entrar: "entrar-comprador",
    titulo: "Só quero comprar",
    texto:
      "Compre na loja oficial do produto. Toda loja tem CNPJ ativo e emite nota fiscal, o pagamento é processado pela Lytex e você tem 7 dias para desistir.",
    cta: "Entrar na lista como comprador",
  },
] as const;

const REGRAS = [
  ["Split na Lytex", "Pagamentos processados pela Lytex. Cada parte recebe a sua direto; a Staypse nunca recebe nem guarda dinheiro de ninguém."],
  ["Lojas verificadas", "Só entra loja com CNPJ ativo, que emite nota fiscal de todas as vendas. Todo produto passa por análise antes de aparecer."],
  ["Compra com garantia", "O comprador tem 7 dias para desistir e pedir de volta tudo o que pagou."],
  ["Sem pirâmide", "A comissão vem só das vendas do próprio afiliado. Não existe taxa de adesão nem comissão por recrutar pessoas."],
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
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-24">
            <div className="flex flex-col gap-7">
              <h1 className="text-[3.1rem] leading-[0.98] tracking-[-0.04em] text-branco sm:text-7xl lg:text-8xl">
                A nova era tá chegando
              </h1>
              <p className="max-w-lg text-lg text-gelo/85 sm:text-xl">
                A Staypse é uma plataforma de afiliados para produtos físicos e digitais. A loja define a comissão, o
                afiliado divulga com um link próprio e o pagamento já sai dividido. Entre na lista de espera e seja
                avisado antes da abertura.
              </p>
              <div className="flex flex-col gap-3">
                <a href="#lista" className={`${BOTAO} self-start max-sm:self-stretch`}>
                  Entrar na lista de espera
                </a>
                <p className="max-w-md text-sm text-gelo/75">
                  Pagamentos processados pela Lytex. Lojas com CNPJ e nota fiscal; o comprador tem 7 dias para desistir.
                </p>
              </div>
            </div>
            <LinkParaLoja host={urlDoSite().replace(/^https?:\/\//, "")} />
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
                  <dt className="text-lg font-medium">{tema}</dt>
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
            <ol className="flex flex-col gap-8">
              {PASSOS.map(([titulo, texto], i) => (
                <li key={titulo} className="grid grid-cols-[2rem_1fr] gap-x-4">
                  <span className="pt-1 font-mono text-sm tabular-nums text-petroleo/75">{i + 1}</span>
                  <div>
                    <h3 className="text-xl">{titulo}</h3>
                    <p className="mt-1 max-w-md text-petroleo/80">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- um bloco para cada perfil ---------- */}
        <div id="para-quem" className="scroll-mt-16 bg-branco">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <h2 className="max-w-2xl text-3xl leading-tight sm:text-4xl">Onde você se encaixa</h2>
            <div className="mt-10 border-t border-petroleo/15">
              {PUBLICOS.map((p) => (
                <section key={p.id} id={p.id} className="scroll-mt-20 grid gap-3 border-b border-petroleo/15 py-7 md:grid-cols-[0.8fr_1.2fr] md:gap-x-12">
                  <h3 className="text-2xl leading-tight">{p.titulo}</h3>
                  <div>
                    <p className="max-w-xl text-petroleo/80">{p.texto}</p>
                    {/* <a> comum (não Link): o formulário escuta o "hashchange" para escolher o perfil */}
                    <a href={`#${p.entrar}`} className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                      {p.cta}
                    </a>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- o painel da loja ---------- */}
        <section id="painel" className="scroll-mt-16 bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14">
            <div>
              <h2 className="text-3xl leading-tight text-branco sm:text-4xl">Cada pedido, em um painel só</h2>
              <p className="mt-3 max-w-md text-lg text-gelo/85">
                A loja vê os produtos, a comissão que definiu em cada um e as etapas de cada pedido, da aprovação do
                pagamento à nota fiscal. As devoluções ficam no mesmo lugar.
              </p>
            </div>
            <PainelLoja />
          </div>
        </section>

        {/* ---------- regras ---------- */}
        <section id="regras" className="scroll-mt-16 bg-gelo">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16">
            <h2 className="max-w-xl text-3xl leading-tight sm:text-4xl">As regras, sem letra miúda</h2>
            <dl className="mt-8 grid gap-x-12 gap-y-6 md:grid-cols-2">
              {REGRAS.map(([titulo, texto]) => (
                <div key={titulo} className="border-t border-petroleo/15 pt-4">
                  <dt className="text-lg font-medium">{titulo}</dt>
                  <dd className="mt-1 text-petroleo/80">{texto}</dd>
                </div>
              ))}
            </dl>
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
        <section id="lista" className="scroll-mt-16 bg-petroleo px-4 py-16 sm:py-24">
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
              <p className="mt-4 max-w-md text-gelo/85">
                Entrar é grátis, você escolhe o seu perfil, informa só o necessário e pode pedir a exclusão dos seus
                dados quando quiser.
              </p>
            </div>
            <div className="w-full rounded-2xl bg-branco p-6 sm:p-8">
              {/* Suspense: o formulário lê ?ref= do endereço */}
              <Suspense fallback={<div className="h-96 rounded-2xl bg-gelo" />}>
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
            <p className="max-w-md text-2xl font-semibold leading-tight">Seja avisado antes da abertura da Staypse.</p>
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
