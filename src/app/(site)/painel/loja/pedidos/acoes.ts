"use server";
// Ações da loja sobre pedidos e frete. Tudo com o cliente da PRÓPRIA pessoa
// (RLS): o banco só deixa mexer em pedido pago da própria loja e exige a
// nota fiscal antes de marcar envio/entrega (regra 2).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { lerPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
const voltar = (msg: string, erro = false, codigo?: string): never =>
  redirect(
    `/painel/loja/pedidos${codigo ? `/${codigo}` : ""}?${new URLSearchParams({ [erro ? "erro" : "msg"]: msg }).toString()}`,
  );

// ---------- frete da loja ----------
export async function salvarFrete(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const valores = { fixo: texto(f, "fixo"), gratis: texto(f, "gratis"), prazo: texto(f, "prazo"), envia: texto(f, "envia") };
  const volta = (erro: string) => ({ erro, valores });

  let fixo: number | null = null;
  let gratis: number | null = null;
  let prazo: number | null = null;
  if (valores.envia === "sim") {
    fixo = /^0+([,.]0+)?$/.test(valores.fixo) ? 0 : lerPreco(valores.fixo);
    if (fixo == null || fixo > 100000) return volta("Informe o valor do frete (ex.: 19,90; use 0 para frete grátis).");
    if (valores.gratis) {
      gratis = lerPreco(valores.gratis);
      if (!gratis) return volta("Valor para frete grátis inválido. Ex.: 199,00");
    }
    prazo = Number(valores.prazo);
    if (!Number.isInteger(prazo) || prazo < 1 || prazo > 60) return volta("Informe o prazo de entrega em dias úteis (1 a 60).");
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_frete", { p_fixo: fixo, p_gratis_acima: gratis, p_prazo: prazo });
  if (error) return volta("Não foi possível salvar o frete. Tente de novo.");
  revalidatePath("/painel/produtor/frete");
  revalidatePath("/painel/loja");
  return { sucesso: fixo == null ? "Envio desligado: só retirada no local e produtos digitais." : "Frete salvo.", valores };
}

// ---------- nota fiscal + rastreio + entrega ----------
export async function registrarEnvio(f: FormData) {
  await exigirPapel("produtor");
  const itemPedido = texto(f, "item_pedido");
  const numero = texto(f, "nf_numero");
  const chave = texto(f, "nf_chave").replace(/\D/g, "");
  const url = texto(f, "nf_url");
  const rastreio = texto(f, "rastreio").toUpperCase();
  const acao = texto(f, "acao"); // "nota" | "enviado" | "entregue"
  const codigo = texto(f, "codigo").replace(/[^A-Z0-9]/g, "").slice(0, 10) || undefined;

  if (!numero || numero.length > 30) voltar("Informe o número da nota fiscal.", true, codigo);
  if (!chave && !url) voltar("Informe a chave de acesso (44 números) ou o link da nota.", true, codigo);
  if (chave && !/^[0-9]{44}([0-9]{6})?$/.test(chave)) voltar("A chave de acesso tem 44 números (NF-e) ou 50 (NFS-e).", true, codigo);
  if (url && !/^https:\/\/\S+$/.test(url)) voltar("O link da nota precisa começar com https://", true, codigo);
  if (acao === "enviado" && !rastreio) voltar("Informe o código de rastreio para marcar como enviado.", true, codigo);
  if (rastreio.length > 40) voltar("Código de rastreio longo demais.", true, codigo);

  const mudanca: Record<string, string | null> = {
    nota_fiscal_numero: numero,
    nota_fiscal_chave: chave || null,
    nota_fiscal_url: url || null,
    codigo_rastreio: rastreio || null,
  };
  if (acao === "enviado") mudanca.status_entrega = "enviado";
  if (acao === "entregue") mudanca.status_entrega = "entregue";

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("order_items").update(mudanca).eq("id", itemPedido).select("id");
  if (error || !data?.length) voltar("Não foi possível salvar. O pedido precisa estar pago e ser da sua loja.", true, codigo);
  voltar(
    acao === "entregue"
      ? "Entrega registrada. O prazo de 7 dias para desistência começou."
      : acao === "enviado"
        ? "Envio registrado."
        : "Nota fiscal salva.",
    false,
    codigo,
  );
}

// ---------- responder atendimento sobre pedido ----------
export async function responderAtendimento(f: FormData) {
  await exigirPapel("produtor");
  const resposta = texto(f, "resposta");
  if (resposta.length < 2 || resposta.length > 4000) voltar("Escreva a resposta (até 4000 letras).", true);
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("responder_atendimento", {
    p_id: texto(f, "atendimento"),
    p_resposta: resposta,
    p_encerrar: f.get("encerrar") === "sim",
  });
  if (error) voltar("Não foi possível responder.", true);
  voltar("Resposta enviada. O cliente vê pelo protocolo.");
}
