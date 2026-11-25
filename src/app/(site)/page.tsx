// Página inicial no padrão das grandes plataformas: cabeçalho fixo, hero com mockup,
// faixa de diferenciais, seções alternadas por perfil, taxas, passos, perguntas e fecho.
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro, o split acontece na Lytex.
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import {
  MockupProduto,
  Perguntas,
  VisualAfiliado,
  VisualComprador,
  VisualLoja,
  VisualVendedor,
} from "@/components/inicio";
import { TaxasDaInicial } from "@/components/inicio-taxas";
import { urlDoSite } from "@/lib/supabase/env";

const PRIMARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-ciano px-8 py-4 text-lg font-medium text-petroleo hover:brightness-95";
const SECUNDARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full border border-gelo/60 px-8 py-4 text-lg font-medium text-gelo hover:bg-gelo/10";

const DIFERENCIAIS = [
  ["Sem mensalidade", "Criar conta é grátis. A taxa é por venda e já vem descontada na divisão."],
  ["Split automático na Lytex", "O pagamento sai dividido na hora, direto para cada parte."],
  ["Loja oficial pronta", "Escolha um dos 8 modelos e publique seus produtos."],
  ["Link e código de indicação", "Cada afiliado tem vitrine, links curtos e código próprio."],
] as const;

const PASSOS = [
  ["A loja cadastra os produtos", "Foto, preço, estoque e a comissão de cada produto. Quem decide quanto o afiliado leva é a loja."],
  ["Afiliados e vendedores divulgam", "Cada um usa o seu link ou a sua vitrine. Quem clica cai na loja oficial."],
  ["O cliente paga e a Lytex divide", "Pix ou cartão: o valor já sai repartido entre loja, afiliado e Staypse. A nota fiscal é da loja."],
] as const;

const REGRAS = [
  ["Split na Lytex", "Cada parte recebe a sua direto. Nada passa pela mão da Staypse."],
  ["Lojas com CNPJ", "Só entra loja com CNPJ ativo e nota fiscal em toda venda. Todo produto passa por análise."],
  ["7 dias para desistir", "O comprador pede de volta tudo o que pagou, e a devolução segue a proporção do split."],
  ["Sem pirâmide", "A comissão vem só das vendas do próprio afiliado. Sem taxa de adesão nem comissão por recrutar."],
] as const;

const ICONES = [
  "M4 7h16M4 12h10M4 17h6",
  "M12 3v18M6 9l6-6 6 6M6 15l6 6 6-6",
  "M4 10l2-6h12l2 6M5 10v10h14V10M10 20v-6h4v6",
  "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0010 18.7l1-1",
];

