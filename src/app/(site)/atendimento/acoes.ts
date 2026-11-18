"use server";
// SAC: abre um atendimento com protocolo e prazo de resposta de 5 dias
// (Decreto 7.962/2013, art. 4º). Quem está logado fica ligado ao atendimento
// (vê em "Meus dados"); quem não está acompanha pelo link do protocolo.
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { ASSUNTOS_ATENDIMENTO } from "@/lib/pedidos";
import { usuarioAtual } from "@/lib/papeis";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

export async function abrirAtendimento(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const valores = {
    nome: texto(f, "nome"),
    email: texto(f, "email").toLowerCase(),
    assunto: texto(f, "assunto"),
    pedido: texto(f, "pedido").toUpperCase().replace(/[^A-Z0-9]/g, ""),
    mensagem: texto(f, "mensagem"),
  };
  const volta = (erro: string) => ({ erro, valores });
  if (texto(f, "site")) return { sucesso: "Recebido." }; // robô: descarta

  if (valores.nome.length < 2 || valores.nome.length > 120) return volta("Informe seu nome.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) return volta("Informe um e-mail válido para a resposta.");
  if (!Object.hasOwn(ASSUNTOS_ATENDIMENTO, valores.assunto)) return volta("Escolha o assunto.");
  if (valores.mensagem.length < 10) return volta("Conte um pouco mais (mínimo de 10 letras).");
  if (valores.mensagem.length > 4000) return volta("Mensagem longa demais (máximo de 4000 letras).");
  if (valores.pedido && valores.pedido.length !== 10) return volta("O código do pedido tem 10 letras e números.");

  const usuario = await usuarioAtual();
  const { data, error } = await criarClienteAdmin()
    .rpc("abrir_atendimento", {
      p_user: usuario?.id ?? null,
      p_nome: valores.nome,
      p_email: valores.email,
      p_assunto: valores.assunto,
      p_mensagem: valores.mensagem,
      p_pedido_codigo: valores.pedido || null,
    })
    .maybeSingle<{ protocolo: string; token: string }>();
  if (error || !data) return volta("Não foi possível registrar agora. Tente de novo em instantes.");
  redirect(`/atendimento/${data.protocolo}?t=${data.token}&novo=1`);
}
