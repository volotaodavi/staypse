// Qual provedor de pagamento está ativo: PAYMENTS_PROVIDER=mock|lytex.
// Padrão: simulador no computador; Lytex na Vercel (que, até a documentação
// oficial chegar, responde "integração pendente", nunca finge que pagou).
import "server-only";
import { lytex } from "./lytex";
import { mock } from "./mock";
import type { PaymentProvider } from "./tipos";

export function nomeDoProvedor(): "mock" | "lytex" {
  const escolhido = process.env.PAYMENTS_PROVIDER;
  if (escolhido === "mock" || escolhido === "lytex") return escolhido;
  return process.env.VERCEL === "1" ? "lytex" : "mock";
}

export function provedorPagamentos(): PaymentProvider {
  return nomeDoProvedor() === "lytex" ? lytex : mock;
}

export function provedorPorNome(nome: string): PaymentProvider | null {
  return nome === "mock" ? mock : nome === "lytex" ? lytex : null;
}

// a "página da Lytex" simulada (aprovar/recusar recebedor, pagar cobrança) nunca
// existe em produção, senão qualquer um aprovaria o próprio cadastro
export function simuladorAtivo(): boolean {
  return nomeDoProvedor() === "mock" && process.env.VERCEL_ENV !== "production";
}
