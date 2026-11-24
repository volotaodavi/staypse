// Qual provedor de pagamento está ativo: PAYMENTS_PROVIDER=mock|lytex.
// Padrão: simulador no computador de desenvolvimento; Lytex na Vercel e em qualquer NODE_ENV=production (que, até a documentação
// oficial chegar, responde "integração pendente", nunca finge que pagou).
import "server-only";
import { lytex } from "./lytex";
import { mock } from "./mock";
import { simuladorLiberado } from "./simulador";
import type { PaymentProvider } from "./tipos";

export function nomeDoProvedor(): "mock" | "lytex" {
  const escolhido = process.env.PAYMENTS_PROVIDER;
  if (escolhido === "mock" || escolhido === "lytex") return escolhido;
  // sem escolha explícita, só o computador de desenvolvimento usa o simulador (hospedagem de produção cai na Lytex)
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production" ? "lytex" : "mock";
}

export function provedorPagamentos(): PaymentProvider {
  return nomeDoProvedor() === "lytex" ? lytex : mock;
}

export function provedorPorNome(nome: string): PaymentProvider | null {
  return nome === "mock" ? mock : nome === "lytex" ? lytex : null;
}

// a "página da Lytex" simulada (aprovar/recusar recebedor, pagar cobrança) nunca existe em produção, senão qualquer
// um aprovaria o próprio cadastro. FALHA FECHADA: provedor mock + bandeira explícita PAGAMENTO_SIMULADOR=1 + fora de
// produção (regra em simulador.ts, testada).
export function simuladorAtivo(): boolean {
  return nomeDoProvedor() === "mock" && simuladorLiberado();
}
