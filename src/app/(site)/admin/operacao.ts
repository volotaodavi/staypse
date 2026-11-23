"use server";
// Ações do admin sobre pedidos (reembolso) e atendimentos (SAC/LGPD).
import { redirect } from "next/navigation";
import { solicitarEstorno } from "@/lib/pagamentos/cobrancas";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
const voltar = (pagina: string, msg: string, erro = false): never =>
  redirect(`/admin/${pagina}?${new URLSearchParams({ [erro ? "erro" : "msg"]: msg }).toString()}`);

// Reembolso: o admin PEDE o estorno ao provedor de pagamento e o pedido só vira "reembolsado" quando
// o provedor CONFIRMAR (webhook; no simulador, pelo botão "Confirmar estorno"). A Staypse não devolve
// dinheiro: quem devolve é a instituição de pagamento. Pedido antigo, sem cobrança no provedor, ainda
// pode ser registrado à mão (função concluir_reembolso).
export async function concluirReembolso(f: FormData) {
  const admin = await exigirPapel("admin");
  const pedido = texto(f, "pedido");
  const supabase = await criarClienteServidor();
  const { data: p } = await supabase.from("orders").select("status, cobranca_id").eq("id", pedido).maybeSingle();
  if (p?.status !== "em_reembolso") return voltar("pedidos", "Não foi possível concluir: o pedido precisa estar em desistência.", true);

  if (!p.cobranca_id) {
    const { error } = await supabase.rpc("concluir_reembolso", { p_order: pedido });
    if (error) return voltar("pedidos", "Não foi possível concluir: o pedido precisa estar em desistência.", true);
    return voltar("pedidos", "Reembolso registrado.");
  }

  let mensagem = "";
  try {
    const { confirmado } = await solicitarEstorno(pedido, admin.id);
    mensagem = confirmado
      ? "Reembolso confirmado pela instituição de pagamento."
      : "Estorno solicitado à instituição de pagamento. O pedido será marcado como reembolsado quando ela confirmar.";
  } catch (e) {
    console.error("solicitarEstorno:", e instanceof Error ? e.message : e);
    const pendente = e instanceof Error && e.name === "IntegracaoPendente";
    return voltar("pedidos", pendente ? "A integração com a instituição de pagamento ainda não está pronta para estornar." : "Não foi possível solicitar o estorno agora. Tente de novo.", true);
  }
  voltar("pedidos", mensagem);
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
