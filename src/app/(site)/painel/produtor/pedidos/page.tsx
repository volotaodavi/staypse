// Pedidos da loja: o que fazer (nota fiscal, envio, entrega), desistências e
// atendimentos. Dados do comprador só aparecem em pedido PAGO (LGPD:
// mínimo necessário para entregar).
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import {
  ASSUNTOS_ATENDIMENTO,
  ROTULO_ENTREGA,
  STATUS_ENTREGA,
  STATUS_PEDIDO,
  data,
  dataHora,
  enderecoEmLinha,
  formatarCpf,
  type Endereco,
  type ModoEntrega,
} from "@/lib/pedidos";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { registrarEnvio, responderAtendimento } from "./acoes";

export const metadata = { title: "Pedidos da loja" };
export const instant = false;

type ItemPedido = {
  id: string;
  nome_item: string;
  tipo_item: string;
  quantidade: number;
  preco_unitario_centavos: number;
  status_entrega: string;
  codigo_rastreio: string | null;
  nota_fiscal_numero: string | null;
  nota_fiscal_chave: string | null;
  nota_fiscal_url: string | null;
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
  total_centavos: number;
  frete_centavos: number;
  revendedor_id: string | null;
  vendedor_id: string | null;
  order_items: ItemPedido[];
};
type Atendimento = { id: string; protocolo: string; assunto: string; mensagem: string; status: string; resposta: string | null; prazo_ate: string; nome: string; email: string };

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const campo = "w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base font-normal";
const botao = "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium";

export default async function PedidosDaLoja({ searchParams }: PageProps<"/painel/produtor/pedidos">) {
  const usuario = await exigirPapel("produtor");
  const sp = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: produtor } = await supabase.from("producers").select("id").eq("user_id", usuario.id).maybeSingle();

  const [{ data: pedidosBrutos, error }, { data: atendimentosBrutos }] = await Promise.all([
    produtor
      ? supabase
          .from("orders")
          .select(
            "id, codigo, status, criado_em, pago_em, entregue_em, arrependimento_ate, arrependimento_motivo, comprador_nome, comprador_email, comprador_documento, comprador_telefone, endereco_entrega, entrega_modo, total_centavos, frete_centavos, revendedor_id, vendedor_id, order_items(id, nome_item, tipo_item, quantidade, preco_unitario_centavos, status_entrega, codigo_rastreio, nota_fiscal_numero, nota_fiscal_chave, nota_fiscal_url)",
          )
          .eq("producer_id", produtor.id)
          .neq("status", "cancelado")
          .order("criado_em", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("atendimentos")
      .select("id, protocolo, assunto, mensagem, status, resposta, prazo_ate, nome, email")
      .in("assunto", ["pedido", "arrependimento"])
      .neq("status", "encerrado")
      .order("prazo_ate"),
  ]);
  if (error) throw new Error(`Pedidos indisponíveis: ${error.message}`);
  const pedidos = (pedidosBrutos ?? []) as unknown as Pedido[];
  const atendimentos = (atendimentosBrutos ?? []) as Atendimento[];

  const aFazer = pedidos.filter((p) => p.status === "pago" && p.order_items.some((i) => ["aguardando", "enviado"].includes(i.status_entrega) || !i.nota_fiscal_numero));
  const desistencias = pedidos.filter((p) => p.status === "em_reembolso");
  const aguardando = pedidos.filter((p) => p.status === "aguardando_pagamento");
  const concluidos = pedidos.filter((p) => !aFazer.includes(p) && !desistencias.includes(p) && !aguardando.includes(p));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/painel/produtor" className="inline-block w-fit py-2 text-sm underline">
        ← Painel do produtor
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl">Pedidos</h1>
        <Link href="/painel/produtor/frete" className="inline-block py-2 text-sm font-medium underline">
          Configurar frete
        </Link>
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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["A fazer", aFazer.length],
          ["Desistências", desistencias.length],
          ["Aguardando pagamento", aguardando.length],
          ["Atendimentos abertos", atendimentos.length],
        ].map(([nome, n]) => (
          <div key={nome} className="rounded-2xl bg-branco p-4">
            <dt className="text-sm text-petroleo/75">{nome}</dt>
            <dd className="text-2xl font-extrabold">{n}</dd>
          </div>
        ))}
      </dl>

      {atendimentos.length > 0 && (
        <section aria-labelledby="t-atend" className="flex flex-col gap-3">
          <h2 id="t-atend" className="text-xl">
            Atendimentos sobre pedidos
          </h2>
          {atendimentos.map((a) => (
            <article key={a.id} className="flex flex-col gap-2 rounded-3xl bg-branco p-5 text-sm">
              <p className="text-petroleo/75">
                Protocolo {a.protocolo} · {ASSUNTOS_ATENDIMENTO[a.assunto]} · responder até {data(a.prazo_ate)}
              </p>
              <p className="font-medium">
                {a.nome} ({a.email})
              </p>
              <p className="whitespace-pre-line">{a.mensagem}</p>
              {a.resposta && <p className="rounded-xl bg-gelo px-3 py-2">Sua resposta: {a.resposta}</p>}
              <form action={responderAtendimento} className="flex flex-col gap-2">
                <input type="hidden" name="atendimento" value={a.id} />
                <label className="flex flex-col gap-1 font-medium">
                  Resposta
                  <textarea name="resposta" required maxLength={4000} rows={3} className={campo} />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="encerrar" value="sim" className="h-5 w-5 accent-petroleo" /> Resolvido (encerrar)
                </label>
                <button className={`${botao} w-fit bg-petroleo text-branco`}>Enviar resposta</button>
              </form>
            </article>
          ))}
        </section>
      )}

      <Lista titulo="A fazer" vazio="Nada pendente. Quando um pedido for pago, ele aparece aqui." pedidos={aFazer} />
      {desistencias.length > 0 && <Lista titulo="Desistências (arrependimento)" vazio="" pedidos={desistencias} />}
      {aguardando.length > 0 && <Lista titulo="Aguardando pagamento" vazio="" pedidos={aguardando} />}
      {concluidos.length > 0 && <Lista titulo="Concluídos" vazio="" pedidos={concluidos} />}
    </div>
  );
}

