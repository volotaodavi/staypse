"use server";
// Aceitar o convite de vendedor próprio. O banco confere que o e-mail da conta
// logada é o mesmo do convite, que o convite vale e ainda não foi usado.
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { problemaNoSlug } from "@/lib/vitrine";

const ERROS: Record<string, string> = {
  convite_invalido: "Este convite não vale mais (já foi usado ou foi trocado por um novo).",
  convite_expirado: "Este convite expirou. Peça um novo para a loja.",
  email_diferente: "Este convite é para outro e-mail (ou o seu e-mail ainda não foi confirmado). Entre com a conta do e-mail convidado.",
  convite_propria_loja: "Você é o dono desta loja.",
};

export async function aceitarConvite(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel();
  const token = String(f.get("token") ?? "");
  const slug = String(f.get("slug") ?? "").trim().toLowerCase();
  const temVitrine = f.get("tem_vitrine") === "sim";
  if (!temVitrine) {
    const problema = problemaNoSlug(slug);
    if (problema) return { erro: problema, valores: { slug } };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("aceitar_convite", { p_token: token, p_slug: slug || "x" });
  if (error) {
    if (error.code === "23505") return { erro: "Esse @ já está em uso. Escolha outro.", valores: { slug } };
    if (error.code === "23514") return { erro: "Esse @ não é permitido. Escolha outro.", valores: { slug } };
    const chave = Object.keys(ERROS).find((k) => error.message.includes(k));
    return { erro: chave ? ERROS[chave] : "Não foi possível aceitar o convite. Tente novamente.", valores: { slug } };
  }
  // os produtos da loja entram na vitrine do vendedor: renova o cache público
  updateTag(ETIQUETA_VITRINES);
  redirect("/painel/vendedor");
}
