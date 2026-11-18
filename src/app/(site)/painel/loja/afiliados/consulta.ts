// Desempenho por afiliado no período (função SQL; tela e CSV). Sem contato pessoal.
import type { Periodo } from "@/lib/periodo";
import { minhaLoja } from "../dados";

export type AfiliadoDesempenho = {
  afiliado_id: string;
  vitrine_nome: string | null;
  vitrine_slug: string | null;
  itens_aprovados: number;
  itens_pendentes: number;
  bloqueado: boolean;
  cliques: number;
  vendas: number;
  faturamento_centavos: number;
  comissao_centavos: number;
};

export async function lerAfiliadosDaLoja(periodo: Periodo): Promise<AfiliadoDesempenho[]> {
  const { supabase } = await minhaLoja();
  const { data, error } = await supabase.rpc("painel_loja_afiliados", { p_inicio: periodo.inicio, p_fim: periodo.fim });
  if (error) throw new Error(`Afiliados indisponíveis: ${error.message}`);
  return (data ?? []) as AfiliadoDesempenho[];
}
