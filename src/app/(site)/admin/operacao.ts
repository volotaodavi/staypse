"use server";
// Ações do admin sobre pedidos (reembolso) e atendimentos (SAC/LGPD).
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
const voltar = (pagina: string, msg: string, erro = false): never =>
  redirect(`/admin/${pagina}?${new URLSearchParams({ [erro ? "erro" : "msg"]: msg }).toString()}`);

// Até a Etapa 6, o admin registra que a instituição de pagamento devolveu o valor
export async function concluirReembolso(f: FormData) {
  await exigirPapel("admin");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("concluir_reembolso", { p_order: texto(f, "pedido") });
  if (error) voltar("pedidos", "Não foi possível concluir: o pedido precisa estar em desistência.", true);
  voltar("pedidos", "Reembolso registrado.");
}

export async function responderAtendimentoAdmin(f: FormData) {
  await exigirPapel("admin");
  const resposta = texto(f, "resposta");
  if (resposta.length < 2 || resposta.length > 4000) voltar("atendimentos", "Escreva a resposta (até 4000 letras).", true);
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("responder_atendimento", {
    p_id: texto(f, "atendimento"),
    p_resposta: resposta,
    p_encerrar: f.get("encerrar") === "sim",
  });
  if (error) voltar("atendimentos", "Não foi possível responder.", true);
  voltar("atendimentos", "Resposta registrada.");
}
