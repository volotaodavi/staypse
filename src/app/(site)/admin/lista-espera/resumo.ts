// Resumo da lista de espera (tela e CSV usam a mesma consulta).
import { ROTULO_PERFIL } from "@/lib/lista";
import type { Periodo } from "@/lib/periodo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Resumo = {
  total: number;
  no_periodo: number;
  por_perfil: { perfil: string; total: number }[];
  por_dia: { dia: string; loja: number; vendedor: number; afiliado: number; comprador: number; total: number }[];
  top_indicadores: { nome: string | null; codigo: string; perfil: string; indicacoes: number }[];
};

// Rótulos dos perfis (os mesmos do formulário da lista)
export { ROTULO_PERFIL };

export async function buscarResumo(periodo: Periodo): Promise<Resumo> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_lista_espera_resumo", { p_inicio: periodo.inicio, p_fim: periodo.fim });
  if (error || !data) throw new Error(`Resumo da lista de espera indisponível: ${error?.message}`);
  return data as unknown as Resumo;
}
