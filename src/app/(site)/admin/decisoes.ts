"use server";
// Decisões do admin sobre produtores e itens. Cada uma chama uma função do
// banco que confere se é admin e grava o log de auditoria na mesma operação.
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

const MENSAGENS: Record<string, string> = {
  recebedor_pendente: "A loja ainda não tem cadastro de recebimento aprovado na Lytex: o produto não pode ser aprovado.",
  motivo_obrigatorio: "Escreva o motivo da recusa (pelo menos 5 caracteres).",
  produtor_nao_esta_em_analise: "Este produtor não está mais em análise.",
  item_nao_esta_em_analise: "Este item não está mais em análise.",
  produtor_nao_aprovado: "Aprove o produtor antes de aprovar o item.",
  apenas_admin: "Apenas administradores.",
};

// Volta para a mesma tela com uma mensagem (?msg=)
function voltar(caminho: string, erro: { message: string } | null, sucesso: string): never {
  const chave = erro ? Object.keys(MENSAGENS).find((k) => erro.message.includes(k)) : null;
  const msg = erro ? (chave ? MENSAGENS[chave] : "Não foi possível concluir.") : sucesso;
  // aprovar/recusar muda o que aparece nas vitrines e lojas públicas (cache)
  if (!erro) updateTag(ETIQUETA_VITRINES);
  revalidatePath(caminho);
  redirect(`${caminho}?msg=${encodeURIComponent(msg)}${erro ? "&tipo=erro" : ""}`);
}

export async function decidirProdutor(f: FormData) {
  await exigirPapel("admin");
  const aprovar = texto(f, "decisao") === "aprovar";
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("admin_decidir_produtor", {
    p_producer: texto(f, "id"),
    p_aprovar: aprovar,
    p_motivo: aprovar ? null : texto(f, "motivo"),
  });
  voltar("/admin/produtores", error, aprovar ? "Loja aprovada." : "Loja recusada. O motivo aparece para ela.");
}

export async function decidirItem(f: FormData) {
  await exigirPapel("admin");
  const aprovar = texto(f, "decisao") === "aprovar";
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("admin_decidir_item", {
    p_item: texto(f, "id"),
    p_aprovar: aprovar,
    p_motivo: aprovar ? null : texto(f, "motivo"),
  });
  voltar("/admin/itens", error, aprovar ? "Item aprovado: já aparece para revendedores." : "Item recusado. O motivo aparece para o produtor.");
}
