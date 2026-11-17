"use server";
// Ações do cadastro do produtor em passos. Cada passo grava e leva ao próximo.
// O banco valida tudo de novo (CNPJ, formato, quem pode editar e quando).
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { CONTRATO_PRODUTOR_VERSAO } from "@/config/empresa";
import { UFS, normalizarCnpj, normalizarWhatsapp } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, campo: string) => String(f.get(campo) ?? "").trim();

// Traduz erros do banco para mensagens claras
function mensagemDeErro(erro: { code?: string; message: string }): string {
  const m = erro.message;
  if (m.includes("producers_cnpj_check")) return "CNPJ inválido. Confira os números (e letras, se for CNPJ alfanumérico).";
  if (m.includes("producers_cnpj_key")) return "Este CNPJ já está cadastrado na Staypse.";
  if (m.includes("inscricao_estadual")) return "Inscrição estadual: use só números, ou escreva ISENTO.";
  if (m.includes("email_contato")) return "E-mail de contato inválido.";
  if (m.includes("cep")) return "CEP inválido (8 números).";
  if (m.includes("documento_fora_da_pasta")) return "Envie o documento de novo.";
  if (m.includes("contrato_nao_aceito")) return "Aceite o Contrato do Produtor antes de enviar.";
  if (m.includes("producers_cadastro_completo")) return "Ainda faltam dados. Confira a lista abaixo.";
  if (m.includes("status_nao_permite_envio")) return "Seu cadastro já está em análise ou aprovado.";
  if (erro.code === "42501") return "Seu cadastro está em análise ou aprovado e não pode ser alterado agora.";
  return "Não foi possível salvar. Tente novamente.";
}

// Grava no cadastro: cria na primeira vez, atualiza nas seguintes.
async function gravar(dados: Record<string, unknown>): Promise<string | null> {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: atual } = await supabase.from("producers").select("id").eq("user_id", usuario.id).maybeSingle();

  if (!atual) {
    const { error } = await supabase.from("producers").insert({ user_id: usuario.id, ...dados });
    return error ? mensagemDeErro(error) : null;
  }
  const { data, error } = await supabase.from("producers").update(dados).eq("id", atual.id).select("id");
  if (error) return mensagemDeErro(error);
  if (!data?.length) return "Seu cadastro está em análise ou aprovado e não pode ser alterado agora.";
  return null;
}

// Passo 1 — Empresa
export async function salvarEmpresa(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const razao_social = texto(f, "razao_social");
  const cnpj = normalizarCnpj(texto(f, "cnpj"));
  const ieDigitada = texto(f, "inscricao_estadual").toUpperCase();
  const inscricao_estadual = ieDigitada === "ISENTO" ? "ISENTO" : ieDigitada.replace(/\D/g, "") || null;
  const whatsapp = normalizarWhatsapp(texto(f, "whatsapp"));
  const email_contato = texto(f, "email_contato").toLowerCase();

  if (razao_social.length < 2) return { erro: "Informe a razão social." };
  if (cnpj.length !== 14) return { erro: "CNPJ incompleto: são 14 caracteres." };
  if (!whatsapp) return { erro: "Informe um WhatsApp com DDD." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email_contato)) return { erro: "Informe um e-mail válido." };

  const erro = await gravar({ razao_social, cnpj, inscricao_estadual, whatsapp, email_contato });
  if (erro) return { erro };
  redirect("/painel/produtor/cadastro?passo=2");
}

// Passo 2 — Endereço de envio
export async function salvarEndereco(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const cep = texto(f, "cep").replace(/\D/g, "");
  const uf = texto(f, "uf");
  if (cep.length !== 8) return { erro: "CEP precisa ter 8 números." };
  if (!(UFS as readonly string[]).includes(uf)) return { erro: "Escolha o estado (UF)." };
  for (const [campo, nome] of [["logradouro", "a rua"], ["numero", "o número"], ["bairro", "o bairro"], ["cidade", "a cidade"]]) {
    if (!texto(f, campo)) return { erro: `Informe ${nome}.` };
  }

  const erro = await gravar({
    cep,
    logradouro: texto(f, "logradouro"),
    numero: texto(f, "numero"),
    complemento: texto(f, "complemento") || null,
    bairro: texto(f, "bairro"),
    cidade: texto(f, "cidade"),
    uf,
  });
  if (erro) return { erro };
  redirect("/painel/produtor/cadastro?passo=3");
}

// Passo 3 — Documentos (os arquivos já foram enviados ao bucket privado;
// aqui só gravamos os caminhos)
export async function salvarDocumentos(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const documento_path = texto(f, "documento_path");
  const documento_responsavel_path = texto(f, "documento_responsavel_path");
  if (!documento_path) return { erro: "Envie o contrato social ou cartão CNPJ." };
  if (!documento_responsavel_path) return { erro: "Envie o documento com foto do responsável." };

  const erro = await gravar({ documento_path, documento_responsavel_path });
  if (erro) return { erro };
  redirect("/painel/produtor/cadastro?passo=4");
}

// Passo 4 — Aceite do Contrato do Produtor (versão + data do servidor)
export async function aceitarContrato(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  if (f.get("aceite") !== "sim") return { erro: "Marque que leu e aceita o Contrato do Produtor." };
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("terms_acceptances")
    .insert({ user_id: usuario.id, documento: "termos_produtor", versao: CONTRATO_PRODUTOR_VERSAO });
  if (error) return { erro: "Não foi possível registrar o aceite. Tente novamente." };
  redirect("/painel/produtor/cadastro?passo=5");
}

// Passo 5 — Enviar para análise
export async function enviarParaAnalise(): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("enviar_produtor_para_analise");
  if (error) return { erro: mensagemDeErro(error) };
  redirect("/painel/produtor?enviado=1");
}
