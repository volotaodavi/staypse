// Meios de pagamento ligados pelo admin (configuracoes.meios_pagamento). Só servidor.
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Meio } from "./parcelas";

export async function meiosAtivos(): Promise<Record<Meio, boolean>> {
  const { data } = await criarClienteAdmin().from("configuracoes").select("valor").eq("chave", "meios_pagamento").maybeSingle();
  const v = (data?.valor ?? {}) as Partial<Record<Meio, boolean>>;
  // sem configuração legível, nada trava: os três ficam ligados
  return { pix: v.pix !== false, boleto: v.boleto !== false, cartao: v.cartao !== false };
}
