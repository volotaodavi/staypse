"use server";
// Ações dos itens do produtor: salvar (rascunho ou enviar para análise),
// pausar/ativar e atualizar estoque. O banco garante as regras:
// comissão 10–70%, item completo para análise, edição de preço/comissão/
// descrição de item aprovado → volta para análise.
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { NICHOS } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { MAX_FOTOS, TIPOS_DIGITAIS, lerPreco, pendenciasItem, type DadosItem } from "@/lib/produtor";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
// "" → null; "12,5" → 12.5
const numero = (f: FormData, c: string) => {
  const t = texto(f, c).replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

function mensagemDeErro(m: string, dados: DadosItem): string {
  if (m.includes("items_comissao_faixa")) return "A comissão do revendedor deve ficar entre 10% e 70%.";
  if (m.includes("items_slug_por_loja")) return "Esse endereço já é usado por outro produto da sua loja.";
  if (m.includes("items_slug_check")) return "Endereço do produto inválido.";
  if (m.includes("items_completo_para_analise")) {
    return `Para enviar para análise, falta: ${pendenciasItem(dados).join("; ")}.`;
  }
  if (m.includes("items_link_acesso_check")) return "O link de acesso precisa começar com https://";
  if (m.includes("arquivo_fora_da_pasta")) return "Envie o arquivo digital de novo.";
  if (m.includes("items_fotos")) return `Use de 1 a ${MAX_FOTOS} fotos.`;
  if (m.includes("check constraint")) return "Confira os números (peso, medidas, estoque e prazo).";
  return "Não foi possível salvar o item. Tente novamente.";
}

export async function salvarItem(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: produtor } = await supabase.from("producers").select("id").eq("user_id", usuario.id).maybeSingle();
  if (!produtor) return { erro: "Complete o cadastro da empresa antes de criar itens." };

  const enviar = texto(f, "intencao") === "analise";
  const tipo = texto(f, "tipo") === "digital" ? "digital" : "fisico";

  // fotos: caminhos no storage, sempre da pasta do próprio usuário
  let fotos: string[] = [];
  try {
    fotos = (JSON.parse(texto(f, "fotos") || "[]") as unknown[]).map(String);
  } catch {
    return { erro: "Envie as fotos de novo." };
  }
  if (fotos.length > MAX_FOTOS || fotos.some((p) => !p.startsWith(`${usuario.id}/`))) {
    return { erro: `Use de 1 a ${MAX_FOTOS} fotos enviadas por você.` };
  }

  const preco = lerPreco(texto(f, "preco"));
  if (!texto(f, "nome")) return { erro: "Informe o nome do item." };
  if (!preco) return { erro: "Informe o preço. Ex.: 89,90" };
  const comissao = numero(f, "comissao_percentual");
  if (comissao === null || Number.isNaN(comissao)) return { erro: "Informe a comissão do revendedor em %." };

  const categoria = texto(f, "categoria");
  const tipoDigital = texto(f, "tipo_digital");

  const dados = {
    nome: texto(f, "nome"),
    descricao: texto(f, "descricao") || null,
    fotos,
    preco_centavos: preco,
    comissao_percentual: comissao,
    categoria: NICHOS.some((n) => n.valor === categoria) ? categoria : null,
    // afiliação: automática (entra na vitrine na hora) ou aprovada pelo produtor
    aprovacao_afiliacao: texto(f, "aprovacao_afiliacao") === "manual" ? "manual" : "automatica",
    tipo,
    declaracao_nf: f.get("declaracao_nf") === "sim",
    // físico (digital: tudo vazio; estoque vazio = ilimitado)
    estoque: tipo === "fisico" ? numero(f, "estoque") : null,
    peso_gramas: tipo === "fisico" ? numero(f, "peso_gramas") : null,
    altura_cm: tipo === "fisico" ? numero(f, "altura_cm") : null,
    largura_cm: tipo === "fisico" ? numero(f, "largura_cm") : null,
    comprimento_cm: tipo === "fisico" ? numero(f, "comprimento_cm") : null,
    prazo_postagem_dias: tipo === "fisico" ? numero(f, "prazo_postagem_dias") : null,
    retirada_local: tipo === "fisico" && f.get("retirada_local") === "sim",
    // digital
    tipo_digital: tipo === "digital" && TIPOS_DIGITAIS.some((t) => t.valor === tipoDigital) ? tipoDigital : null,
    arquivo_path: tipo === "digital" ? texto(f, "arquivo_path") || null : null,
    link_acesso: tipo === "digital" ? texto(f, "link_acesso") || null : null,
    instrucoes_pos_compra: tipo === "digital" ? texto(f, "instrucoes_pos_compra") || null : null,
  };
  if (Object.values(dados).some((v) => typeof v === "number" && Number.isNaN(v))) {
    return { erro: "Confira os números: use só algarismos (ex.: 150 ou 12,5)." };
  }

  // Antes de mandar para análise, avisa tudo o que falta de uma vez
  if (enviar) {
    const falta = pendenciasItem(dados);
    if (falta.length) return { erro: `Para enviar para análise, falta: ${falta.join("; ")}.` };
  }

  const id = texto(f, "id");
  if (!id) {
    const { error } = await supabase
      .from("items")
      .insert({ ...dados, producer_id: produtor.id, status_aprovacao: enviar ? "em_analise" : "rascunho" });
    if (error) return { erro: mensagemDeErro(error.message, dados) };
  } else {
    const { data: atual } = await supabase.from("items").select("status_aprovacao").eq("id", id).maybeSingle();
    if (!atual) return { erro: "Item não encontrado." };
    // só pede análise se estava em rascunho ou recusado; aprovado/pausado
    // volta sozinho para análise se mudar preço, comissão ou descrição
    const status =
      enviar && ["rascunho", "recusado"].includes(atual.status_aprovacao) ? { status_aprovacao: "em_analise" } : {};
    // endereço do produto (editável); vazio = mantém o atual
    const slug = texto(f, "slug").toLowerCase();
    if (slug && !/^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/.test(slug)) {
      return { erro: "Endereço do produto: use minúsculas, números e hífen (sem hífen no começo ou no fim)." };
    }
    const { error } = await supabase.from("items").update({ ...dados, ...status, ...(slug ? { slug } : {}) }).eq("id", id);
    if (error) return { erro: mensagemDeErro(error.message, dados) };
  }

  // item que voltou para análise sai das vitrines (cache público renovado na hora)
  updateTag(ETIQUETA_VITRINES);
  revalidatePath("/painel/produtor");
  redirect("/painel/produtor?item=salvo");
}

// Pausar (some das vitrines) / ativar de novo — só para itens já aprovados
export async function alternarPausa(f: FormData) {
  await exigirPapel("produtor");
  const id = texto(f, "id");
  const supabase = await criarClienteServidor();
  const { data: item } = await supabase.from("items").select("status_aprovacao").eq("id", id).maybeSingle();
  if (!item || !["aprovado", "pausado"].includes(item.status_aprovacao)) return;
  await supabase
    .from("items")
    .update({ status_aprovacao: item.status_aprovacao === "aprovado" ? "pausado" : "aprovado" })
    .eq("id", id);
  updateTag(ETIQUETA_VITRINES); // pausado some das vitrines na hora
  revalidatePath("/painel/produtor");
}

// Atualizar estoque (não pede nova análise)
export async function atualizarEstoque(f: FormData) {
  await exigirPapel("produtor");
  const estoque = Number(texto(f, "estoque"));
  if (!Number.isInteger(estoque) || estoque < 0) return;
  const supabase = await criarClienteServidor();
  await supabase.from("items").update({ estoque }).eq("id", texto(f, "id"));
  revalidatePath("/painel/produtor");
}
