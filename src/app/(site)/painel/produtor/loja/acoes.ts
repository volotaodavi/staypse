"use server";
// Ações do produtor: dados da loja pública e decisão sobre afiliações manuais.
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FONTES_LOJA } from "@/lib/tema";
import { layoutLegado, validarTemaLoja } from "@/lib/tema-loja";
import { problemaNoSlug } from "@/lib/vitrine";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

export async function salvarLoja(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const valores = {
    loja_slug: texto(f, "loja_slug").toLowerCase(),
    loja_nome: texto(f, "loja_nome"),
    loja_descricao: texto(f, "loja_descricao"),
    loja_foto_path: texto(f, "loja_foto_path"),
    cor_principal: texto(f, "cor_principal").toLowerCase(),
    cor_destaque: texto(f, "cor_destaque").toLowerCase(),
    fonte: texto(f, "fonte"),
    tema: texto(f, "tema"),
  };
  const volta = (erro: string) => ({ erro, valores });

  const problema = problemaNoSlug(valores.loja_slug);
  if (problema) return volta(problema);
  if (valores.loja_nome.length < 2 || valores.loja_nome.length > 80) return volta("Informe o nome da loja (2 a 80 letras).");
  if (valores.loja_descricao.length > 500) return volta("A descrição pode ter até 500 letras.");
  if (![valores.cor_principal, valores.cor_destaque].every((c) => /^#[0-9a-f]{6}$/.test(c))) return volta("Escolha as duas cores.");
  if (!Object.hasOwn(FONTES_LOJA, valores.fonte)) return volta("Escolha uma fonte da lista.");
  // tema em JSON (modelo, seções, banner, destaques): conferido aqui e de novo no banco
  let bruto: unknown;
  try {
    bruto = JSON.parse(valores.tema);
  } catch {
    return volta("Não foi possível ler as escolhas da loja. Recarregue a página e tente de novo.");
  }
  const conferido = validarTemaLoja(bruto);
  if (!conferido.ok) return volta(conferido.erro);
  const tema = conferido.tema;

  const supabase = await criarClienteServidor();
  // a função confere que o cadastro é do usuário e que a foto está na pasta dele
  const { error } = await supabase.rpc("salvar_minha_loja", {
    p_slug: valores.loja_slug,
    p_nome: valores.loja_nome,
    p_descricao: valores.loja_descricao,
    p_foto: valores.loja_foto_path,
    p_cor_principal: valores.cor_principal,
    p_cor_destaque: valores.cor_destaque,
    p_fonte: valores.fonte,
    p_layout: layoutLegado(tema.modelo), // coluna antiga continua preenchida
    p_tema: tema,
  });
  if (error) {
    if (error.code === "23505") return volta("Esse endereço já está em uso. Escolha outro.");
    if (error.message.includes("destaque_de_outra_loja")) return volta("Os produtos em destaque e o do banner precisam ser da sua loja.");
    if (error.message.includes("banner_fora_da_pasta")) return volta("Envie as imagens de novo: uma delas não está na sua pasta.");
    if (error.code === "23514") {
      if (error.message.includes("loja_slug")) return volta("Esse endereço não é permitido. Escolha outro.");
      if (error.message.includes("tema")) return volta("Confira o modelo, os blocos, os banners e os links.");
      return volta("Confira as cores e a fonte.");
    }
    if (error.message.includes("cadastro_inexistente")) return volta("Cadastre sua empresa antes de montar a loja.");
    if (error.message.includes("foto_fora_da_pasta")) return volta("Envie a foto de novo.");
    return volta("Não foi possível salvar a loja. Tente novamente.");
  }
  updateTag(ETIQUETA_VITRINES);
  // fica na própria tela (a pessoa segue ajustando olhando a prévia) e confirma o que aconteceu
  return { sucesso: "Loja salva. As mudanças já aparecem na sua loja pública.", valores };
}

// Aprovar/recusar um pedido de afiliação (itens com "aprovo manualmente")
export async function decidirAfiliacaoAcao(f: FormData) {
  await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const aprovar = texto(f, "decisao") === "aprovar";
  const { error } = await supabase.rpc("decidir_afiliacao", { p_afiliacao: texto(f, "afiliacao_id"), p_aprovar: aprovar });
  updateTag(ETIQUETA_VITRINES);
  const msg = error ? "Não foi possível registrar a decisão." : aprovar ? "Afiliação aprovada." : "Afiliação recusada.";
  redirect(`/painel/loja/afiliados?msg=${encodeURIComponent(msg)}`);
}
