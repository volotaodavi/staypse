// Pequenos utilitários do simulador de pagamentos (sem dependência de servidor).

// O simulador só devolve o comprador para o link do pedido (caminho do nosso site, com o
// token de 64 letras e números), nunca para um endereço qualquer vindo da URL.
export const VOLTA_VALIDA = /^\/pedido\/[A-Z0-9]{10}\?t=[0-9a-f]{64}(&novo=1)?$/;

// O simulador só liga com a bandeira EXPLÍCITA PAGAMENTO_SIMULADOR=1 (só no .env.local de desenvolvimento e teste) e
// fora de produção (NODE_ENV e VERCEL_ENV). Sem a bandeira, hospedagem fora da Vercel (VPS, Docker) nunca expõe a
// página que "paga" o próprio pedido. Falha fechada: qualquer outro valor desliga.
export function simuladorLiberado(env: Record<string, string | undefined> = process.env): boolean {
  return env.PAGAMENTO_SIMULADOR === "1" && env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
}
