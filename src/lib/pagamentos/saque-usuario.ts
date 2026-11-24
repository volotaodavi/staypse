// Regras puras do saque da subconta Lytex de lojas, afiliados e vendedores (sem rede nem banco).
// O dinheiro de cada um fica na subconta dele; a Staypse só pede o saque e registra.
import { z } from "zod";
import { reaisParaCentavos } from "@/app/(site)/admin/financeiro/saque";

// custo do saque de subconta no contrato da Lytex (R$ 2,80), repassado a quem saca
export const CUSTO_SAQUE_CENTAVOS = 280;

export const PedidoSaque = z.object({
  valorCentavos: z.number().int().min(1).max(100_000_000),
  contaId: z.string().min(1).max(100),
  chave: z.string().min(8).max(80),
});

// status do saque da Lytex (WithdrawSolicitation) no vocabulário da Staypse
export function statusDoSaque(s: string): "pendente" | "concluido" | "falhou" {
  if (s === "released") return "concluido";
  if (s === "rejected" || s === "reproved") return "falhou";
  return "pendente";
}

// "Valor máximo para saque é de xx." e afins viram uma frase amigável (sem repetir a mensagem crua)
export function mensagemDeErroDoSaque(erro: unknown): string {
  const m = erro instanceof Error ? erro.message : "";
  if (/inv[aá]lido|menor que o permitido/i.test(m)) return "A Lytex recusou o valor. Confira o mínimo e o saldo na sua conta Lytex.";
  if (/m[aá]ximo|j[aá] sacou/i.test(m)) return "O valor passa do limite ou do saldo disponível na sua conta Lytex.";
  if (/lytex_http_403/.test(m)) return "A Lytex ainda não liberou saques nesta conta (documentos pendentes).";
  return "A Lytex não aceitou o saque agora. Nada foi sacado.";
}

export { reaisParaCentavos };
