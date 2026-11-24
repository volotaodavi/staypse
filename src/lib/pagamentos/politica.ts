// Leituras do servidor para o checkout: taxas EM VIGOR (a tabela anterior vale até a vigência) e a política de
// parcelas da loja. Só servidor (service_role); o comprador nunca recebe taxa, só parcelas e totais.
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { politicaDoBanco, type PoliticaParcelas } from "./juros";
import { lerTaxasPlataforma, type TaxasPlataforma } from "./taxas";

export async function taxasVigentes(): Promise<TaxasPlataforma> {
  const { data, error } = await criarClienteAdmin().rpc("taxas_vigentes");
  if (error) throw new Error("taxas_nao_configuradas");
  return lerTaxasPlataforma(data as Record<string, unknown>);
}

export async function politicaParcelasDoItem(itemId: string): Promise<PoliticaParcelas> {
  const { data } = await criarClienteAdmin().rpc("politica_parcelas_item", { p_item: itemId }).maybeSingle();
  return politicaDoBanco(data);
}
