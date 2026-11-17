"use server";
// Ações do produtor: dados da loja pública e decisão sobre afiliações manuais.
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { problemaNoSlug } from "@/lib/vitrine";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

export async function salvarLoja(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const valores = {
    loja_slug: texto(f, "loja_slug").toLowerCase(),
    loja_nome: texto(f, "loja_nome"),
    loja_descricao: texto(f, "loja_descricao"),
    loja_foto_path: texto(f, "loja_foto_path"),
  };
  const volta = (erro: string) => ({ erro, valores });

  const problema = problemaNoSlug(valores.loja_slug);
  if (problema) return volta(problema);
  if (valores.loja_nome.length < 2 || valores.loja_nome.length > 80) return volta("Informe o nome da loja (2 a 80 letras).");
  if (valores.loja_descricao.length > 500) return volta("A descrição pode ter até 500 letras.");

  const supabase = await criarClienteServidor();
  // a função confere que o cadastro é do usuário e que a foto está na pasta dele
  const { error } = await supabase.rpc("salvar_minha_loja", {
    p_slug: valores.loja_slug,
    p_nome: valores.loja_nome,
    p_descricao: valores.loja_descricao,
    p_foto: valores.loja_foto_path,
  });
  if (error) {
    if (error.code === "23505") return volta("Esse endereço já está em uso. Escolha outro.");
    if (error.code === "23514") return volta("Esse endereço não é permitido. Escolha outro.");
    if (error.message.includes("cadastro_inexistente")) return volta("Cadastre sua empresa antes de montar a loja.");
    if (error.message.includes("foto_fora_da_pasta")) return volta("Envie a foto de novo.");
    return volta("Não foi possível salvar a loja. Tente novamente.");
  }
  updateTag(ETIQUETA_VITRINES);
  redirect("/painel/produtor?loja=salva");
}

// Aprovar/recusar um pedido de afiliação (itens com "aprovo manualmente")
export async function decidirAfiliacaoAcao(f: FormData) {
  await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const aprovar = texto(f, "decisao") === "aprovar";
  const { error } = await supabase.rpc("decidir_afiliacao", { p_afiliacao: texto(f, "afiliacao_id"), p_aprovar: aprovar });
  updateTag(ETIQUETA_VITRINES);
  const msg = error ? "Não foi possível registrar a decisão." : aprovar ? "Afiliação aprovada." : "Afiliação recusada.";
  redirect(`/painel/produtor/afiliados?msg=${encodeURIComponent(msg)}`);
}
