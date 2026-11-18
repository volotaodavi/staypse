// Desempenho dos produtos da loja no período (função SQL; a tela e o CSV usam a mesma).
import type { Periodo } from "@/lib/periodo";
import { minhaLoja } from "../dados";

export type ProdutoDesempenho = {
  item_id: string;
  nome: string;
  slug: string;
  status_aprovacao: string;
  tipo: string;
  preco_centavos: number;
  cliques: number;
  vendas: number;
  unidades: number;
  faturamento_centavos: number;
};

export async function lerProdutosDaLoja(periodo: Periodo): Promise<ProdutoDesempenho[]> {
  const { supabase } = await minhaLoja();
  const { data, error } = await supabase.rpc("painel_loja_produtos", { p_inicio: periodo.inicio, p_fim: periodo.fim });
  if (error) throw new Error(`Produtos indisponíveis: ${error.message}`);
  return (data ?? []) as ProdutoDesempenho[];
}
