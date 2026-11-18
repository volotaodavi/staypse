// Ranking dos vendedores próprios no período (função SQL; tela e CSV).
import type { Periodo } from "@/lib/periodo";
import { minhaLoja } from "../dados";

export const FORMA_VENDEDOR: Record<string, string> = { folha: "Na folha", split_direto: "Split direto" };

export type VendedorRanking = {
  vendedor_id: string;
  nome: string | null;
  arroba: string | null;
  comissao_percentual: number;
  forma_pagamento: string;
  status: string;
  cliques: number;
  vendas: number;
  faturamento_centavos: number;
  comissao_centavos: number;
};

export async function lerVendedoresDaLoja(periodo: Periodo): Promise<VendedorRanking[]> {
  const { supabase } = await minhaLoja();
  const { data, error } = await supabase.rpc("painel_loja_vendedores", { p_inicio: periodo.inicio, p_fim: periodo.fim });
  if (error) throw new Error(`Vendedores indisponíveis: ${error.message}`);
  return (data ?? []) as VendedorRanking[];
}
