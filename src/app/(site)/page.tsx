// Página inicial editorial: hero com cartões de vidro (link, vitrine e recibo da divisão),
// seções com ritmos diferentes, taxas, passos, perguntas e fecho.
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro, o split acontece na Lytex.
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import { JsonLd } from "@/components/JsonLd";
import { PERGUNTAS, Perguntas, VisualHero } from "@/components/inicio";
import { TaxasDaInicial } from "@/components/inicio-taxas";
import { PALAVRAS_CHAVE, dadosFaq } from "@/lib/seo";
import { urlDoSite } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: { absolute: "Plataforma de afiliados para lojas | Staypse" },
  description:
    "Venda com afiliados: sua loja online com programa de afiliados e split de pagamento automático, para produtos físicos e digitais. Crie a conta grátis.",
  keywords: PALAVRAS_CHAVE,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const PRIMARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-ciano px-8 py-4 text-lg font-medium text-petroleo hover:brightness-95";
const SECUNDARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full border border-gelo/60 px-8 py-4 text-lg font-medium text-gelo hover:bg-gelo/10";
const BOTAO =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-petroleo px-7 py-3 font-medium text-branco hover:bg-petroleo/90";
const H2 = "text-4xl leading-[1] tracking-[-0.035em] sm:text-6xl";
const WRAP = "mx-auto max-w-6xl px-4";

const DIFERENCIAIS = [
  ["Sem mensalidade", "Criar conta é grátis. A taxa é por venda e já vem descontada na divisão."],
  ["Split automático", "O pagamento sai dividido na hora, direto para cada parte."],
  ["Loja oficial pronta", "Escolha um dos 8 modelos e publique seus produtos."],
  ["Código de indicação", "Cada afiliado tem vitrine, links curtos e código próprio."],
] as const;

const PASSOS = [
  ["A loja cadastra os produtos", "Foto, preço, estoque e a comissão de cada produto. Quem decide quanto o afiliado leva é a loja."],
  ["Afiliados e vendedores divulgam", "Cada um usa o seu link ou a sua vitrine. Quem clica cai na loja oficial."],
  ["O cliente paga e o valor se divide", "Pix ou cartão: o valor já sai repartido entre loja, afiliado e Staypse. A nota fiscal é da loja."],
] as const;

const REGRAS = [
  ["Split automático", "Cada parte recebe a sua direto. Nada passa pela mão da Staypse."],
  ["Lojas com CNPJ", "Só entra loja com CNPJ ativo e nota fiscal em toda venda. Todo produto passa por análise."],
  ["7 dias para desistir", "O comprador pede de volta tudo o que pagou, e a devolução segue a proporção do split."],
  ["Sem pirâmide", "A comissão vem só das vendas do próprio afiliado. Sem taxa de adesão nem comissão por recrutar."],
] as const;

