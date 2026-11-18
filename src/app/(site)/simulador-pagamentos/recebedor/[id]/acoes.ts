"use server";
// Botões do simulador: monta o evento, ASSINA e envia ao nosso webhook por HTTP
// (o mesmo caminho que a Lytex usará), para testar assinatura e idempotência.
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { simuladorAtivo } from "@/lib/pagamentos";
import { CABECALHO_ASSINATURA, assinarMock } from "@/lib/pagamentos/mock";
import { urlDoSite } from "@/lib/supabase/env";

const STATUS = ["aprovado", "recusado", "suspenso"] as const;

export async function enviarEventoSimulado(f: FormData) {
  if (!simuladorAtivo()) redirect("/");
  const provedorId = String(f.get("provedor_id") ?? "");
  const status = String(f.get("status") ?? "") as (typeof STATUS)[number];
  const volta = String(f.get("volta") ?? "/painel");
  if (!STATUS.includes(status) || !/^mock_rec_[0-9a-f-]{36}$/.test(provedorId)) redirect("/");
  const corpo = JSON.stringify({
    id: `mock_ev_${randomUUID()}`,
    tipo: "recebedor.status",
    provedorId,
    status,
    motivo: status === "aprovado" ? null : String(f.get("motivo") ?? "").slice(0, 200) || "Recusado no simulador.",
  });
  const r = await fetch(`${urlDoSite()}/api/webhooks/pagamentos/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [CABECALHO_ASSINATURA]: assinarMock(corpo) },
    body: corpo,
    cache: "no-store",
  });
  const msg = r.ok ? `Webhook enviado: ${status}.` : `Webhook recusado (${r.status}).`;
  redirect(`/simulador-pagamentos/recebedor/${provedorId}?${new URLSearchParams({ volta, msg }).toString()}`);
}
