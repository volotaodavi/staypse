// A nova tabela de taxas ainda não está em vigor? (aviso prévio de 30 dias; docs/precificacao.md, Decisão final)
export function vigenciaFutura(iso: string | null | undefined, agora: number = Date.now()): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t > agora;
}