function Lista({ titulo, vazio, pedidos }: { titulo: string; vazio: string; pedidos: Pedido[] }) {
  const id = `t-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl">
        {titulo}
      </h2>
      {pedidos.length === 0 ? (
        <p className="rounded-2xl bg-branco p-4 text-sm text-petroleo/75">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((p) => (
            <li key={p.id} data-pedido={p.codigo}>
              <CartaoPedido p={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CartaoPedido({ p }: { p: Pedido }) {
  const pago = p.status !== "aguardando_pagamento";
  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-branco p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">Pedido {p.codigo}</p>
          <p className="text-petroleo/75">
            {dataHora(p.criado_em)} · {STATUS_PEDIDO[p.status]}
            {p.revendedor_id ? (p.vendedor_id ? " · venda de vendedor da loja" : " · venda indicada por afiliado") : ""}
          </p>
        </div>
        <p className="text-lg font-medium">{formatarPreco(p.total_centavos)}</p>
      </div>

      {p.status === "em_reembolso" && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
          O cliente desistiu da compra{p.arrependimento_motivo ? ` (motivo: ${p.arrependimento_motivo})` : ""}. Combine a
          devolução sem custo para ele; o reembolso é total, inclusive o frete (CDC, art. 49).
        </p>
      )}

      {pago && (
        <div className="rounded-2xl bg-gelo p-3">
          <p className="font-medium">{p.comprador_nome}</p>
          <p className="text-petroleo/80">
            {p.comprador_email}
            {p.comprador_telefone ? ` · ${p.comprador_telefone}` : ""} · CPF {formatarCpf(p.comprador_documento)}
          </p>
          <p className="mt-1 text-petroleo/80">
            {p.entrega_modo ? ROTULO_ENTREGA[p.entrega_modo] : ""}
            {p.endereco_entrega ? ` · ${enderecoEmLinha(p.endereco_entrega)}` : ""}
          </p>
          {p.arrependimento_ate && <p className="mt-1 text-petroleo/80">Prazo de desistência até {data(p.arrependimento_ate)}</p>}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {p.order_items.map((i) => (
          <li key={i.id} className="flex flex-col gap-2 border-t border-petroleo/10 pt-3">
            <p>
              <span className="font-medium">
                {i.nome_item} × {i.quantidade}
              </span>{" "}
              · {formatarPreco(i.preco_unitario_centavos * i.quantidade)} ·{" "}
              <span data-status-entrega>{STATUS_ENTREGA[i.status_entrega] ?? i.status_entrega}</span>
            </p>
            {p.status === "pago" && i.status_entrega !== "entregue" && i.status_entrega !== "cancelado" && (
              <form action={registrarEnvio} className="grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="item_pedido" value={i.id} />
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
              </form>
            )}
            {i.nota_fiscal_numero && (i.status_entrega === "entregue" || p.status !== "pago") && (
              <p className="text-petroleo/75">
                Nota {i.nota_fiscal_numero}
                {i.codigo_rastreio ? ` · rastreio ${i.codigo_rastreio}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
