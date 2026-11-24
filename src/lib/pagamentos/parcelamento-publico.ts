// Política de parcelas da loja para a PÁGINA DO PRODUTO ("até Nx sem juros"). Dado público (a loja decide e o comprador
// vê), lido com a chave pública pela função politica_parcelas_item. Cacheado com a etiqueta das vitrines: ao salvar o
// parcelamento, o painel da loja invalida essa etiqueta.
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { supabaseChavePublica, supabaseUrl } from "@/lib/supabase/env";
import { politicaDoBanco, type PoliticaParcelas } from "./juros";

export async function buscarPoliticaParcelas(itemId: string): Promise<PoliticaParcelas> {
  "use cache";
  cacheLife("minutes");
  cacheTag(ETIQUETA_VITRINES);
  const publico = createClient(supabaseUrl(), supabaseChavePublica(), { auth: { persistSession: false } });
  const { data } = await publico.rpc("politica_parcelas_item", { p_item: itemId }).maybeSingle();
  return politicaDoBanco(data);
}
