"use server";
// Marcar notificações como lidas. A RLS só deixa a pessoa alterar as PRÓPRIAS
// (e só a coluna lida_em): o id vindo do formulário nunca dá acesso a aviso de outro.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const idSchema = z.uuid();

export async function marcarComoLida(formData: FormData) {
  await exigirPapel();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await criarClienteServidor();
  await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("id", id.data).is("lida_em", null);
  // o sino do cabeçalho (layout) também precisa atualizar
  revalidatePath("/painel", "layout");
}

export async function marcarTodasComoLidas() {
  const usuario = await exigirPapel();
  const supabase = await criarClienteServidor();
  await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("user_id", usuario.id).is("lida_em", null);
  revalidatePath("/painel", "layout");
}
