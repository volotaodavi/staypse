// Dados comuns do painel da loja: a loja da pessoa logada e o status de
// exibição dos pedidos. Tudo com a sessão dela (a RLS só devolve o que é dela).
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function minhaLoja() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: loja } = await supabase
    .from("producers")
    .select("id, razao_social, loja_nome, loja_slug, status_verificacao, frete_fixo_centavos")
    .eq("user_id", usuario.id)
    .maybeSingle();
  return { usuario, supabase, loja };
}

// Situação do pedido como a loja enxerga (o envio é por item; aqui, o resumo do pedido)
export const STATUS_EXIBICAO: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  a_enviar: "Pago · a enviar",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  em_reembolso: "Desistência (reembolso)",
  reembolsado: "Reembolsado",
  chargeback: "Chargeback (pagamento contestado)",
};

export function statusExibicao(status: string, itens: { status_entrega: string }[]): string {
  if (status !== "pago") return status;
  if (itens.length > 0 && itens.every((i) => i.status_entrega === "entregue")) return "entregue";
  if (itens.some((i) => i.status_entrega === "enviado" || i.status_entrega === "entregue")) return "enviado";
  return "a_enviar";
}
