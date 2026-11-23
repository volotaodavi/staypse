// Recebedores (cadastro de recebimento na Lytex) e processamento de eventos.
// A Staypse guarda só o STATUS; documentos e dados bancários ficam com a Lytex.
import { despacharEmailsNotificacoes } from "@/lib/notificacoes";
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { provedorPagamentos } from ".";
import type { PapelRecebedor, StatusRecebedor } from "./tipos";

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
  await despacharEmailsNotificacoes();
  return r;
}
