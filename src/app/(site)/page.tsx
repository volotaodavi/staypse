// Página inicial. Direção: etiqueta de preço e recibo, a língua do comércio
// brasileiro. Dois botões em toda a página: Criar conta (principal, /cadastro)
// e Entrar (secundário, /entrar).
// Regras de texto: sem promessa de ganho, sorteio ou ganho por recrutamento;
// a Staypse nunca "recebe" nem guarda o dinheiro, o split acontece na Lytex.
import Link from "next/link";
import { BarraFixa } from "@/components/BarraFixa";
import { Cabecalho } from "@/components/Cabecalho";
import { EtiquetaERecibo, Perguntas } from "@/components/inicio";
import { urlDoSite } from "@/lib/supabase/env";

const PASSOS = [
  ["A Lia cadastra o Tênis Runner", "Foto, preço, estoque e a comissão: quem decide quanto o afiliado leva em cada produto é a loja. Serve para produto físico e para digital, de loja de bairro ou de fábrica."],
  ["A Ana posta o link no Instagram", "Ela monta a vitrine dela e cola /@ana/tenis-runner na bio. Não precisa de estoque nem de caixa para embalar. Quem clica cai na loja oficial da Lia."],
  ["O cliente paga e a Lytex divide", "Pix ou cartão, o pagamento passa pela Lytex e já sai repartido entre a loja, a Ana e a Staypse. A nota fiscal é da loja."],
] as const;

// Cada perfil é uma seção com âncora própria (os links do menu e da bio usam)
const PUBLICOS = [
  {
    id: "para-lojas",
    titulo: "Tenho loja ou fábrica",
    texto:
      "Cadastre os produtos, defina a comissão de cada um e ganhe uma loja oficial pronta, com 4 modelos para escolher. Pode convidar vendedores próprios, cada um com a sua comissão. O split é na Lytex e a nota fiscal de cada venda é da sua loja.",
    cta: "Criar conta da loja",
  },
  {
    id: "para-afiliados",
    titulo: "Quero divulgar produtos",
    texto:
      "Monte uma vitrine com endereço só seu e um código de indicação. Cada produto ganha um link curto, como /@ana/tenis-runner, que leva à página do produto ou direto ao pagamento. A comissão aparece antes de você divulgar.",
    cta: "Criar conta de afiliado",
  },
  {
    id: "para-quem-trabalha-em-loja",
    titulo: "Trabalho em uma loja",
    texto:
      "A loja convida você como vendedor pelo e-mail e combina a sua comissão. Cada venda sai pelo seu link e você acompanha no seu painel.",
    cta: "",
  },
  {
    id: "para-compradores",
    titulo: "Só quero comprar",
    texto:
      "Compre na loja oficial do produto. Toda loja tem CNPJ ativo e emite nota fiscal, o pagamento é processado pela Lytex e você tem 7 dias para desistir.",
    cta: "",
  },
] as const;

const REGRAS = [
  ["Split na Lytex", "Cada parte recebe a sua direto. Nada passa pela mão da Staypse."],
  ["Lojas com CNPJ", "Só entra loja com CNPJ ativo e nota fiscal em toda venda. Todo produto passa por análise antes de aparecer."],
  ["7 dias para desistir", "O comprador pede de volta tudo o que pagou, e a devolução segue a proporção do split."],
  ["Sem pirâmide", "A comissão vem só das vendas do próprio afiliado. Não existe taxa de adesão nem comissão por recrutar."],
] as const;

const PRIMARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-ciano px-8 py-4 text-lg font-medium text-petroleo hover:brightness-95";
const SECUNDARIO =
  "inline-flex min-h-14 items-center justify-center rounded-full border border-gelo/60 px-8 py-4 text-lg font-medium text-gelo hover:bg-gelo/10";

