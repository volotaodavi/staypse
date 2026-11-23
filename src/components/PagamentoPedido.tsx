// Pagamento do pedido com a cara da loja (cores e fonte via variáveis --loja-*).
// Pix e boleto: mostra o que a fatura da Lytex devolveu (copia e cola, linha digitável, link do boleto).
// Cartão: leva à página de pagamento da Lytex (a Staypse nunca vê dados de cartão).
// O comprador não vê taxa nenhuma aqui.
import QRCode from "qrcode";
import type { CSSProperties } from "react";
import { CopiarLink } from "@/components/rastreio";
import { classesFontesLoja } from "@/lib/fontes-loja";
import { valorParcelaCentavos, type Meio } from "@/lib/pagamentos/parcelas";
import type { DadosPagamento } from "@/lib/pagamentos/tipos";
import { formatarPreco } from "@/lib/produtor";
import { montarTema } from "@/lib/tema";

export type TemaPedido = { loja_cor_principal: string | null; loja_cor_destaque: string | null; loja_fonte: string | null; loja_layout: string | null; loja_nome: string | null };

const botaoLoja =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--loja-principal)] px-6 py-3 text-base font-semibold text-[var(--loja-principal-texto)] hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";
const botaoContorno =
  "inline-flex min-h-12 items-center justify-center rounded-md border border-neutral-500 bg-white px-6 py-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

function dataBr(iso?: string | null) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

export async function PagamentoPedido({
  tema,
  meio,
  parcelas,
  pagamento,
  urlPagamento,
  totalCentavos,
  simulado,
  semCobranca,
}: {
  tema: TemaPedido;
  meio: Meio | null;
  parcelas: number | null;
  pagamento: DadosPagamento | null;
  urlPagamento: string | null;
  totalCentavos: number;
  simulado: boolean;
  // quando ainda não há cobrança: formulário "Pagar agora" (vem da página)
  semCobranca?: React.ReactNode;
}) {
  const t = montarTema({ principal: tema.loja_cor_principal, destaque: tema.loja_cor_destaque, fonte: tema.loja_fonte, layout: tema.loja_layout });
  const qr = meio === "pix" && pagamento?.pixCopiaECola ? await QRCode.toString(pagamento.pixCopiaECola, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : null;
  const vence = dataBr(pagamento?.venceEm);

  return (
    <section
      aria-labelledby="titulo-pagamento"
      className={`${classesFontesLoja} flex flex-col gap-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900`}
      style={{ ...t.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
      data-pagamento-loja
    >
      <div className="h-1.5 w-full bg-[var(--loja-principal)]" aria-hidden="true" />
      <div className="flex flex-col gap-5 px-5 pt-1 pb-6 sm:px-6">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-neutral-700">{tema.loja_nome ?? "Loja"}</p>
          <h2 id="titulo-pagamento" className="text-2xl font-semibold">
            {meio === "pix" ? "Pague com Pix" : meio === "boleto" ? "Pague com boleto" : meio === "cartao" ? "Pague com cartão" : "Pagamento"}
          </h2>
          <p className="text-3xl font-semibold tabular-nums">{formatarPreco(totalCentavos)}</p>
          {meio === "cartao" && parcelas && parcelas > 1 && (
            <p className="text-sm text-neutral-700">
              Em {parcelas}x de <span className="tabular-nums">{formatarPreco(valorParcelaCentavos(totalCentavos, parcelas))}</span>, sem juros
            </p>
          )}
        </header>

        {meio === "pix" && pagamento?.pixCopiaECola && (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
            {qr && (
              <div
                role="img"
                aria-label="QR Code do Pix"
                className="mx-auto h-48 w-48 shrink-0 rounded-lg border border-neutral-300 bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            )}
            <div className="flex min-w-0 flex-col gap-3">
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-6">
                <li>Abra o app do seu banco e escolha Pix.</li>
                <li>Leia o QR Code ou use o Pix copia e cola.</li>
                <li>Confirme. O pedido muda para &quot;Pago&quot; assim que o pagamento for confirmado.</li>
              </ol>
              <code className="block rounded-md border border-neutral-300 bg-neutral-50 p-3 text-xs leading-5 break-all select-all" data-pix-codigo>
                {pagamento.pixCopiaECola}
              </code>
              <CopiarLink url={pagamento.pixCopiaECola} rotulo="Copiar código Pix" className={`${botaoLoja} w-full sm:w-fit`} />
              {vence && <p className="text-sm text-neutral-700">Vale até {vence}.</p>}
            </div>
          </div>
        )}

        {meio === "boleto" && (pagamento?.boletoLinhaDigitavel || pagamento?.boletoUrl) && (
          <div className="flex flex-col gap-3">
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-6">
              <li>Copie a linha digitável ou abra o boleto.</li>
              <li>Pague no app do seu banco ou em uma casa lotérica.</li>
              <li>A compensação pode levar até 2 dias úteis. Depois dela, o pedido muda para &quot;Pago&quot;.</li>
            </ol>
            {pagamento.boletoLinhaDigitavel && (
              <code className="block rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm leading-5 break-all select-all tabular-nums" data-boleto-linha>
                {pagamento.boletoLinhaDigitavel}
              </code>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              {pagamento.boletoLinhaDigitavel && <CopiarLink url={pagamento.boletoLinhaDigitavel} rotulo="Copiar linha digitável" className={`${botaoLoja} w-full sm:w-fit`} />}
              {pagamento.boletoUrl && (
                <a href={pagamento.boletoUrl} target="_blank" rel="noopener noreferrer" className={`${botaoContorno} w-full sm:w-fit`}>
                  Abrir boleto
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              )}
            </div>
            {vence && <p className="text-sm text-neutral-700">Vencimento em {vence}.</p>}
          </div>
        )}

        {meio === "cartao" && urlPagamento && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6">Você digita os dados do cartão na página segura da Lytex, não aqui.</p>
            <a href={urlPagamento} className={`${botaoLoja} w-full sm:w-fit`} data-pagar>
              Ir para o pagamento com cartão
            </a>
          </div>
        )}

        {/* Pix ou boleto sem dados devolvidos, ou pedido sem meio escolhido: abre a página da Lytex */}
        {meio !== "cartao" && urlPagamento && (!pagamento || !meio) && (
          <a href={urlPagamento} className={`${botaoLoja} w-full sm:w-fit`} data-pagar>
            Pagar agora
          </a>
        )}
        {!urlPagamento && !pagamento && semCobranca}

        {simulado && urlPagamento && meio && meio !== "cartao" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ambiente de teste:{" "}
            <a href={urlPagamento} className="font-semibold underline" data-simular-pagamento>
              simular o pagamento
            </a>
            .
          </p>
        )}

        <p className="border-t border-neutral-200 pt-3 text-xs leading-5 text-neutral-700">
          Pagamento processado pela Lytex. A Staypse não guarda seu dinheiro nem seus dados de cartão. Pedidos não pagos em 3 dias são cancelados
          sozinhos, sem custo.
        </p>
      </div>
    </section>
  );
}
