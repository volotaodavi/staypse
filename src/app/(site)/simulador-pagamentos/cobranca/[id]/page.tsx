// "Página de pagamento da Lytex" SIMULADA (só com PAYMENTS_PROVIDER=mock e fora de produção).
// O comprador cai aqui depois de confirmar o pedido. Os botões imitam o que o provedor real
// fará (pagar com Pix ou cartão aprovado, recusar, chargeback, confirmar estorno) e mandam o
// webhook ASSINADO. Nenhum dado de cartão é pedido: no provedor real, o checkout é dele.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { simuladorAtivo } from "@/lib/pagamentos";
import { VOLTA_VALIDA } from "@/lib/pagamentos/simulador";
import { ROTULO_STATUS_COBRANCA } from "@/lib/pagamentos/status";
import type { StatusCobranca } from "@/lib/pagamentos/tipos";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { acaoSimulada } from "./acoes";

export const instant = false;
export const metadata: Metadata = { title: "Simulador de pagamentos", robots: { index: false } };

const ROTULO_PAPEL = ["Loja (produtor)", "Indicação (afiliado ou vendedor)", "Staypse (taxa da plataforma)"];

export default async function SimuladorCobranca({ params, searchParams }: PageProps<"/simulador-pagamentos/cobranca/[id]">) {
  if (!simuladorAtivo()) notFound();
  const { id } = await params;
  const { volta, msg } = await searchParams;
  const { data: c } = await criarClienteAdmin()
    .from("simulador_cobrancas")
    .select("total_centavos, split, status, meio, estorno_solicitado_em")
    .eq("provedor_id", id)
    .maybeSingle();
  if (!c) notFound();
  const retorno = typeof volta === "string" && VOLTA_VALIDA.test(volta) ? volta : null;
  const status: StatusCobranca = c.status === "paga" && c.estorno_solicitado_em ? "estorno_pendente" : (c.status as StatusCobranca);
  const partes = (c.split as { recebedorProvedorId: string; valorCentavos: number }[]) ?? [];

  const botao = (acao: string, rotulo: string, destaque = false) => (
    <button
      name="acao"
      value={acao}
      className={`min-h-11 rounded-full px-5 font-medium ${destaque ? "bg-petroleo text-branco" : "border border-petroleo"}`}
    >
      {rotulo}
    </button>
  );

  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <section className="flex w-full max-w-md flex-col gap-4 rounded-2xl border-2 border-dashed border-petroleo/40 bg-branco p-6">
          <p className="text-sm font-medium text-petroleo/75">Ambiente de teste, simula a página de pagamento da Lytex</p>
          <h1 className="text-2xl">Pagamento do pedido</h1>
          <p className="text-3xl font-medium">{formatarPreco(c.total_centavos)}</p>
          <p className="text-sm">
            Situação da cobrança:{" "}
            <strong className="font-medium" data-status-cobranca={status}>
              {ROTULO_STATUS_COBRANCA[status]}
            </strong>
          </p>
          <details className="rounded-xl bg-gelo px-3 py-2 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">Como a Lytex dividiria este valor</summary>
            <ul className="flex flex-col gap-1 pb-2">
              {partes.map((p, i) => (
                <li key={`${p.recebedorProvedorId}-${i}`} className="flex justify-between gap-3">
                  <span>{ROTULO_PAPEL[Math.min(i, 2)]}</span>
                  <span>{formatarPreco(p.valorCentavos)}</span>
                </li>
              ))}
            </ul>
          </details>
          {typeof msg === "string" && (
            <p role="status" className="rounded-xl bg-gelo px-3 py-2 text-sm">
              {msg}
            </p>
          )}
          <form action={acaoSimulada} className="flex flex-col gap-3">
            <input type="hidden" name="provedor_id" value={id} />
            {retorno && <input type="hidden" name="volta" value={retorno} />}
            <div className="flex flex-wrap gap-2">
              {status === "pendente" && (
                <>
                  {botao("pagar_pix", "Pagar Pix", true)}
                  {botao("pagar_cartao", "Pagar cartão (aprovado)", true)}
                  {botao("recusar", "Recusar")}
                  {botao("pagar_sem_webhook", "Pagar sem enviar o webhook")}
                </>
              )}
              {status === "expirada" && botao("pagar_tardio", "Pagar Pix depois do cancelamento")}
              {status === "paga" && botao("chargeback", "Chargeback")}
              {status === "estorno_pendente" && (
                <>
                  {botao("estorno", "Confirmar estorno (webhook)", true)}
                  {botao("chargeback", "Chargeback")}
                </>
              )}
              {status !== "pendente" && botao("reenviar", "Reenviar último webhook")}
            </div>
          </form>
          {retorno && (
            <a href={retorno} className="inline-flex min-h-11 items-center text-sm font-medium underline">
              Voltar para o meu pedido
            </a>
          )}
        </section>
      </main>
    </>
  );
}