export default function Inicio() {
  const host = urlDoSite().replace(/^https?:\/\//, "");
  return (
    <>
      <JsonLd dados={dadosFaq(PERGUNTAS)} />
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
        {/* ---------- hero ---------- */}
        <section
          id="topo"
          className="relative isolate overflow-hidden bg-petroleo text-gelo"
          style={{
            backgroundImage:
              "radial-gradient(60% 55% at 85% 8%, rgba(20,214,196,0.24), transparent 65%), radial-gradient(45% 45% at 0% 100%, rgba(20,214,196,0.12), transparent 65%), linear-gradient(180deg, #08343a 0%, #062c30 55%, #04201f 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className={`${WRAP} grid items-center gap-14 pt-14 pb-16 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-24`}>
            <div className="flex flex-col gap-7 lg:col-span-6">
              <h1
                className="hero-entrada max-w-[12ch] text-[3.5rem] leading-[0.95] tracking-[-0.035em] text-branco sm:text-7xl lg:text-[5.5rem]"
              >
                A nova era tá chegando
              </h1>
              <p className="hero-entrada max-w-md text-lg text-gelo/85 sm:text-xl" style={{ "--atraso": "0.1s" } as React.CSSProperties}>
                A Staypse junta lojas, afiliados e vendedores da loja. Cada venda tem um link, e o pagamento já sai
                dividido na hora.
              </p>
              <div className="hero-entrada flex flex-col gap-3 sm:flex-row" style={{ "--atraso": "0.2s" } as React.CSSProperties}>
                <Link href="/cadastro" className={PRIMARIO}>
                  Criar conta grátis
                </Link>
                <Link href="/entrar" className={SECUNDARIO}>
                  Entrar
                </Link>
              </div>
              <p className="hero-entrada text-sm text-gelo/80" style={{ "--atraso": "0.25s" } as React.CSSProperties}>
                Sem mensalidade.
              </p>
            </div>
            <div className="hero-entrada lg:col-span-6" style={{ "--atraso": "0.3s" } as React.CSSProperties}>
              <VisualHero host={host} />
            </div>
          </div>
        </section>

        {/* ---------- diferenciais ---------- */}
        <section aria-label="Diferenciais" className="bg-branco">
          <ul className={`${WRAP} grid sm:grid-cols-2 lg:grid-cols-4`}>
            {DIFERENCIAIS.map(([titulo, texto]) => (
              <li key={titulo} className="border-b border-petroleo/10 py-8 sm:odd:pr-8 sm:even:pl-8 lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:pr-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:border-petroleo/10">
                <h2 className="text-xl leading-tight tracking-normal">{titulo}</h2>
                <p className="mt-2 text-petroleo/80">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- lojas: texto à esquerda, lista à direita ---------- */}
        <section id="para-lojas" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16`}>
            <div className="lg:col-span-5">
              <h2 className={H2}>Para lojas e fábricas</h2>
              <p className="mt-6 max-w-md text-lg text-petroleo/85">
                Cadastre os produtos, defina a comissão de cada um e ganhe uma loja oficial pronta. Físico ou digital, de
                loja de bairro ou de fábrica.
              </p>
              <Link href="/cadastro" className={`${BOTAO} mt-8`}>
                Criar conta da loja
              </Link>
            </div>
            <ul className="divide-y divide-petroleo/10 rounded-3xl border border-petroleo/10 bg-branco px-6 shadow-[0_24px_60px_-30px_rgba(6,44,48,0.35)] sm:px-8 lg:col-span-7">
              {[
                "8 modelos de loja oficial para escolher",
                "Você decide a comissão de cada produto",
                "Convide vendedores próprios, cada um com a sua comissão",
                "Nota fiscal de cada venda é da sua loja",
              ].map((t) => (
                <li key={t} className="py-5 text-xl leading-snug font-medium tracking-[-0.01em] sm:text-2xl">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- afiliados: lista à esquerda, texto à direita (invertido) ---------- */}
        <section id="para-afiliados" className="scroll-mt-16 bg-branco">
          <div className={`${WRAP} grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16`}>
            <ul className="flex flex-col gap-3 text-lg lg:order-1 lg:col-span-7">
              {[
                "Link curto para cada produto, para a bio ou para o story",
                "A comissão aparece antes de você divulgar",
                "Código de indicação próprio",
                "Os resultados dependem dos produtos e de como você divulga",
              ].map((t) => (
                <li key={t} className="rounded-2xl border border-petroleo/10 bg-gelo px-6 py-5">
                  {t}
                </li>
              ))}
            </ul>
            <div className="lg:order-2 lg:col-span-5">
              <h2 className={H2}>Para afiliados</h2>
              <p className="mt-6 max-w-md text-lg text-petroleo/85">
                Monte uma vitrine com endereço só seu e divulgue produtos de lojas com CNPJ. Sem estoque e sem caixa
                para embalar.
              </p>
              <Link href="/cadastro" className={`${BOTAO} mt-8`}>
                Criar conta de afiliado
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- vendedores: painel petróleo em destaque ---------- */}
        <section id="para-quem-trabalha-em-loja" className="scroll-mt-16 bg-branco">
          <div className={`${WRAP} pb-20 sm:pb-28`}>
            <div
              className="grid gap-8 rounded-[2rem] bg-petroleo p-8 text-gelo sm:p-14 lg:grid-cols-12"
              style={{ backgroundImage: "radial-gradient(60% 80% at 100% 0%, rgba(20,214,196,0.22), transparent 65%)" }}
            >
              <h2 className="text-4xl leading-[1] tracking-[-0.03em] text-branco sm:text-5xl lg:col-span-4">Para vendedores da loja</h2>
              <div className="lg:col-span-7 lg:col-start-6">
                <p className="text-xl leading-snug text-gelo/95 sm:text-2xl">
                  Trabalha em uma loja? A loja convida você pelo e-mail e combina a sua comissão. Cada venda sai pelo seu
                  link. Aceite o convite e a sua conta já fica ligada à loja, acompanhe as suas vendas no seu painel e
                  comece sem taxa de adesão.
                </p>
                <Link href="/cadastro" className={`${PRIMARIO} mt-8`}>
                  Criar conta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- compradores ---------- */}
        <section id="para-compradores" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} py-20 sm:py-28`}>
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <h2 className={H2}>Para quem compra</h2>
                <p className="mt-5 max-w-md text-lg text-petroleo/85">
                  Compre direto na loja oficial do produto, com Pix ou cartão e sem surpresa.
                </p>
              </div>
              <Link href="/pedido" className={`${BOTAO} self-start`}>
                Consultar um pedido
              </Link>
            </div>
            <ul className="mt-12 grid border-t border-petroleo/15 md:grid-cols-3">
              {[
                "Toda loja tem CNPJ ativo e emite nota fiscal",
                "Pagamento processado pela Lytex",
                "7 dias para desistir da compra",
              ].map((t) => (
                <li key={t} className="border-b border-petroleo/15 py-6 text-xl leading-snug font-medium md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-petroleo/15">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- confiança ---------- */}
        <section
          id="regras"
          className="scroll-mt-16 bg-petroleo text-gelo"
          style={{ backgroundImage: "radial-gradient(50% 45% at 90% 0%, rgba(20,214,196,0.16), transparent 65%)" }}
        >
          <div className={`${WRAP} py-20 sm:py-28`}>
            <h2 className="max-w-3xl text-4xl leading-[1] tracking-[-0.035em] text-branco sm:text-6xl">
              A Staypse nunca encosta no dinheiro
            </h2>
            <p className="mt-6 max-w-lg text-lg text-gelo/90">
              Quem processa e divide o pagamento é a Lytex. A gente cuida do link, da vitrine e das regras.
            </p>
            <dl className="mt-14 grid gap-4 sm:grid-cols-2">
              {REGRAS.map(([titulo, texto]) => (
                <div key={titulo} className="rounded-3xl border border-white/12 bg-white/[0.04] p-7">
                  <dt className="text-xl font-extrabold text-branco">{titulo}</dt>
                  <dd className="mt-2 max-w-sm text-gelo/90">{texto}</dd>
                </div>
              ))}
            </dl>
            <Link href="/produtos-proibidos" className="mt-8 inline-flex min-h-11 items-center underline">
              Ver a lista de produtos proibidos
            </Link>
          </div>
        </section>

        {/* ---------- taxas ---------- */}
        <section id="taxas" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} grid items-center gap-10 py-20 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
            <div className="min-w-0">
              <h2 className={H2}>Taxas claras, por venda</h2>
              <p className="mt-6 max-w-md text-lg text-petroleo/85">
                Sem mensalidade e sem taxa de adesão. A taxa vale por meio de pagamento, é paga por quem vende e já
                sai descontada na divisão. O comprador não paga taxa.
              </p>
              <Link href="/taxas#simulador" className={`${BOTAO} mt-8`}>
                Simular uma venda
              </Link>
            </div>
            <div className="min-w-0 rounded-3xl border border-petroleo/10 bg-branco p-5 shadow-[0_24px_60px_-30px_rgba(6,44,48,0.35)] sm:p-8">
              <Suspense fallback={<p className="text-sm text-petroleo/75">Carregando as taxas.</p>}>
                <TaxasDaInicial />
              </Suspense>
              <Link href="/taxas" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline">
                Ver todos os detalhes de taxas
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- como funciona: sequência real ---------- */}
        <section id="como-funciona" className="scroll-mt-16 bg-branco">
          <div className={`${WRAP} py-20 sm:py-28`}>
            <h2 className={`${H2} max-w-3xl`}>Como funciona, em 3 passos</h2>
            <ol className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
              <span aria-hidden="true" className="absolute top-6 right-[16%] left-[8%] hidden h-px bg-petroleo/20 md:block" />
              {PASSOS.map(([titulo, texto], i) => (
                <li key={titulo} className="relative">
                  <span
                    className="relative flex h-12 w-12 items-center justify-center rounded-full bg-petroleo text-xl font-extrabold text-ciano"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-6 text-2xl leading-tight">{titulo}</h3>
                  <p className="mt-2 max-w-sm text-petroleo/85">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- perguntas ---------- */}
        <section id="faq" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} grid gap-10 py-20 sm:py-28 lg:grid-cols-[0.6fr_1.4fr]`}>
            <h2 className="text-4xl leading-[1] tracking-[-0.035em] sm:text-5xl">Perguntas frequentes</h2>
            <Perguntas />
          </div>
        </section>

        {/* ---------- fecho ---------- */}
        <section id="fim" className="bg-petroleo">
          <div className={`${WRAP} py-16 sm:py-24`}>
            <div
              className="flex flex-col items-start gap-8 rounded-[2rem] p-8 text-petroleo sm:p-16"
              style={{ backgroundImage: "linear-gradient(135deg, #14d6c4 0%, #5fe3d5 55%, #b6f1ea 100%)" }}
            >
              <h2 className="max-w-3xl text-5xl leading-[0.95] tracking-[-0.04em] sm:text-7xl">Crie a sua conta hoje</h2>
              <p className="max-w-md text-lg">Grátis, sem mensalidade.</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  href="/cadastro"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-petroleo px-8 py-4 text-lg font-medium text-branco hover:bg-petroleo/90"
                >
                  Criar conta grátis
                </Link>
                <Link
                  href="/entrar"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-petroleo px-8 py-4 text-lg font-medium hover:bg-petroleo/10"
                >
                  Entrar
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BarraFixa />
    </>
  );
}
