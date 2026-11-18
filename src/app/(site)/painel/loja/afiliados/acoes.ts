"use server";
// Bloquear/desbloquear afiliado: os links param de atribuir vendas novas na hora
// (o banco recusa a afiliação e o checkout confere de novo).
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function bloquearAfiliadoAcao(f: FormData) {
  await exigirPapel("produtor");
  const bloquear = f.get("bloquear") === "sim";
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("bloquear_afiliado", { p_afiliado: String(f.get("afiliado") ?? ""), p_bloquear: bloquear });
  updateTag(ETIQUETA_VITRINES); // a vitrine do afiliado deixa de mostrar os produtos da loja
  const msg = error ? "Não foi possível registrar." : bloquear ? "Afiliado bloqueado: os links dele não atribuem mais vendas." : "Afiliado desbloqueado.";
  redirect(`/painel/loja/afiliados?msg=${encodeURIComponent(msg)}`);
}
