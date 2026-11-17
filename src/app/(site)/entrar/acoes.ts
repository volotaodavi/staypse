"use server";
// Ações do formulário de login (rodam no servidor).
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";
import { proximoSeguro } from "@/lib/redirecionamento";

function lerEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

// Login com e-mail + senha
export async function entrarComSenha(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const email = lerEmail(formData);
  const senha = String(formData.get("senha") ?? "");
  const valores = { email }; // devolvido para não apagar o e-mail digitado
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", valores };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { erro: "Confirme seu e-mail pelo link que enviamos antes de entrar.", valores };
    }
    if (error.code === "invalid_credentials") {
      return { erro: "E-mail ou senha incorretos.", valores };
    }
    if (error.status === 429) {
      return { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo.", valores };
    }
    return { erro: "Não foi possível entrar agora. Tente novamente.", valores };
  }

  redirect(proximoSeguro(formData.get("proximo")));
}

// Login sem senha: envia um link mágico por e-mail.
export async function enviarLinkMagico(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const email = lerEmail(formData);
  if (!email) return { erro: "Informe seu e-mail." };

  const proximo = proximoSeguro(formData.get("proximo"));
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Link mágico é só para quem JÁ tem conta: o cadastro exige o aceite
      // dos termos, que acontece no formulário de cadastro.
      shouldCreateUser: false,
      emailRedirectTo: `${urlDoSite()}/auth/confirmar?proximo=${encodeURIComponent(proximo)}`,
    },
  });

  if (error?.status === 429) {
    return { erro: "Muitos pedidos de link. Aguarde um minuto e tente de novo.", valores: { email } };
  }

  // Mesma resposta existindo ou não a conta: assim ninguém descobre
  // quais e-mails estão cadastrados.
  return {
    sucesso: `Se houver uma conta com ${email}, enviamos um link de acesso. Confira sua caixa de entrada.`,
  };
}
