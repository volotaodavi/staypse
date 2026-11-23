"use server";
// Bloquear/desbloquear afiliado: os links param de atribuir vendas novas na hora
// (o banco recusa a afiliação e o checkout confere de novo).
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { urlDoSite } from "@/lib/supabase/env";
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

// ---------- convite de afiliação por produto ----------
// A loja gera um link para UM produto; quem abre (e é afiliado com cadastro de
// recebimento aprovado) entra já aprovado. No banco fica só o hash do código,
// por isso o link aparece uma única vez, logo após gerar.
const ERROS_CONVITE: Record<string, string> = {
  item_indisponivel: "Escolha um produto aprovado da sua loja.",
  validade_invalida: "A validade do convite deve ficar entre 1 e 90 dias.",
};

export async function criarConviteAfiliacao(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const item = String(f.get("item_id") ?? "");
  const supabase = await criarClienteServidor();
  const { data: token, error } = await supabase.rpc("criar_convite_afiliacao", { p_item: item, p_dias: 30 });
  if (error || typeof token !== "string") {
    const chave = Object.keys(ERROS_CONVITE).find((k) => (error?.message ?? "").includes(k));
    return { erro: chave ? ERROS_CONVITE[chave] : "Não foi possível gerar o convite. Tente novamente.", valores: { item_id: item } };
  }
  revalidatePath("/painel/loja/afiliados");
  return { sucesso: `${urlDoSite()}/afiliar/${token}`, valores: { item_id: item } };
}

export async function revogarConviteAfiliacao(f: FormData) {
  await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("revogar_convite_afiliacao", { p_convite: String(f.get("convite_id") ?? "") });
  const msg = error ? "Não foi possível revogar o convite." : "Convite revogado: o link não funciona mais.";
  redirect(`/painel/loja/afiliados?msg=${encodeURIComponent(msg)}`);
}
