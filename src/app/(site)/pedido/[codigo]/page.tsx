// Pedido visto pelo comprador (sem conta): /pedido/[código]?t=[token secreto]
// Mostra pagamento, nota fiscal, rastreio, acesso digital e os botões de
// confirmar recebimento e de desistir (CDC art. 49).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { PagamentoPedido } from "@/components/PagamentoPedido";
import { CopiarLink } from "@/components/rastreio";
import type { Meio } from "@/lib/pagamentos/parcelas";
import type { DadosPagamento } from "@/lib/pagamentos/tipos";
import {
  ROTULO_ENTREGA,
  STATUS_ENTREGA,
  STATUS_PEDIDO,
  data,
  dataHora,
  enderecoEmLinha,
  type PedidoComprador,
} from "@/lib/pedidos";
import { formatarCnpj, formatarPreco } from "@/lib/produtor";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/supabase/env";
import { confirmarRecebimento, desistir, iniciarPagamento } from "./acoes";

export const instant = false;
export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const botaoPrincipal = "inline-flex min-h-12 items-center justify-center rounded-full bg-petroleo px-6 py-3 font-medium text-branco hover:bg-petroleo/90";

export default async function PaginaPedido({ params, searchParams }: PageProps<"/pedido/[codigo]">) {
  const { codigo } = await params;
  const sp = await searchParams;
  const token = um(sp.t) ?? "";
  if (!/^[A-Za-z0-9]{10}$/.test(codigo) || !/^[0-9a-f]{64}$/.test(token)) redirect("/pedido");

  const admin = criarClienteAdmin();
  const { data: bruto } = await admin.rpc("pedido_do_comprador", { p_codigo: codigo, p_token: token });
  if (!bruto) redirect("/pedido?invalido=1");
  const p = bruto as PedidoComprador;

  // arquivo digital (bucket privado): link temporário de 10 minutos
  const arquivos = new Map<string, string>();
  for (const i of p.itens) {
    if (i.acesso?.arquivo_path) {
      const { data: assinado } = await admin.storage.from("arquivos-digitais").createSignedUrl(i.acesso.arquivo_path, 600, { download: true });
      if (assinado?.signedUrl) arquivos.set(i.id, assinado.signedUrl);
    }
  }

  const link = `${urlDoSite()}/pedido/${p.codigo}?t=${token}`;
  const novo = um(sp.novo) === "1";
  const msg = um(sp.msg);
  const erro = um(sp.erro);
  const enviado = p.itens.some((i) => i.status_entrega === "enviado" || i.status_entrega === "entregue");
  const etapas = [
    { nome: "Pedido feito", feito: true, quando: p.criado_em },
    { nome: "Pagamento confirmado", feito: Boolean(p.pago_em), quando: p.pago_em },
    p.entrega_modo === "digital"
      ? { nome: "Acesso liberado", feito: Boolean(p.entregue_em), quando: p.entregue_em }
      : { nome: p.entrega_modo === "retirada" ? "Pronto / retirado" : "Enviado", feito: enviado || Boolean(p.entregue_em), quando: null },
    ...(p.entrega_modo === "digital" ? [] : [{ nome: "Recebido", feito: Boolean(p.entregue_em), quando: p.entregue_em }]),
  ];
  const encerrado = ["cancelado", "em_reembolso", "reembolsado", "chargeback"].includes(p.status);
  // dados do pagamento e tema da loja (guardados só no servidor; nunca vêm do navegador)
  const { data: cobranca } =
    p.status === "aguardando_pagamento"
      ? await admin
          .from("orders")
          .select("cobranca_url, cobranca_meio, cobranca_parcelas, cobranca_pagamento, producers(loja_nome, cor_principal, cor_destaque, fonte, layout)")
          .eq("id", p.id)
          .maybeSingle()
      : { data: null };
  const campos = (
    <>
      <input type="hidden" name="codigo" value={p.codigo} />
      <input type="hidden" name="token" value={token} />
    </>
  );

  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 justify-center bg-gelo px-4 py-10">
        <div className="flex w-full max-w-2xl flex-col gap-5">
          {novo && (
            <section className="flex flex-col gap-3 rounded-2xl bg-petroleo p-6 text-branco">
              <h2 className="text-2xl text-ciano">Pedido feito!</h2>
              <p className="text-gelo/90">
                Guarde este link: é por ele que você acompanha o pedido, recebe o acesso e, se quiser, desiste da compra.
                Se perder, use o código <strong className="font-medium text-branco">{p.codigo}</strong> e seu e-mail em
                &quot;Encontrar meu pedido&quot;.
              </p>
              <CopiarLink url={link} rotulo="Copiar link do pedido" className="w-fit rounded-full bg-ciano px-5 py-3 text-sm font-medium text-petroleo" />
            </section>
          )}
          {msg && (
            <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
              {msg}
            </p>
          )}
          {erro && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              {erro}
            </p>
          )}

          <section className="flex flex-col gap-4 rounded-2xl bg-branco p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-petroleo/75">Pedido {p.codigo}</p>
                <h1 className="text-3xl">{STATUS_PEDIDO[p.status] ?? p.status}</h1>
              </div>
              <p className="text-2xl font-medium">{formatarPreco(p.total_centavos)}</p>
            </div>
            {!encerrado && (
              <ol className="grid gap-2 sm:grid-cols-4" aria-label="Andamento do pedido">
                {etapas.map((e) => (
                  <li key={e.nome} className={`rounded-xl px-3 py-2 text-sm ${e.feito ? "bg-petroleo text-branco" : "bg-gelo text-petroleo/75"}`}>
                    <span className="block font-medium">
                      {e.feito ? "Feito: " : ""}
                      {e.nome}
                    </span>
                    {e.quando && <span className="block text-xs opacity-80">{dataHora(e.quando)}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {p.status === "chargeback" && (
            <section role="status" className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
              <h2 className="text-xl">Pagamento contestado</h2>
              <p>
                O pagamento deste pedido foi contestado junto ao emissor do cartão (chargeback) e o valor foi devolvido por lá.
                O pedido foi encerrado e o acesso digital foi fechado. Se foi engano ou você precisa de ajuda, abra um atendimento.
              </p>
            </section>
          )}

          {p.status === "aguardando_pagamento" && cobranca && (
            <PagamentoPedido
              tema={cobranca.producers ?? { cor_principal: null, cor_destaque: null, fonte: null, layout: null, loja_nome: null }}
              meio={(cobranca.cobranca_meio as Meio | null) ?? null}
              parcelas={cobranca.cobranca_parcelas}
              pagamento={(cobranca.cobranca_pagamento as DadosPagamento | null) ?? null}
              urlPagamento={cobranca.cobranca_url}
              totalCentavos={p.total_centavos}
              simulado={Boolean(cobranca.cobranca_url?.startsWith("/simulador-pagamentos/"))}
              carregandoPagar={
                <form action={iniciarPagamento}>
                  {campos}
                  <button className={`${botaoPrincipal} w-full sm:w-fit`} data-pagar>
                    Pagar agora
                  </button>
                </form>
              }
            />
          )}

          <section className="flex flex-col gap-4 rounded-2xl bg-branco p-6">
            <h2 className="text-xl">Itens</h2>
            <ul className="flex flex-col divide-y divide-petroleo/10">
              {p.itens.map((i) => (
                <li key={i.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">
                      {i.nome} × {i.quantidade}
                    </p>
                    <p>{formatarPreco(i.preco_unitario_centavos * i.quantidade)}</p>
                  </div>
                  <p className="text-sm text-petroleo/75">{STATUS_ENTREGA[i.status_entrega] ?? i.status_entrega}</p>
                  {i.codigo_rastreio && (
                    <p className="text-sm">
                      Código de rastreio: <strong className="font-medium">{i.codigo_rastreio}</strong>
                    </p>
                  )}
                  {i.nota_fiscal_numero && (
                    <p className="text-sm">
                      Nota fiscal nº {i.nota_fiscal_numero}
                      {i.nota_fiscal_url && (
                        <>
                          {", "}
                          <a href={i.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="underline">
                            ver nota
                            <span className="sr-only"> (abre em nova aba)</span>
                          </a>
                        </>
                      )}
                      {i.nota_fiscal_chave && <span className="block break-all text-xs text-petroleo/75">Chave {i.nota_fiscal_chave}</span>}
                    </p>
                  )}
                  {i.acesso && (
                    <div className="flex flex-col gap-2 rounded-2xl bg-gelo p-4 text-sm">
                      <p className="font-medium">Seu acesso</p>
                      {i.acesso.link && (
                        <a href={i.acesso.link} target="_blank" rel="noopener noreferrer" className={`${botaoPrincipal} w-fit`}>
                          Abrir conteúdo
                          <span className="sr-only"> (abre em nova aba)</span>
                        </a>
                      )}
                      {arquivos.get(i.id) && (
                        <a href={arquivos.get(i.id)} className={`${botaoPrincipal} w-fit`}>
                          Baixar arquivo
                        </a>
                      )}
                      {i.acesso.instrucoes && <p className="whitespace-pre-line">{i.acesso.instrucoes}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 border-t border-petroleo/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatarPreco(p.subtotal_centavos)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Frete</dt>
                <dd>{p.frete_centavos === 0 ? "Grátis" : formatarPreco(p.frete_centavos)}</dd>
              </div>
              <div className="flex justify-between text-base font-medium">
                <dt>Total</dt>
                <dd>{formatarPreco(p.total_centavos)}</dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-2 rounded-2xl bg-branco p-6 text-sm">
            <h2 className="text-xl">Entrega</h2>
            <p>{ROTULO_ENTREGA[p.entrega_modo]}</p>
            {p.endereco && <p className="text-petroleo/80">{enderecoEmLinha(p.endereco)}</p>}
            {p.prazo_entrega_dias && <p className="text-petroleo/80">Chega em até {p.prazo_entrega_dias} dia(s) útil(eis) após a postagem.</p>}
            {p.arrependimento_ate && p.status === "pago" && (
              <p className="text-petroleo/80">Você pode desistir até {data(p.arrependimento_ate)}.</p>
            )}
            {p.pode_confirmar_recebimento && (
              <form action={confirmarRecebimento} className="mt-2">
                {campos}
                <button className={botaoPrincipal}>Recebi o pedido</button>
              </form>
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-2xl bg-branco p-6 text-sm">
            <h2 className="text-xl">Quem vende</h2>
            <address className="not-italic text-petroleo/80">
              {p.loja.razao_social}, CNPJ {formatarCnpj(p.loja.cnpj)}
              {p.loja.email && <span className="block">{p.loja.email}</span>}
              {p.loja.whatsapp && <span className="block">WhatsApp {p.loja.whatsapp}</span>}
            </address>
            {p.indicado && <p className="text-petroleo/80">Esta compra veio de uma indicação; quem indicou recebe comissão, sem custo extra para você.</p>}
            <Link href={`/atendimento?pedido=${p.codigo}`} className="mt-1 inline-block py-2 font-medium underline">
              Precisa de ajuda? Abrir atendimento
            </Link>
            <Link href="/reembolso" className="inline-block py-2 font-medium underline">
              Reembolso, arrependimento e garantia
            </Link>
          </section>

          {p.pode_desistir && (
            <section className="flex flex-col gap-3 rounded-2xl border border-petroleo/20 bg-branco p-6 text-sm">
              <h2 className="text-xl">{p.status === "aguardando_pagamento" ? "Cancelar pedido" : "Desistir da compra"}</h2>
              <p className="text-petroleo/80">
                {p.status === "aguardando_pagamento"
                  ? "O pedido ainda não foi pago: cancelar não tem custo."
                  : "Você tem 7 dias a partir do recebimento para desistir, sem precisar explicar. Você recebe de volta tudo o que pagou, inclusive o frete (CDC, art. 49). Se o produto já chegou, a loja combina com você a devolução, sem custo para você."}{" "}
                <Link href="/reembolso" className="underline">
                  Ler a política de reembolso
                </Link>
                .
              </p>
              <details className="rounded-2xl bg-gelo p-4">
                <summary className="cursor-pointer py-1 font-medium">
                  {p.status === "aguardando_pagamento" ? "Quero cancelar" : "Quero desistir"}
                </summary>
                <form action={desistir} className="mt-3 flex flex-col gap-3">
                  {campos}
                  <label className="flex flex-col gap-1 font-medium">
                    Motivo (opcional)
                    <textarea name="motivo" maxLength={1000} rows={3} className="rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base font-normal" />
                  </label>
                  <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-red-800 px-6 py-3 font-medium text-branco">
                    {p.status === "aguardando_pagamento" ? "Confirmar cancelamento" : "Confirmar desistência"}
                  </button>
                </form>
              </details>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
