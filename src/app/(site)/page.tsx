// Página inicial editorial: hero tipográfico, um único diagrama (o link que se divide),
// seções com ritmos diferentes, taxas, passos, perguntas e fecho.
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro, o split acontece na Lytex.
import { Suspense } from "react";
import Link from "next/link";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import { LinkDividido, Perguntas } from "@/components/inicio";
import { TaxasDaInicial } from "@/components/inicio-taxas";
import { urlDoSite } from "@/lib/supabase/env";

const PRIMARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-ciano px-8 py-4 text-lg font-medium text-petroleo hover:brightness-95";
const SECUNDARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full border border-gelo/60 px-8 py-4 text-lg font-medium text-gelo hover:bg-gelo/10";
const BOTAO =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-petroleo px-7 py-3 font-medium text-branco hover:bg-petroleo/90";
const H2 = "text-5xl leading-[0.95] tracking-[-0.04em] sm:text-7xl";
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
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
        {/* ---------- hero ---------- */}
        <section id="topo" className="bg-petroleo text-gelo">
          <div className={`${WRAP} pt-16 pb-16 sm:pt-24 lg:pb-24`}>
            <h1 className="max-w-[11ch] text-[4.25rem] leading-[0.86] tracking-[-0.04em] word-spacing-[0.08em] text-branco sm:text-[8rem] lg:max-w-[9ch] lg:text-[11rem]">
              A nova era tá chegando
            </h1>
            <div className="mt-14 grid gap-12 border-t border-gelo/25 pt-8 lg:mt-20 lg:grid-cols-12 lg:gap-8">
              <div className="flex flex-col gap-6 lg:col-span-5">
                <p className="max-w-md text-xl text-gelo/90">
                  A Staypse junta lojas, afiliados e vendedores da loja. Cada venda tem um link, e o pagamento já sai
                  dividido na hora.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/cadastro" className={PRIMARIO}>
                    Criar conta grátis
                  </Link>
                  <Link href="/entrar" className={SECUNDARIO}>
                    Entrar
                  </Link>
                </div>
                <p className="text-sm text-gelo/80">Sem mensalidade.</p>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <LinkDividido host={host} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- diferenciais ---------- */}
        <section aria-label="Diferenciais" className="bg-branco">
          <ul className={`${WRAP} grid gap-x-8 gap-y-8 py-12 sm:grid-cols-2 lg:grid-cols-4`}>
            {DIFERENCIAIS.map(([titulo, texto]) => (
              <li key={titulo} className="border-t-2 border-petroleo pt-4">
                <h2 className="text-xl leading-tight tracking-normal">{titulo}</h2>
                <p className="mt-2 text-petroleo/80">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- lojas: título à esquerda, lista em linhas ---------- */}
        <section id="para-lojas" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} grid gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:gap-8`}>
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
            <ul className="divide-y divide-petroleo/20 border-y border-petroleo lg:col-span-6 lg:col-start-7 lg:self-end">
              {[
                "8 modelos de loja oficial para escolher",
                "Você decide a comissão de cada produto",
                "Convide vendedores próprios, cada um com a sua comissão",
                "Nota fiscal de cada venda é da sua loja",
              ].map((t) => (
                <li key={t} className="py-5 text-2xl leading-snug font-medium tracking-[-0.02em]">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- afiliados: título largo, texto e lista em duas colunas ---------- */}
        <section id="para-afiliados" className="scroll-mt-16 bg-branco">
          <div className={`${WRAP} py-20 sm:py-28`}>
            <h2 className="text-6xl leading-[0.9] tracking-[-0.05em] sm:text-8xl lg:text-9xl">Para afiliados</h2>
            <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-4 lg:col-start-5">
                <p className="text-lg text-petroleo/85">
                  Monte uma vitrine com endereço só seu e divulgue produtos de lojas com CNPJ. Sem estoque e sem caixa
                  para embalar.
                </p>
                <Link href="/cadastro" className={`${BOTAO} mt-8`}>
                  Criar conta de afiliado
                </Link>
              </div>
              <ul className="flex flex-col gap-4 text-lg lg:col-span-4">
                {[
                  "Link curto para cada produto, para a bio ou para o story",
                  "A comissão aparece antes de você divulgar",
                  "Código de indicação próprio",
                  "Os resultados dependem dos produtos e de como você divulga",
                ].map((t) => (
                  <li key={t} className="border-l-2 border-ciano pl-4">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- vendedores: um parágrafo só, compacto, sobre petróleo-gelo ---------- */}
        <section id="para-quem-trabalha-em-loja" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} grid gap-8 py-16 sm:py-24 lg:grid-cols-12`}>
            <h2 className="text-4xl leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:col-span-4">Para vendedores da loja</h2>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="text-2xl leading-snug tracking-[-0.01em] sm:text-3xl">
                Trabalha em uma loja? A loja convida você pelo e-mail e combina a sua comissão. Cada venda sai pelo seu
                link. Aceite o convite e a sua conta já fica ligada à loja, acompanhe as suas vendas no seu painel e
                comece sem taxa de adesão.
              </p>
              <Link href="/cadastro" className={`${BOTAO} mt-8`}>
                Criar conta
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- compradores: três afirmações em colunas ---------- */}
        <section id="para-compradores" className="scroll-mt-16 bg-branco">
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
            <ul className="mt-12 grid gap-x-8 gap-y-6 border-t border-petroleo pt-6 md:grid-cols-3">
              {[
                "Toda loja tem CNPJ ativo e emite nota fiscal",
                "Pagamento processado pela Lytex",
                "7 dias para desistir da compra",
              ].map((t) => (
                <li key={t} className="text-xl leading-snug font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- confiança ---------- */}
        <section id="regras" className="scroll-mt-16 bg-petroleo text-gelo">
          <div className={`${WRAP} py-20 sm:py-28`}>
            <h2 className="max-w-4xl text-5xl leading-[0.95] tracking-[-0.045em] text-branco sm:text-7xl">
              A Staypse nunca encosta no dinheiro
            </h2>
            <p className="mt-6 max-w-lg text-lg text-gelo/90">
              Quem processa e divide o pagamento é a Lytex. A gente cuida do link, da vitrine e das regras.
            </p>
            <dl className="mt-14 grid gap-x-12 sm:grid-cols-2">
              {REGRAS.map(([titulo, texto]) => (
                <div key={titulo} className="border-t border-gelo/30 py-6">
                  <dt className="text-xl font-extrabold text-branco">{titulo}</dt>
                  <dd className="mt-2 max-w-sm text-gelo/90">{texto}</dd>
                </div>
              ))}
            </dl>
            <Link href="/produtos-proibidos" className="mt-4 inline-flex min-h-11 items-center underline">
              Ver a lista de produtos proibidos
            </Link>
          </div>
        </section>

        {/* ---------- taxas ---------- */}
        <section id="taxas" className="scroll-mt-16 bg-gelo">
          <div className={`${WRAP} grid gap-10 py-20 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
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
            <div className="min-w-0 border-t-2 border-petroleo bg-branco p-5 sm:p-7">
              <Suspense fallback={<p className="text-sm text-petroleo/75">Carregando as taxas.</p>}>
                <TaxasDaInicial />
              </Suspense>
              <Link href="/taxas" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline">
                Ver todos os detalhes de taxas
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- como funciona: sequência real, em degraus ---------- */}
        <section id="como-funciona" className="scroll-mt-16 overflow-hidden bg-branco">
          <div className={`${WRAP} py-20 sm:py-28`}>
            <h2 className={`${H2} max-w-3xl`}>Como funciona, em 3 passos</h2>
            <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
              {PASSOS.map(([titulo, texto], i) => (
                <li key={titulo} className={`border-t-2 border-petroleo pt-4 ${["", "md:mt-12", "md:mt-24"][i]}`}>
                  <span className="block text-7xl leading-none font-extrabold tracking-[-0.05em] sm:text-8xl" aria-hidden="true">
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
            <h2 className="text-5xl leading-[0.95] tracking-[-0.04em] sm:text-6xl">Perguntas frequentes</h2>
            <Perguntas />
          </div>
        </section>

        {/* ---------- fecho ---------- */}
        <section id="fim" className="bg-ciano text-petroleo">
          <div className={`${WRAP} flex flex-col items-start gap-8 py-16 sm:py-24`}>
            <h2 className="max-w-3xl text-6xl leading-[0.9] tracking-[-0.05em] sm:text-8xl">Crie a sua conta hoje</h2>
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
        </section>
      </main>
      <BarraFixa />
    </>
  );
}
