// Detalhe do pedido para a loja: itens, endereço (só físico), quem indicou,
// nota fiscal, rastreio, "Marcar como enviado" e prazo de arrependimento.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROTULO_ENTREGA, STATUS_ENTREGA, data, dataHora, enderecoEmLinha, formatarCpf, type Endereco, type ModoEntrega } from "@/lib/pedidos";
import { formatarPreco } from "@/lib/produtor";
import { STATUS_EXIBICAO, minhaLoja, statusExibicao } from "../../dados";
import { registrarEnvio } from "../acoes";

export const metadata = { title: "Pedido" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const campo = "w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base font-normal";
const botao = "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium";

type Item = {
  id: string;
  nome_item: string;
  tipo_item: string;
  quantidade: number;
  preco_unitario_centavos: number;
  comissao_percentual: number;
  status_entrega: string;
  codigo_rastreio: string | null;
  nota_fiscal_numero: string | null;
  nota_fiscal_chave: string | null;
  nota_fiscal_url: string | null;
  enviado_em: string | null;
};
type Pedido = {
  id: string;
  codigo: string;
  status: string;
  criado_em: string;
  pago_em: string | null;
  entregue_em: string | null;
  arrependimento_ate: string | null;
  arrependimento_motivo: string | null;
  comprador_nome: string;
  comprador_email: string;
  comprador_documento: string | null;
  comprador_telefone: string | null;
  endereco_entrega: Endereco | null;
  entrega_modo: ModoEntrega | null;
  subtotal_centavos: number;
  frete_centavos: number;
  total_centavos: number;
  revendedor_id: string | null;
  vendedor_id: string | null;
  storefronts: { slug: string; nome_exibicao: string | null } | null;
  loja_vendedores: { email: string } | null;
  order_items: Item[];
};

export default async function DetalhePedido({ params, searchParams }: PageProps<"/painel/loja/pedidos/[codigo]">) {
  const { codigo } = await params;
  const sp = await searchParams;
  const { supabase, loja } = await minhaLoja();
  if (!loja || !/^[A-Z0-9]{10}$/.test(codigo)) notFound();
  const { data: bruto } = await supabase
    .from("orders")
    .select(
      "id, codigo, status, criado_em, pago_em, entregue_em, arrependimento_ate, arrependimento_motivo, comprador_nome, comprador_email, comprador_documento, comprador_telefone, endereco_entrega, entrega_modo, subtotal_centavos, frete_centavos, total_centavos, revendedor_id, vendedor_id, storefronts(slug, nome_exibicao), loja_vendedores(email), order_items(id, nome_item, tipo_item, quantidade, preco_unitario_centavos, comissao_percentual, status_entrega, codigo_rastreio, nota_fiscal_numero, nota_fiscal_chave, nota_fiscal_url, enviado_em)",
    )
    .eq("producer_id", loja.id)
    .eq("codigo", codigo)
    .maybeSingle();
  if (!bruto) notFound();
  const p = bruto as unknown as Pedido;
  const st = statusExibicao(p.status, p.order_items);
  const pago = p.status !== "aguardando_pagamento" && p.status !== "cancelado";
  const comissao = p.order_items.reduce((s, i) => s + Math.floor((i.quantidade * i.preco_unitario_centavos * Number(i.comissao_percentual)) / 100), 0);
  const fisico = p.order_items.some((i) => i.tipo_item === "fisico");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/painel/loja/pedidos" className="inline-block w-fit py-2 text-sm underline">
        ← Pedidos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-petroleo/75">Pedido {p.codigo}</p>
          <h1 className="text-3xl" data-status-pedido>
            {STATUS_EXIBICAO[st] ?? st}
          </h1>
        </div>
        <p className="text-3xl font-extrabold tabular-nums">{formatarPreco(p.total_centavos)}</p>
      </div>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}
      {um(sp.erro) && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {um(sp.erro)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="flex flex-col gap-3 rounded-2xl bg-branco p-5 text-sm" aria-labelledby="t-itens">
          <h2 id="t-itens" className="text-base font-medium">
            Itens
          </h2>
          <ul className="flex flex-col gap-4">
            {p.order_items.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 border-t border-petroleo/10 pt-3 first:border-0 first:pt-0">
                <p>
                  <span className="font-medium">
                    {i.nome_item} × {i.quantidade}
                  </span>{" "}
                  · {formatarPreco(i.preco_unitario_centavos * i.quantidade)} ·{" "}
                  <span data-status-entrega>{STATUS_ENTREGA[i.status_entrega] ?? i.status_entrega}</span>
                  {i.enviado_em && <span className="text-petroleo/75"> em {dataHora(i.enviado_em)}</span>}
                </p>
                {i.nota_fiscal_numero && (
                  <p className="text-petroleo/75">
                    Nota {i.nota_fiscal_numero}
                    {i.codigo_rastreio ? ` · rastreio ${i.codigo_rastreio}` : ""}
                  </p>
                )}
                {p.status === "pago" && i.status_entrega !== "entregue" && i.status_entrega !== "cancelado" && (
                  <form action={registrarEnvio} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="item_pedido" value={i.id} />
                    <input type="hidden" name="codigo" value={p.codigo} />
                    <label className="flex flex-col gap-1 font-medium">
                      Nº da nota fiscal
                      <input name="nf_numero" required maxLength={30} defaultValue={i.nota_fiscal_numero ?? ""} className={campo} />
                    </label>
                    <label className="flex flex-col gap-1 font-medium">
                      Chave de acesso (44 números)
                      <input name="nf_chave" inputMode="numeric" maxLength={60} defaultValue={i.nota_fiscal_chave ?? ""} className={campo} />
                    </label>
                    <label className="flex flex-col gap-1 font-medium sm:col-span-2">
                      ou link da nota (https://)
                      <input name="nf_url" type="url" maxLength={500} defaultValue={i.nota_fiscal_url ?? ""} className={campo} />
                    </label>
                    {p.entrega_modo === "envio" && (
                      <label className="flex flex-col gap-1 font-medium sm:col-span-2">
                        Código de rastreio
                        <input name="rastreio" maxLength={40} defaultValue={i.codigo_rastreio ?? ""} className={campo} />
                      </label>
                    )}
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button name="acao" value="nota" className={`${botao} border border-petroleo`}>
                        Salvar nota
                      </button>
                      {p.entrega_modo === "envio" && i.status_entrega === "aguardando" && (
                        <button name="acao" value="enviado" className={`${botao} bg-petroleo text-branco`}>
                          Marcar como enviado
                        </button>
                      )}
                      <button name="acao" value="entregue" className={`${botao} bg-ciano text-petroleo`}>
                        {p.entrega_modo === "digital" ? "Nota emitida · concluir" : p.entrega_modo === "retirada" ? "Cliente retirou" : "Marcar como entregue"}
                      </button>
                    </div>
                    <p className="text-xs text-petroleo/75 sm:col-span-2">A nota fiscal é obrigatória antes do envio.</p>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t border-petroleo/10 pt-3">
            <div className="flex justify-between gap-3">
              <dt>Subtotal</dt>
              <dd>{formatarPreco(p.subtotal_centavos)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Frete</dt>
              <dd>{p.frete_centavos === 0 ? "Grátis" : formatarPreco(p.frete_centavos)}</dd>
            </div>
            {comissao > 0 && (
              <div className="flex justify-between gap-3 text-petroleo/75">
                <dt>Comissão de quem indicou (repassada pelo split)</dt>
                <dd>{formatarPreco(comissao)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 font-medium">
              <dt>Total</dt>
              <dd>{formatarPreco(p.total_centavos)}</dd>
            </div>
          </dl>
        </section>

        <aside className="flex flex-col gap-3 text-sm">
          <section className="flex flex-col gap-1 rounded-2xl bg-branco p-5">
            <h2 className="text-base font-medium">Datas</h2>
            <p>Pedido: {dataHora(p.criado_em)}</p>
            <p>Pagamento: {dataHora(p.pago_em)}</p>
            <p>Recebimento: {dataHora(p.entregue_em)}</p>
            <p className={p.arrependimento_ate ? "font-medium" : "text-petroleo/75"} data-arrependimento>
              {p.arrependimento_ate
                ? `Prazo de arrependimento (7 dias): até ${data(p.arrependimento_ate)}`
                : "Prazo de arrependimento: 7 dias a partir do recebimento"}
            </p>
            {p.status === "em_reembolso" && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                O cliente desistiu{p.arrependimento_motivo ? ` (${p.arrependimento_motivo})` : ""}. Combine a devolução sem custo
                para ele; o reembolso é total, inclusive o frete.
              </p>
            )}
          </section>
          <section className="flex flex-col gap-1 rounded-2xl bg-branco p-5">
            <h2 className="text-base font-medium">Quem indicou</h2>
            {p.vendedor_id ? (
              <p data-indicou>Vendedor próprio · {p.loja_vendedores?.email ?? "—"}</p>
            ) : p.revendedor_id ? (
              <p data-indicou>
                Afiliado ·{" "}
                {p.storefronts ? (
                  <Link href={`/@${p.storefronts.slug}`} className="underline">
                    {p.storefronts.nome_exibicao || `@${p.storefronts.slug}`}
                  </Link>
                ) : (
                  "vitrine não publicada"
                )}
              </p>
            ) : (
              <p data-indicou>Venda direta na loja (sem indicação)</p>
            )}
          </section>
          <section className="flex flex-col gap-1 rounded-2xl bg-branco p-5">
            <h2 className="text-base font-medium">Comprador e entrega</h2>
            {pago ? (
              <>
                <p className="font-medium">{p.comprador_nome}</p>
                <p className="text-petroleo/80">
                  {p.comprador_email}
                  {p.comprador_telefone ? ` · ${p.comprador_telefone}` : ""}
                </p>
                <p className="text-petroleo/80">CPF {formatarCpf(p.comprador_documento)} (para a nota fiscal)</p>
                <p className="mt-1">{p.entrega_modo ? ROTULO_ENTREGA[p.entrega_modo] : ""}</p>
                {fisico && p.endereco_entrega && <p className="text-petroleo/80">{enderecoEmLinha(p.endereco_entrega)}</p>}
              </>
            ) : (
              <p className="text-petroleo/75">Os dados do comprador aparecem quando o pagamento é confirmado.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
