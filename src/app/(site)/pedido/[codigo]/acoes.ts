"use server";
// Ações do comprador (sem conta): valem com o código + o token do link secreto.
// Tudo passa por funções do banco que conferem o token e as regras de prazo.
import { redirect } from "next/navigation";
import { mensagemDeErro, pagamentoSimulado } from "@/lib/pedidos";
import { criarClienteAdmin } from "@/lib/supabase/admin";

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

// SÓ em teste local (PAGAMENTO_SIMULADO=1): faz o papel do aviso da Lytex
export async function simularPagamento(f: FormData) {
  const { codigo, token } = dadosDoPedido(f);
  if (!pagamentoSimulado()) voltar(codigo, token, "Pagamento simulado desligado.", true);
  const admin = criarClienteAdmin();
  const { data: pedido } = await admin.rpc("pedido_do_comprador", { p_codigo: codigo, p_token: token });
  const id = (pedido as { id?: string } | null)?.id;
  if (!id) voltar(codigo, token, "Pedido não encontrado.", true);
  const { error } = await admin.rpc("confirmar_pagamento", { p_order: id });
  if (error) voltar(codigo, token, "Este pedido não está aguardando pagamento.", true);
  voltar(codigo, token, "Pagamento confirmado (simulação de teste).");
}

// Perdeu o link: código + e-mail geram um link novo
export async function recuperarLink(_anterior: { erro?: string } | undefined, f: FormData) {
  const codigo = texto(f, "codigo").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const email = texto(f, "email").toLowerCase();
  if (codigo.length !== 10 || !email.includes("@")) return { erro: "Confira o código (10 letras e números) e o e-mail usado na compra." };
  const { data: token } = await criarClienteAdmin().rpc("renovar_acesso_pedido", { p_codigo: codigo, p_email: email });
  if (!token) return { erro: "Não encontramos um pedido com esse código e e-mail." };
  redirect(`/pedido/${codigo}?t=${token}`);
}
