// Processamento de eventos de webhook JÁ validados (assinatura conferida por provedor.validarWebhook).
//  * grava o payload bruto em eventos_pagamento (auditoria);
//  * idempotência por (provedor, evento_id): o mesmo aviso 2x não repete o efeito;
//  * evento que falhou antes (erro registrado) é REPROCESSADO quando o provedor reenviar.
import "server-only";
import { despacharEmailsNotificacoes } from "@/lib/notificacoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { aplicarStatusCobranca } from "./cobrancas";
import type { EventoPagamento, PaymentProvider } from "./tipos";

export async function processarEvento(provedor: PaymentProvider, evento: EventoPagamento, corpo: string) {
  const admin = criarClienteAdmin();
  let id: number;
  const { data: novo, error } = await admin
    .from("eventos_pagamento")
    .insert({ provedor: provedor.nome, evento_id: evento.id, tipo: evento.tipo, payload: JSON.parse(corpo) })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") {
    // já recebido: se foi processado sem erro, é repetição; se falhou, tenta de novo
    const { data: antigo } = await admin
      .from("eventos_pagamento")
      .select("id, processado_em, erro")
      .eq("provedor", provedor.nome)
      .eq("evento_id", evento.id)
      .maybeSingle();
    if (!antigo || (antigo.processado_em && !antigo.erro)) return { duplicado: true };
    id = antigo.id;
  } else if (error || !novo) {
    throw new Error("falha_ao_registrar_evento");
  } else {
    id = novo.id;
  }

  let erro: string | null = null;
  let efeito: string | undefined;
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
    } else if (evento.tipo === "cobranca.status") {
      // pago → confirma · recusado/expirado → cancela · estornado → reembolsado · chargeback → contestado
      efeito = await aplicarStatusCobranca(provedor.nome, evento.provedorId, evento.status, evento.pedidoId);
    }
  } catch (e) {
    erro = (e instanceof Error ? e.message : String(e)).slice(0, 500);
  }
  await admin.from("eventos_pagamento").update({ processado_em: new Date().toISOString(), erro }).eq("id", id);
  // avisos importantes gerados pelo evento (venda nova, recebedor recusado...) saem por e-mail
  await despacharEmailsNotificacoes();
  if (erro) throw new Error(erro);
  return { duplicado: false, efeito };
}
