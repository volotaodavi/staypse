"use server";
// Cadastro de conta nova. O aceite dos termos é OBRIGATÓRIO (regra 7):
// a versão vai junto e o banco grava o aceite com a data do servidor
// (gatilho handle_new_user na migração).
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { TERMOS_VERSAO } from "@/config/empresa";
import { proximoSeguro } from "@/lib/redirecionamento";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";

const PAPEIS_PERMITIDOS = ["produtor", "revendedor"] as const;

export async function cadastrar(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  // só aceita os papéis da lista (admin nunca vem do formulário)
  const papeis = formData
    .getAll("papeis")
    .map(String)
    .filter((p): p is (typeof PAPEIS_PERMITIDOS)[number] =>
      (PAPEIS_PERMITIDOS as readonly string[]).includes(p),
    );
  const aceitou = formData.get("aceite") === "sim";
  // devolvido em caso de erro para não apagar o que foi digitado (nunca a senha)
  const valores = { nome, email, papeis: papeis.join(",") };

  // Validações (o banco valida de novo — nunca confiamos só no navegador)
  if (nome.length < 2) return { valores, erro: "Informe seu nome." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { valores, erro: "Informe um e-mail válido." };
  if (senha.length < 8) return { valores, erro: "A senha precisa ter pelo menos 8 caracteres." };
  // depois de confirmar o e-mail, volta para cá (só caminhos internos)
  const proximo = proximoSeguro(formData.get("proximo"));
  const convite = proximo.startsWith("/convite/");
  if (papeis.length === 0 && !convite) return { valores, erro: "Escolha se quer ser produtor, revendedor ou os dois." };
  if (!aceitou) return { valores, erro: "Para criar a conta é preciso aceitar os Termos e a Política de Privacidade." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, papeis, termos_versao: TERMOS_VERSAO },
      emailRedirectTo: `${urlDoSite()}/auth/confirmar?proximo=${encodeURIComponent(proximo)}`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { valores, erro: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números." };
    }
    if (error.status === 429) {
      return { valores, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    }
    return { valores, erro: "Não foi possível criar a conta agora. Tente novamente." };
  }

  // Se a confirmação de e-mail estiver desligada, já entra direto.
  if (data.session) redirect(proximo);

  return {
    sucesso: `Quase lá! Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`,
  };
}