export default function Inicio() {
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col">
        {/* ---------- topo ---------- */}
        <section id="topo" className="overflow-hidden bg-petroleo text-gelo [background-image:radial-gradient(rgba(238,246,245,0.09)_1px,transparent_1.5px)] [background-size:14px_14px]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-20 sm:pt-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12 lg:pb-28">
            <div className="flex flex-col gap-7">
              <h1 className="text-[3.4rem] leading-[0.94] tracking-[-0.045em] text-branco sm:text-7xl lg:text-[6.5rem]">
                A nova era tá chegando
              </h1>
              <p className="max-w-lg text-lg text-gelo/90 sm:text-xl">
                A Lia vende tênis em Recife. A Ana posta o link no Instagram. Quando alguém compra, o pagamento já
                sai dividido: cada uma recebe a sua parte, e a Staypse não encosta no dinheiro.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/cadastro" className={PRIMARIO}>
                  Criar conta
                </Link>
                <Link href="/entrar" className={SECUNDARIO}>
                  Entrar
                </Link>
              </div>
              <p className="max-w-md text-sm text-gelo/80">
                Pagamentos processados pela Lytex. Criar conta é grátis.
              </p>
            </div>
            <EtiquetaERecibo host={urlDoSite().replace(/^https?:\/\//, "")} />
          </div>
        </section>

        {/* ---------- o caminho de uma venda ---------- */}
        <section id="como-funciona" className="scroll-mt-16 bg-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <h2 className="text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl">
              Como funciona: o caminho de um par de tênis
            </h2>
            <ol className="flex flex-col gap-10">
              {PASSOS.map(([titulo, texto], i) => (
                <li key={titulo} className="grid grid-cols-[3rem_1fr] gap-x-4 sm:grid-cols-[4.5rem_1fr]">
                  <span className="text-5xl leading-none font-extrabold tabular-nums text-petroleo/25 sm:text-6xl" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-2xl leading-tight">{titulo}</h3>
                    <p className="mt-2 max-w-lg text-petroleo/85">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- quatro jeitos de entrar ---------- */}
        <div id="para-quem" className="scroll-mt-16 bg-branco">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <h2 className="max-w-2xl text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl">
              Cada um entra por um lado do balcão
            </h2>
            <div className="mt-10 border-t-2 border-petroleo">
              {PUBLICOS.map((p) => (
                <section
                  key={p.id}
                  id={p.id}
                  className="scroll-mt-20 grid gap-3 border-b border-petroleo/20 py-7 md:grid-cols-[0.9fr_1.1fr] md:gap-x-12"
                >
                  <h3 className="text-3xl leading-tight tracking-[-0.03em]">{p.titulo}</h3>
                  <div>
                    <p className="max-w-xl text-petroleo/85">{p.texto}</p>
                    {p.cta && (
                      <Link href="/cadastro" className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                        {p.cta}
                      </Link>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- regras ---------- */}
        <section id="regras" className="scroll-mt-16 bg-petroleo text-gelo">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <h2 className="text-4xl leading-[1.02] tracking-[-0.03em] text-branco sm:text-6xl">
                A Staypse nunca encosta no dinheiro
              </h2>
              <p className="mt-5 max-w-md text-lg text-gelo/90">
                Quem processa e divide o pagamento é a Lytex. A gente cuida do link, da vitrine e das regras.
              </p>
              <p className="mt-6 text-sm text-gelo/80">
                Veja também a{" "}
                <Link href="/produtos-proibidos" className="inline-flex min-h-11 items-center underline">
                  lista de produtos proibidos
                </Link>
                .
              </p>
            </div>
            <dl className="flex flex-col">
              {REGRAS.map(([titulo, texto]) => (
                <div key={titulo} className="border-t border-dashed border-gelo/40 py-5 first:border-t-0 first:pt-0">
                  <dt className="text-xl font-medium text-branco">{titulo}</dt>
                  <dd className="mt-1 text-gelo/90">{texto}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- perguntas frequentes ---------- */}
        <section id="faq" className="scroll-mt-16 bg-branco">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-24 lg:grid-cols-[0.6fr_1.4fr]">
            <h2 className="text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl">Perguntas frequentes</h2>
            <Perguntas />
          </div>
        </section>

        {/* ---------- fecho ---------- */}
        <section id="fim" className="bg-ciano text-petroleo">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="max-w-xl text-4xl leading-[1.02] tracking-[-0.03em] sm:text-6xl">Crie a sua conta hoje</h2>
              <p className="mt-3 max-w-md">Grátis, sem taxa de adesão. Pagamentos processados pela Lytex.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/cadastro"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-petroleo px-8 py-4 text-lg font-medium text-branco hover:bg-petroleo/90"
              >
                Criar conta
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
