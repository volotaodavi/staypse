"use server";
// Vendedores próprios da loja: convidar, mudar comissão/forma de pagamento,
// desativar/reativar. As regras ficam no banco (funções convidar_vendedor,
// atualizar_vendedor, definir_status_vendedor), que também grava o histórico.
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
const percentual = (f: FormData) => Number(texto(f, "comissao_percentual").replace(",", "."));

const ERROS: Record<string, string> = {
  declaracao_obrigatoria: 'Para "split direto", marque a declaração de que o vendedor não é seu empregado.',
  ja_vinculado: "Esta pessoa já é (ou já foi) vendedora da sua loja. Reative-a na lista.",
  cadastro_inexistente: "Cadastre sua empresa antes de convidar vendedores.",
  vendedor_nao_encontrado: "Vendedor não encontrado.",
  loja_vendedores_comissao_percentual_check: "A comissão deve ficar entre 0,01% e 90%.",
  loja_vendedores_email_check: "E-mail inválido.",
};
const mensagem = (m: string) => ERROS[Object.keys(ERROS).find((k) => m.includes(k)) ?? ""] ?? "Não foi possível salvar. Tente novamente.";

export async function convidarVendedor(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const valores = {
    email: texto(f, "email").toLowerCase(),
    comissao_percentual: texto(f, "comissao_percentual"),
    forma_pagamento: texto(f, "forma_pagamento") === "split_direto" ? "split_direto" : "folha",
  };
  const declaracao = f.get("declaracao_nao_empregado") === "sim";
  const volta = (erro: string) => ({ erro, valores });

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) return volta("Informe o e-mail do vendedor.");
  const pct = percentual(f);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 90) return volta("Informe a comissão em % (ex.: 10).");
  if (valores.forma_pagamento === "split_direto" && !declaracao) return volta(ERROS.declaracao_obrigatoria);

  const supabase = await criarClienteServidor();
  const { data: token, error } = await supabase.rpc("convidar_vendedor", {
    p_email: valores.email,
    p_comissao: pct,
    p_forma: valores.forma_pagamento,
    p_declaracao: declaracao,
  });
  if (error || typeof token !== "string") return volta(mensagem(error?.message ?? ""));
  // o link só aparece agora (no banco fica só o hash dele)
  return { sucesso: `${urlDoSite()}/convite/${token}`, valores: { email: valores.email } };
}

export async function atualizarVendedor(f: FormData) {
  await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_vendedor", {
    p_vendedor: texto(f, "vendedor_id"),
    p_comissao: percentual(f),
    p_forma: texto(f, "forma_pagamento") === "split_direto" ? "split_direto" : "folha",
    p_declaracao: f.get("declaracao_nao_empregado") === "sim",
  });
  voltar(error ? mensagem(error.message) : "Vendedor atualizado.", Boolean(error));
}

export async function alternarVendedor(f: FormData) {
  await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const ativar = texto(f, "acao") === "ativar";
  const { error } = await supabase.rpc("definir_status_vendedor", { p_vendedor: texto(f, "vendedor_id"), p_ativo: ativar });
  updateTag(ETIQUETA_VITRINES); // vitrine do vendedor mostra/esconde os produtos da loja
  voltar(error ? mensagem(error.message) : ativar ? "Vendedor reativado." : "Vendedor desativado. Os links dele não registram novas indicações.", Boolean(error));
}

function voltar(msg: string, erro: boolean): never {
  redirect(`/painel/produtor/vendedores?msg=${encodeURIComponent(msg)}${erro ? "&tipo=erro" : ""}`);
}