function Bloco({
  id,
  titulo,
  texto,
  itens,
  cta,
  href = "/cadastro",
  visual,
  invertido = false,
  fundo,
}: {
  id: string;
  titulo: string;
  texto: string;
  itens: string[];
  cta: string;
  href?: string;
  visual: ReactNode;
  invertido?: boolean;
  fundo: string;
}) {
  return (
    <section id={id} className={`scroll-mt-16 ${fundo}`}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:gap-20">
        <div className={invertido ? "lg:order-2" : ""}>
          <h2 className="text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl">{titulo}</h2>
          <p className="mt-4 max-w-lg text-lg text-petroleo/85">{texto}</p>
          <ul className="mt-6 flex max-w-lg flex-col gap-3">
            {itens.map((t) => (
              <li key={t} className="flex gap-3">
                <svg className="mt-1 shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="#062C30" />
                  <path d="M5.5 10.2l3 3 6-6" stroke="#14D6C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href={href}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-petroleo px-7 py-3 font-medium text-branco hover:bg-petroleo/90"
          >
            {cta}
          </Link>
        </div>
        <div className={invertido ? "lg:order-1" : ""}>{visual}</div>
      </div>
    </section>
  );
}

export default function Inicio() {
  const host = urlDoSite().replace(/^https?:\/\//, "");
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
        {/* ---------- hero ---------- */}
        <section id="topo" className="overflow-hidden bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:pt-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10 lg:pb-24">
            <div className="flex flex-col gap-6">
              <h1 className="text-[3.25rem] leading-[0.96] tracking-[-0.045em] text-branco sm:text-7xl">
                A nova era tá chegando
              </h1>
              <p className="max-w-lg text-lg text-gelo/90 sm:text-xl">
                A Staypse junta lojas, afiliados e vendedores da loja. Cada venda tem um link, e o pagamento já sai
                dividido na hora, pela Lytex.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/cadastro" className={PRIMARIO}>
                  Criar conta grátis
                </Link>
                <Link href="/taxas" className={SECUNDARIO}>
                  Ver taxas
                </Link>
              </div>
              <p className="max-w-md text-sm text-gelo/80">Pagamentos processados pela Lytex. Sem mensalidade.</p>
            </div>
            <MockupProduto host={host} />
          </div>
        </section>

        {/* ---------- diferenciais ---------- */}
        <section aria-label="Diferenciais" className="bg-gelo">
          <ul className="mx-auto grid max-w-6xl gap-x-8 gap-y-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {DIFERENCIAIS.map(([titulo, texto], i) => (
              <li key={titulo} className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-petroleo">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14D6C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICONES[i]} />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg leading-tight tracking-normal">{titulo}</h2>
                  <p className="mt-1 text-sm text-petroleo/80">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- por perfil ---------- */}
        <Bloco
          id="para-lojas"
          fundo="bg-branco"
          titulo="Para lojas e fábricas"
          texto="Cadastre os produtos, defina a comissão de cada um e ganhe uma loja oficial pronta. Físico ou digital, de loja de bairro ou de fábrica."
          itens={[
            "8 modelos de loja oficial para escolher",
            "Você decide a comissão de cada produto",
            "Convide vendedores próprios, cada um com a sua comissão",
            "Nota fiscal de cada venda é da sua loja",
          ]}
          cta="Criar conta da loja"
          visual={<VisualLoja />}
        />
        <Bloco
          id="para-afiliados"
          fundo="bg-gelo"
          invertido
          titulo="Para afiliados"
          texto="Monte uma vitrine com endereço só seu e divulgue produtos de lojas com CNPJ. Sem estoque e sem caixa para embalar."
          itens={[
            "Link curto para cada produto, para a bio ou para o story",
            "A comissão aparece antes de você divulgar",
            "Código de indicação próprio",
            "Os resultados dependem dos produtos e de como você divulga",
          ]}
          cta="Criar conta de afiliado"
          visual={<VisualAfiliado host={host} />}
        />
        <Bloco
          id="para-quem-trabalha-em-loja"
          fundo="bg-branco"
          titulo="Para vendedores da loja"
          texto="Trabalha em uma loja? A loja convida você pelo e-mail e combina a sua comissão. Cada venda sai pelo seu link."
          itens={[
            "Aceite o convite e a sua conta já fica ligada à loja",
            "Acompanhe as suas vendas no seu painel",
            "Sem taxa de adesão",
          ]}
          cta="Criar conta"
          visual={<VisualVendedor />}
        />
        <Bloco
          id="para-compradores"
          fundo="bg-gelo"
          invertido
          titulo="Para quem compra"
          texto="Compre direto na loja oficial do produto, com Pix ou cartão e sem surpresa."
          itens={[
            "Toda loja tem CNPJ ativo e emite nota fiscal",
            "Pagamento processado pela Lytex",
            "7 dias para desistir da compra",
          ]}
          cta="Consultar um pedido"
          href="/pedido"
          visual={<VisualComprador />}
        />

        {/* ---------- confiança ---------- */}
        <section id="regras" className="scroll-mt-16 bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-4xl leading-[1.05] tracking-[-0.03em] text-branco sm:text-5xl">
                A Staypse nunca encosta no dinheiro
              </h2>
              <p className="mt-5 max-w-md text-lg text-gelo/90">
                Quem processa e divide o pagamento é a Lytex. A gente cuida do link, da vitrine e das regras.
              </p>
              <Link href="/produtos-proibidos" className="mt-4 inline-flex min-h-11 items-center underline">
                Ver a lista de produtos proibidos
              </Link>
            </div>
            <dl className="flex flex-col">
              {REGRAS.map(([titulo, texto]) => (
                <div key={titulo} className="border-t border-gelo/25 py-5 first:border-t-0 first:pt-0">
                  <dt className="text-xl font-medium text-branco">{titulo}</dt>
                  <dd className="mt-1 text-gelo/90">{texto}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- taxas ---------- */}
        <section id="taxas" className="scroll-mt-16 bg-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="min-w-0">
              <h2 className="text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl">Taxas claras, por venda</h2>
              <p className="mt-4 max-w-md text-lg text-petroleo/85">
                Sem mensalidade e sem taxa de adesão. A taxa vale por meio de pagamento, é paga por quem vende e já
                sai descontada na divisão. O comprador não paga taxa.
              </p>
              <Link
                href="/taxas#simulador"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-petroleo px-7 py-3 font-medium text-branco hover:bg-petroleo/90"
              >
                Simular uma venda
              </Link>
            </div>
            <div className="min-w-0 rounded-3xl bg-branco p-5 ring-1 ring-petroleo/10 sm:p-7">
              <Suspense fallback={<p className="text-sm text-petroleo/75">Carregando as taxas.</p>}>
                <TaxasDaInicial />
              </Suspense>
              <Link href="/taxas" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline">
                Ver todos os detalhes de taxas
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- como funciona ---------- */}
        <section id="como-funciona" className="scroll-mt-16 bg-branco">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <h2 className="max-w-2xl text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl">Como funciona, em 3 passos</h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {PASSOS.map(([titulo, texto], i) => (
                <li key={titulo} className="rounded-3xl bg-gelo p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-petroleo text-lg font-bold text-ciano" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-2xl leading-tight">{titulo}</h3>
                  <p className="mt-2 text-petroleo/85">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- perguntas ---------- */}
        <section id="faq" className="scroll-mt-16 bg-gelo">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-24 lg:grid-cols-[0.6fr_1.4fr]">
            <h2 className="text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl">Perguntas frequentes</h2>
            <Perguntas />
          </div>
        </section>

        {/* ---------- fecho ---------- */}
        <section id="fim" className="bg-ciano text-petroleo">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="max-w-xl text-4xl leading-[1.02] tracking-[-0.03em] sm:text-6xl">Crie a sua conta hoje</h2>
              <p className="mt-3 max-w-md">Grátis, sem mensalidade. Pagamentos processados pela Lytex.</p>
            </div>
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
