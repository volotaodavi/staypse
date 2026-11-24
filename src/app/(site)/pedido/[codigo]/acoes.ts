"use server";
// Ações do comprador (sem conta): valem com o código + o token do link secreto.
// Tudo passa por funções do banco que conferem o token e as regras de prazo.
import { redirect } from "next/navigation";
import { emailAtivo, enviarEmail } from "@/lib/email";
import { emailDoLinkDoPedido } from "@/lib/email-conteudo";
import { hashDoIp } from "@/lib/ip";
import { cancelarCobrancaDoPedido, iniciarCobranca } from "@/lib/pagamentos/cobrancas";
import { mensagemDePagamento } from "@/lib/pagamentos/mensagens";
import { mensagemDeErro } from "@/lib/pedidos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/supabase/env";

const texto = (f: FormData, nome: string) => String(f.get(nome) ?? "").trim();

function voltar(codigo: string, token: string, msg: string, erro = false): never {
  const q = new URLSearchParams({ t: token, [erro ? "erro" : "msg"]: msg });
  redirect(`/pedido/${encodeURIComponent(codigo)}?${q.toString()}`);
}

function dadosDoPedido(f: FormData) {
  const codigo = texto(f, "codigo").toUpperCase();
  const token = texto(f, "token");
  if (!/^[A-Z0-9]{10}$/.test(codigo) || !/^[0-9a-f]{64}$/.test(token)) redirect("/pedido");
  return { codigo, token };
}

// CDC art. 49: desistir não exige justificativa (o motivo é opcional)
export async function desistir(f: FormData) {
  const { codigo, token } = dadosDoPedido(f);
  const { data, error } = await criarClienteAdmin().rpc("desistir_do_pedido", {
    p_codigo: codigo,
    p_token: token,
    p_motivo: texto(f, "motivo").slice(0, 1000) || null,
  });
  if (error) voltar(codigo, token, mensagemDeErro(error, "Não foi possível registrar a desistência. Tente de novo."), true);
  if (data === "cancelado") {
    // pedido cancelado antes de pagar: cancela também a cobrança no provedor (o Pix já gerado deixa de valer)
    const { data: p } = await criarClienteAdmin().from("orders").select("id").eq("codigo", codigo).maybeSingle();
    if (p?.id) await cancelarCobrancaDoPedido(p.id);
  }
  voltar(
    codigo,
    token,
    data === "cancelado"
      ? "Pedido cancelado. Nada foi cobrado."
      : "Desistência registrada. O valor total, inclusive o frete, será devolvido pela instituição de pagamento.",
  );
}

export async function confirmarRecebimento(f: FormData) {
  const { codigo, token } = dadosDoPedido(f);
  const { error } = await criarClienteAdmin().rpc("confirmar_recebimento", { p_codigo: codigo, p_token: token });
  if (error) voltar(codigo, token, mensagemDeErro(error, "Não foi possível confirmar o recebimento."), true);
  voltar(codigo, token, "Recebimento confirmado. Obrigado!");
}

// "Pagar agora": cria a cobrança no provedor (se ainda não existe) e leva à página de pagamento dele.
// O pagamento só é confirmado quando o PROVEDOR avisa (webhook ou conciliação), nunca por esta tela.
export async function iniciarPagamento(f: FormData) {
  const { codigo, token } = dadosDoPedido(f);
  const { data: pedido } = await criarClienteAdmin().rpc("pedido_do_comprador", { p_codigo: codigo, p_token: token });
  const id = (pedido as { id?: string } | null)?.id;
  if (!id) voltar(codigo, token, "Pedido não encontrado.", true);
  let destino: string | null = null;
  let falha = "";
  try {
    destino = (await iniciarCobranca(id, `${urlDoSite()}/pedido/${codigo}?t=${token}`)).url;
  } catch (e) {
    console.error("iniciarCobranca:", e instanceof Error ? e.message : e);
    falha = e instanceof Error && e.message.includes("pedido_nao_aguarda_pagamento") ? "Este pedido não está aguardando pagamento." : mensagemDePagamento(e);
  }
  if (destino) redirect(destino);
  voltar(codigo, token, falha || "A página de pagamento não está disponível agora. Tente de novo em alguns minutos.", true);
}

// Perdeu o link: código + e-mail geram um link novo, enviado SÓ ao e-mail da compra.
// A resposta é sempre a mesma (nunca confirma se o pedido existe) e o banco limita por IP e por código.
export async function recuperarLink(_anterior: { erro?: string; sucesso?: string } | undefined, f: FormData) {
  const codigo = texto(f, "codigo").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const email = texto(f, "email").toLowerCase();
  if (codigo.length !== 10 || !email.includes("@")) return { erro: "Confira o código (10 letras e números) e o e-mail usado na compra." };
  const { data: token } = await criarClienteAdmin().rpc("renovar_acesso_pedido", {
    p_codigo: codigo,
    p_email: email,
    p_ip_hash: await hashDoIp(),
  });
  if (token && emailAtivo()) {
    await enviarEmail({ para: email, ...emailDoLinkDoPedido({ codigo, link: `${urlDoSite()}/pedido/${codigo}?t=${token}` }) });
  }
  return {
    sucesso: emailAtivo()
      ? "Se o código e o e-mail baterem com um pedido, enviamos o link para esse e-mail. Confira também a caixa de spam."
      : "Se o código e o e-mail baterem com um pedido, o link será enviado ao e-mail da compra. Se não chegar, fale com a loja pelo atendimento.",
  };
}
