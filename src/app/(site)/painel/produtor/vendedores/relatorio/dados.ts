// Linhas do relatório mensal de comissões (função relatorio_comissoes no banco:
// só a própria loja consegue ler). Usado pelo CSV e pela versão para imprimir.
import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type LinhaRelatorio = {
  nome: string | null;
  email: string;
  arroba: string | null;
  forma_pagamento: string;
  comissao_percentual: number;
  status: string;
  cliques: number;
  pedidos: number;
  vendido_centavos: number;
  comissao_centavos: number;
};

// Mês atual no horário de Brasília ("2026-11"), não em UTC
export function mesAtualBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date());
}

// "2026-11" → aceito; inválido → mês atual
export function mesDoParametro(mes: unknown): string {
  return typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : mesAtualBrasil();
}

export async function lerRelatorio(mes: string): Promise<LinhaRelatorio[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("relatorio_comissoes", { p_mes: `${mes}-01` });
  return (data ?? []) as LinhaRelatorio[];
}

export const FORMA_RELATORIO: Record<string, string> = {
  folha: "Folha (loja paga)",
  split_direto: "Split direto",
};
