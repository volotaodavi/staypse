"use server";
// Decisão do admin sobre uma denúncia (a função do banco confere se é admin e grava o log).
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
const voltar = (msg: string, erro = false): never =>
  redirect(`/admin/denuncias?${new URLSearchParams({ [erro ? "erro" : "msg"]: msg }).toString()}`);

export async function decidirDenuncia(f: FormData) {
  await exigirPapel("admin");
  const status = texto(f, "decisao");
  const nota = texto(f, "nota");
  if (status !== "procedente" && status !== "improcedente") voltar("Escolha procedente ou improcedente.", true);
  if (nota.length < 5 || nota.length > 1000) voltar("Escreva a nota da decisão (de 5 a 1000 letras).", true);
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("admin_decidir_denuncia", { p_id: texto(f, "id"), p_status: status, p_nota: nota });
  if (error?.message.includes("denuncia_ja_decidida")) voltar("Esta denúncia já foi decidida.", true);
  if (error) voltar("Não foi possível registrar a decisão.", true);
  voltar(status === "procedente" ? "Denúncia marcada como procedente." : "Denúncia marcada como improcedente.");
}
