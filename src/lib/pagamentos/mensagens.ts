// Mensagem para o comprador quando a cobrança não pôde ser criada (sem detalhe técnico).
import { ERROS_PEDIDO } from "@/lib/pedidos";

export function mensagemDePagamento(e: unknown): string {
  const texto = e instanceof Error ? e.message : "";
  if (e instanceof Error && e.name === "IntegracaoPendente") {
    return "O pagamento online ainda não está disponível. Você não foi cobrado: seu pedido está guardado, tente pagar de novo mais tarde por este link.";
  }
  const chave = Object.keys(ERROS_PEDIDO).find((k) => texto.includes(k));
  if (chave) return ERROS_PEDIDO[chave];
  if (texto.includes("indicador_sem_recebedor")) return "Não foi possível montar o pagamento deste pedido agora. Tente de novo em alguns minutos.";
  return "Não foi possível abrir o pagamento agora. Você não foi cobrado: tente de novo em alguns minutos.";
}
