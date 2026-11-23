"use server";
// Botões da "página de pagamento da Lytex" SIMULADA: mudam o estado da cobrança simulada e
// mandam o webhook ASSINADO ao nosso endpoint por HTTP (o mesmo caminho que a Lytex usará),
// para testar assinatura, idempotência e atraso de webhook. Só com o simulador ligado.
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { simuladorAtivo } from "@/lib/pagamentos";
import { CABECALHO_ASSINATURA, assinarMock } from "@/lib/pagamentos/mock";
import { VOLTA_VALIDA } from "@/lib/pagamentos/simulador";
import type { StatusCobranca } from "@/lib/pagamentos/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/supabase/env";

const ACOES = ["pagar_pix", "pagar_cartao", "pagar_sem_webhook", "recusar", "chargeback", "estorno", "reenviar"] as const;
type Acao = (typeof ACOES)[number];

async function enviarWebhook(corpo: string): Promise<boolean> {
  const r = await fetch(`${urlDoSite()}/api/webhooks/pagamentos/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [CABECALHO_ASSINATURA]: assinarMock(corpo) },
    body: corpo,
    cache: "no-store",
  });
  return r.ok;
}

export async function acaoSimulada(f: FormData) {
  if (!simuladorAtivo()) redirect("/");
  const provedorId = String(f.get("provedor_id") ?? "");
  const acao = String(f.get("acao") ?? "") as Acao;
  const volta = String(f.get("volta") ?? "");
  if (!ACOES.includes(acao) || !/^mock_cob_[0-9a-f-]{36}$/.test(provedorId)) redirect("/");

  const admin = criarClienteAdmin();
  const { data: c } = await admin
    .from("simulador_cobrancas")
    .select("pedido_id, status, estorno_solicitado_em, ultimo_evento")
    .eq("provedor_id", provedorId)
    .maybeSingle();
  if (!c) redirect("/");

  let msg: string;
  let novoStatus: StatusCobranca | null = null;
  let meio: "pix" | "cartao" | null = null;
  let semWebhook = false;
  if (acao === "reenviar") {
    // mesmo aviso, mesmo id: o servidor tem que ignorar a repetição
    msg = c.ultimo_evento
      ? (await enviarWebhook(JSON.stringify(c.ultimo_evento))) ? "Último webhook reenviado (mesmo id)." : "Webhook recusado."
      : "Ainda não há webhook para reenviar.";
  } else {
    if (acao === "pagar_pix" || acao === "pagar_cartao" || acao === "pagar_sem_webhook") {
      if (c.status !== "pendente") redirect(destino(provedorId, volta, "Esta cobrança não está pendente."));
      novoStatus = "paga";
      meio = acao === "pagar_cartao" ? "cartao" : "pix";
      semWebhook = acao === "pagar_sem_webhook";
    } else if (acao === "recusar") {
      if (c.status !== "pendente") redirect(destino(provedorId, volta, "Esta cobrança não está pendente."));
      novoStatus = "recusada";
    } else if (acao === "chargeback") {
      if (c.status !== "paga") redirect(destino(provedorId, volta, "Só cobrança paga pode ter chargeback."));
      novoStatus = "chargeback";
    } else {
      if (c.status !== "paga" || !c.estorno_solicitado_em) redirect(destino(provedorId, volta, "Nenhum estorno solicitado."));
      novoStatus = "estornada";
    }
    const { error } = await admin
      .from("simulador_cobrancas")
      .update({ status: novoStatus, ...(meio ? { meio } : {}) })
      .eq("provedor_id", provedorId);
    if (error) redirect(destino(provedorId, volta, "Não foi possível mudar a cobrança."));
    if (semWebhook) {
      msg = "Pago SEM avisar a Staypse (webhook atrasado). A conciliação resolve.";
    } else {
      const evento = { id: `mock_ev_${randomUUID()}`, tipo: "cobranca.status", provedorId, pedidoId: c.pedido_id, status: novoStatus };
      await admin.from("simulador_cobrancas").update({ ultimo_evento: evento }).eq("provedor_id", provedorId);
      msg = (await enviarWebhook(JSON.stringify(evento))) ? `Webhook enviado: ${novoStatus}.` : "Webhook recusado pela Staypse.";
    }
  }
  redirect(destino(provedorId, volta, msg));
}

function destino(provedorId: string, volta: string, msg: string): string {
  const q = new URLSearchParams({ msg });
  if (VOLTA_VALIDA.test(volta)) q.set("volta", volta);
  return `/simulador-pagamentos/cobranca/${provedorId}?${q.toString()}`;
}
