// Atendimento (SAC) da Staypse: dúvidas, problemas com pedido, desistência,
// pedidos sobre dados pessoais (LGPD) e denúncias. Resposta em até 5 dias.
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { EMPRESA, contatoEmLinha } from "@/config/empresa";
import { ASSUNTOS_ATENDIMENTO } from "@/lib/pedidos";
import { usuarioAtual } from "@/lib/papeis";
import { FormAtendimento } from "./FormAtendimento";

export const metadata: Metadata = {
  title: "Atendimento",
  description: "Fale com a Staypse: pedidos, desistência da compra, dados pessoais (LGPD) e denúncias. Resposta em até 5 dias.",
};
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Atendimento({ searchParams }: PageProps<"/atendimento">) {
  const sp = await searchParams;
  const usuario = await usuarioAtual();
  const pedido = (um(sp.pedido) ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const assuntoPedido = um(sp.assunto) ?? "";
  const assunto = Object.hasOwn(ASSUNTOS_ATENDIMENTO, assuntoPedido) ? assuntoPedido : pedido ? "pedido" : "";

  return (
    <>
      <Cabecalho logado={Boolean(usuario)} />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-[1fr_18rem]">
          <section className="flex flex-col gap-4 rounded-3xl bg-branco p-6 sm:p-8">
            <h1 className="text-3xl">Atendimento</h1>
            <p className="text-petroleo/80">
              Respondemos em até 5 dias. Você recebe um número de protocolo para acompanhar.
            </p>
            <p className="text-sm text-petroleo/75">
              Usamos o que você escrever só para responder ao seu pedido (veja a{" "}
              <Link href="/privacidade" className="underline">
                Política de Privacidade
              </Link>
              ). Não coloque senha nem dados de cartão.
            </p>
            <FormAtendimento inicial={{ nome: usuario?.nome ?? "", email: usuario?.email ?? "", pedido, assunto }} />
          </section>
          <aside className="flex flex-col gap-4 text-sm">
            <div className="rounded-3xl bg-branco p-5">
              <h2 className="text-lg">Quer desistir de uma compra?</h2>
              <p className="mt-1 text-petroleo/80">
                Use o botão &quot;Desistir da compra&quot; na página do pedido: é mais rápido. Você tem 7 dias a partir do
                recebimento.
              </p>
              <Link href="/pedido" className="mt-2 inline-block py-1 font-medium underline">
                Encontrar meu pedido
              </Link>
              <br />
              <Link href="/reembolso" className="inline-block py-1 font-medium underline">
                Ler a política de reembolso
              </Link>
            </div>
            <div className="rounded-3xl bg-branco p-5">
              <h2 className="text-lg">Seus dados pessoais</h2>
              <p className="mt-1 text-petroleo/80">
                Com conta, você baixa seus dados em &quot;Meus dados&quot;. Para corrigir ou excluir, escolha o assunto
                &quot;Meus dados pessoais&quot;.
              </p>
              <Link href="/painel/meus-dados" className="mt-2 inline-block py-1 font-medium underline">
                Meus dados
              </Link>
            </div>
            <div className="rounded-3xl bg-branco p-5">
              <h2 className="text-lg">Outros canais</h2>
              <p className="mt-1 text-petroleo/80">
                {EMPRESA.nomeEmpresarial}
                <br />
                {contatoEmLinha() || "Use o formulário ao lado: você recebe um protocolo."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
