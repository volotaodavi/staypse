"use server";
// Suspender e reativar usuário. O motivo é obrigatório nos dois sentidos e a
// função do banco grava o log com antes e depois.
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

const MENSAGENS: Record<string, string> = {
  nao_suspende_a_si: "Você não pode suspender a própria conta.",
  nao_suspende_admin: "Administradores não podem ser suspensos por aqui.",
  ja_suspenso: "Esta conta já está suspensa.",
  nao_suspenso: "Esta conta não está suspensa.",
  usuario_inexistente: "Usuário não encontrado.",
};

export async function suspenderUsuario(f: FormData) {
  await exigirPapel("admin");
  const suspender = texto(f, "acao") === "suspender";
  const motivo = texto(f, "motivo");
  const busca = texto(f, "busca");
  const volta = (msg: string, erro = false): never =>
    redirect(`/admin/usuarios?${new URLSearchParams({ ...(busca ? { busca } : {}), [erro ? "erro" : "msg"]: msg }).toString()}`);

  if (motivo.length < 5 || motivo.length > 500) volta("Escreva o motivo (de 5 a 500 letras).", true);
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("admin_suspender_usuario", { p_user: texto(f, "id"), p_suspender: suspender, p_motivo: motivo });
  if (error) {
    const chave = Object.keys(MENSAGENS).find((k) => error.message.includes(k));
    volta(chave ? MENSAGENS[chave] : "Não foi possível concluir.", true);
  }
  volta(suspender ? "Conta suspensa. A pessoa não acessa mais os painéis." : "Conta reativada.");
}
