// Mapeamento do status da cobrança (como o provedor informa) para o efeito no pedido.
// Função PURA (sem banco nem rede), testada em status.test.ts. A regra de verdade é aplicada
// no banco (aplicar_status_cobranca); aqui ficam a validação do que chega e o rótulo do efeito.
import type { StatusCobranca } from "./tipos";

export const STATUS_COBRANCA: readonly StatusCobranca[] = [
  "pendente", "paga", "recusada", "expirada", "estornada", "estorno_pendente", "chargeback",
];

export function statusCobrancaValido(valor: unknown): valor is StatusCobranca {
  return typeof valor === "string" && (STATUS_COBRANCA as readonly string[]).includes(valor);
}

export type EfeitoNoPedido = "confirmar" | "cancelar" | "reembolsar" | "chargeback" | "nenhum";

export function efeitoDoStatus(status: StatusCobranca): EfeitoNoPedido {
  switch (status) {
    case "paga":
      return "confirmar"; // aguardando_pagamento → pago
    case "recusada":
    case "expirada":
      return "cancelar"; // aguardando_pagamento → cancelado
    case "estornada":
      return "reembolsar"; // pago/em_reembolso → reembolsado (comissões estornadas)
    case "chargeback":
      return "chargeback"; // pago/em_reembolso → chargeback (comissões estornadas + audit_log)
    default:
      return "nenhum"; // pendente e estorno_pendente: nada muda
  }
}

// status do pedido que cada efeito produz (a partir de quais estados ele vale)
export const TRANSICAO: Record<Exclude<EfeitoNoPedido, "nenhum">, { de: string[]; para: string }> = {
  confirmar: { de: ["aguardando_pagamento"], para: "pago" },
  cancelar: { de: ["aguardando_pagamento"], para: "cancelado" },
  reembolsar: { de: ["pago", "em_reembolso"], para: "reembolsado" },
  chargeback: { de: ["pago", "em_reembolso"], para: "chargeback" },
};

// o pedido muda? (usado para conferir o resultado do banco nos testes e no resumo da conciliação)
export function pedidoMuda(statusPedido: string, status: StatusCobranca): boolean {
  const efeito = efeitoDoStatus(status);
  return efeito !== "nenhum" && TRANSICAO[efeito].de.includes(statusPedido);
}

export const ROTULO_STATUS_COBRANCA: Record<StatusCobranca, string> = {
  pendente: "Aguardando pagamento",
  paga: "Paga",
  recusada: "Recusada",
  expirada: "Expirada",
  estornada: "Estornada",
  estorno_pendente: "Estorno solicitado",
  chargeback: "Chargeback",
};
