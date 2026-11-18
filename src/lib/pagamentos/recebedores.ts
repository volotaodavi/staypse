// Recebedores (cadastro de recebimento na Lytex) e processamento de eventos.
// A Staypse guarda só o STATUS; documentos e dados bancários ficam com a Lytex.
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { provedorPagamentos } from ".";
import type { EventoPagamento, PapelRecebedor, PaymentProvider, StatusRecebedor } from "./tipos";

export type MeuRecebedor = {
  papel: PapelRecebedor;
  status_recebedor: StatusRecebedor;
  motivo: string | null;
  documento: string;
  documento_provedor: string | null;
  provedor: string;
  provedor_id: string | null;
  atualizado_em: string;
};

export const ROTULO_STATUS_RECEBEDOR: Record<StatusRecebedor, string> = {
  nao_iniciado: "Não iniciado",
  em_analise: "Em análise na Lytex",
  aprovado: "Aprovado",
  recusado: "Recusado",
  suspenso: "Suspenso",
};

// inicia (ou refaz) o cadastro de recebimento no provedor
export async function iniciarRecebedor(dados: { userId: string; papel: PapelRecebedor; documento: string; nome: string; email: string }) {
  const provedor = provedorPagamentos();
  const r = await provedor.criarRecebedor(dados);
  const { error } = await criarClienteAdmin().rpc("registrar_recebedor", {
    p_user: dados.userId,
    p_papel: dados.papel,
    p_documento: dados.documento,
    p_provedor: provedor.nome,
    p_provedor_id: r.provedorId,
    p_status: r.status,
    p_motivo: r.motivo ?? null,
  });
  if (error) throw new Error(error.message.includes("documento_diferente") ? "documento_diferente_do_cadastro" : "falha_ao_registrar");
  return r;
}

// aplica um evento JÁ validado; idempotente (o mesmo evento 2x não repete o efeito)
export async function processarEvento(provedor: PaymentProvider, evento: EventoPagamento, corpo: string) {
  const admin = criarClienteAdmin();
  const { data: novo, error } = await admin
    .from("eventos_pagamento")
    .insert({ provedor: provedor.nome, evento_id: evento.id, tipo: evento.tipo, payload: JSON.parse(corpo) })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return { duplicado: true };
  if (error || !novo) throw new Error("falha_ao_registrar_evento");

  let erro: string | null = null;
  try {
    if (evento.tipo === "recebedor.status") {
      const { error: e } = await admin.rpc("aplicar_status_recebedor", {
        p_provedor: provedor.nome,
        p_provedor_id: evento.provedorId,
        p_status: evento.status,
        p_motivo: evento.motivo ?? null,
        p_documento: evento.documento ?? null,
      });
      if (e) throw new Error(e.message);
    } else if (evento.tipo === "cobranca.status" && evento.status === "paga") {
      const { error: e } = await admin.rpc("confirmar_pagamento", { p_order: evento.pedidoId });
      if (e && !e.message.includes("pedido_nao_aguarda_pagamento")) throw new Error(e.message);
    }
  } catch (e) {
    erro = (e instanceof Error ? e.message : String(e)).slice(0, 500);
  }
  await admin.from("eventos_pagamento").update({ processado_em: new Date().toISOString(), erro }).eq("id", novo.id);
  if (erro) throw new Error(erro);
  return { duplicado: false };
}

// "Reconsultar na Lytex" (admin) e conciliação diária: o provedor é a fonte da verdade
export async function reconsultarRecebedor(provedorNome: string, provedorId: string) {
  const provedor = provedorPagamentos();
  if (provedor.nome !== provedorNome) throw new Error("provedor_diferente");
  const r = await provedor.consultarRecebedor(provedorId);
  const { error } = await criarClienteAdmin().rpc("aplicar_status_recebedor", {
    p_provedor: provedor.nome,
    p_provedor_id: provedorId,
    p_status: r.status,
    p_motivo: r.motivo ?? null,
    p_documento: r.documento ?? null,
  });
  if (error) throw new Error(error.message);
  return r;
}
