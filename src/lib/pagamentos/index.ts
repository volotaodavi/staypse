// Qual provedor de pagamento está ativo: PAYMENTS_PROVIDER=mock|lytex.
// Padrão: simulador no computador de desenvolvimento; Lytex na Vercel e em qualquer NODE_ENV=production (que, até a documentação
// oficial chegar, responde "integração pendente", nunca finge que pagou).
import "server-only";
import { lytex } from "./lytex";
import { mock } from "./mock";
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

// a "página da Lytex" simulada (aprovar/recusar recebedor, pagar cobrança) nunca
// existe em produção, senão qualquer um aprovaria o próprio cadastro. FALHA FECHADA: além do provedor mock e de
// não ser produção, exige a bandeira explícita PAGAMENTO_SIMULADOR=1 (só no .env.local de desenvolvimento/teste).
// Hospedagem fora da Vercel (VPS, Docker) com NODE_ENV=production nunca liga o simulador por esquecimento.
export function simuladorLiberado(env: Record<string, string | undefined> = process.env): boolean {
  return (
    env.PAGAMENTO_SIMULADOR === "1" &&
    env.NODE_ENV !== "production" &&
    env.VERCEL_ENV !== "production"
  );
}

export function simuladorAtivo(): boolean {
  return nomeDoProvedor() === "mock" && simuladorLiberado();
}
