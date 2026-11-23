// Resumo da lista de espera (tela e CSV usam a mesma consulta).
import type { Periodo } from "@/lib/periodo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Resumo = {
  total: number;
  no_periodo: number;
  por_perfil: { perfil: string; total: number }[];
  por_dia: { dia: string; revendedor: number; produtor: number; comprador: number; total: number }[];
  top_indicadores: { nome: string | null; codigo: string; perfil: string; indicacoes: number }[];
};

export const ROTULO_PERFIL: Record<string, string> = { revendedor: "Afiliado", produtor: "Loja", comprador: "Comprador" };

export async function buscarResumo(periodo: Periodo): Promise<Resumo> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_lista_espera_resumo", { p_inicio: periodo.inicio, p_fim: periodo.fim });
  if (error || !data) throw new Error(`Resumo da lista de espera indisponível: ${error?.message}`);
  return data as unknown as Resumo;
}
