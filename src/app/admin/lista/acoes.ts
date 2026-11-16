"use server";
// Admin marca o andamento do contato com um inscrito.
// O banco só deixa admin alterar, e só a coluna status_contato.
import { revalidatePath } from "next/cache";
import { STATUS_CONTATO } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function atualizarStatusContato(formData: FormData) {
  await exigirPapel("admin");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status_contato"));
  if (!Number.isInteger(id) || !STATUS_CONTATO.some((s) => s.valor === status)) return;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("waitlist").update({ status_contato: status }).eq("id", id);
  if (error) throw new Error(`Não foi possível salvar o status: ${error.message}`);
  revalidatePath("/admin/lista");
}
