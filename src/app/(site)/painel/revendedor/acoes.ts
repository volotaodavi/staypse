"use server";
// Ações do revendedor (afiliado): vitrine, afiliações e links externos.
// O banco garante as regras (RLS + funções): cada um só mexe no que é seu,
// endereço único e não reservado, afiliação só a itens aprovados.
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirAlgumPapel, exigirPapel } from "@/lib/papeis";
import { lerPreco } from "@/lib/produtor";
import { buscarPrevia, plataformaDoLink } from "@/lib/previa-link";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { MODELOS_VISUAIS, NICHOS_VITRINE, problemaNoSlug } from "@/lib/vitrine";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

// ---------- vitrine (criar no onboarding ou editar) ----------
export async function salvarVitrine(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  // revendedor ou vendedor próprio da loja (que pode ter vitrine ou só usar os links)
  const usuario = await exigirAlgumPapel(["revendedor", "vendedor_proprio"]);
  const valores = {
    slug: texto(f, "slug").toLowerCase(),
    nome_exibicao: texto(f, "nome_exibicao"),
    nicho: texto(f, "nicho"),
    modelo_visual: texto(f, "modelo_visual"),
    cor_principal: texto(f, "cor_principal").toLowerCase(),
    foto_path: texto(f, "foto_path"),
    bio: texto(f, "bio"),
  };
  const volta = (erro: string) => ({ erro, valores });

  if (valores.nome_exibicao.length < 2 || valores.nome_exibicao.length > 80) return volta("Dê um nome à vitrine (2 a 80 letras).");
  const problema = problemaNoSlug(valores.slug);
  if (problema) return volta(problema);
  if (!NICHOS_VITRINE.some((n) => n.valor === valores.nicho)) return volta("Escolha o nicho da vitrine.");
  if (!(valores.modelo_visual in MODELOS_VISUAIS)) return volta("Escolha o visual da vitrine.");
  const proprio = valores.modelo_visual === "proprio";
  if (proprio && !/^#[0-9a-f]{6}$/.test(valores.cor_principal)) return volta("Escolha a sua cor principal.");
  if (valores.foto_path && !valores.foto_path.startsWith(`${usuario.id}/`)) return volta("Envie a foto de novo.");
  if (valores.bio.length > 500) return volta("A apresentação pode ter até 500 letras.");

  const supabase = await criarClienteServidor();
  const dados = {
    ...valores,
    cor_principal: proprio ? valores.cor_principal : null,
    foto_path: valores.foto_path || null,
    bio: valores.bio || null,
    publicada: true,
  };
  const { data: existente } = await supabase.from("storefronts").select("id").eq("revendedor_id", usuario.id).maybeSingle();
  const { error } = existente
    ? await supabase.from("storefronts").update(dados).eq("id", existente.id)
    : await supabase.from("storefronts").insert({ ...dados, revendedor_id: usuario.id });

  if (error) {
    if (error.code === "23505") return volta("Esse endereço já está em uso. Escolha outro.");
    if (error.code === "23514") return volta("Esse endereço não é permitido. Escolha outro.");
    return volta("Não foi possível salvar a vitrine. Tente novamente.");
  }
  updateTag(ETIQUETA_VITRINES);
  // o vendedor próprio volta para o painel dele
  redirect(usuario.papeis.includes("revendedor") ? "/painel/revendedor?vitrine=salva" : "/painel/vendedor?vitrine=salva");
}

// ---------- afiliar-se a um item ----------
const ERROS_AFILIACAO: Record<string, string> = {
  apenas_revendedor: "Apenas revendedores podem se afiliar.",
  crie_sua_vitrine: "Crie sua vitrine antes de se afiliar.",
  item_indisponivel: "Este item não está mais disponível.",
  afiliacao_propria: "Você não pode se afiliar ao seu próprio produto.",
  endereco_repetido: "Você já indica outro produto com o mesmo endereço de link. Peça à loja para mudar o endereço deste produto.",
};

export async function afiliar(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("revendedor");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("afiliar_se", { p_item: texto(f, "item_id") }).maybeSingle<{ status: string }>();
  if (error) {
    if (error.code === "23505") return { erro: "Você já pediu afiliação a este item." };
    const chave = Object.keys(ERROS_AFILIACAO).find((k) => error.message.includes(k));
    return { erro: chave ? ERROS_AFILIACAO[chave] : "Não foi possível se afiliar. Tente novamente." };
  }
  updateTag(ETIQUETA_VITRINES);
  return {
    sucesso:
      data?.status === "aprovada"
        ? "Afiliação aprovada! O item já aparece na sua vitrine."
        : "Pedido enviado. O produtor aprova manualmente; você vê o status no seu painel.",
  };
}

export async function cancelarAfiliacao(f: FormData) {
  await exigirPapel("revendedor");
  const supabase = await criarClienteServidor();
  // RLS: só apaga se for do próprio afiliado
  await supabase.from("afiliacoes").delete().eq("id", texto(f, "afiliacao_id"));
  updateTag(ETIQUETA_VITRINES);
  redirect("/painel/revendedor");
}

// ---------- links externos (Shopee, Mercado Livre, TikTok Shop) ----------
// Dois botões no mesmo formulário:
//  - "buscar": lê título/imagem/preço do link e devolve para a tela conferir;
//  - "salvar": grava o que está nos campos (inclusive preenchido à mão).
export async function adicionarLink(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPapel("revendedor");
  const valores = {
    url: texto(f, "url"),
    titulo: texto(f, "titulo"),
    imagem_url: texto(f, "imagem_url"),
    preco: texto(f, "preco"),
  };
  const volta = (erro: string) => ({ erro, valores });

  const plataforma = plataformaDoLink(valores.url);
  if (!plataforma) return volta("Cole um link https da Shopee, Mercado Livre ou TikTok Shop.");
  if (valores.url.length > 2000) return volta("Link longo demais.");

  if (texto(f, "intencao") === "buscar") {
    const previa = await buscarPrevia(valores.url);
    if (!previa?.titulo) {
      return volta("Não conseguimos ler os dados desse link agora. Preencha o título (e, se quiser, imagem e preço) à mão.");
    }
    return {
      sucesso: "Dados encontrados. Confira e toque em Salvar link.",
      valores: {
        ...valores,
        titulo: previa.titulo,
        imagem_url: previa.imagem ?? "",
        preco: previa.precoCentavos ? (previa.precoCentavos / 100).toFixed(2).replace(".", ",") : "",
      },
    };
  }

  if (valores.titulo.length < 2 || valores.titulo.length > 140) return volta("Informe o título (2 a 140 letras).");
  if (valores.imagem_url && !/^https:\/\//.test(valores.imagem_url)) return volta("O endereço da imagem precisa começar com https://");
  const preco = valores.preco ? lerPreco(valores.preco) : null;
  if (valores.preco && !preco) return volta("Preço inválido. Ex.: 49,90");

  const supabase = await criarClienteServidor();
  const { data: vitrine } = await supabase.from("storefronts").select("id").eq("revendedor_id", usuario.id).maybeSingle();
  if (!vitrine) return volta("Crie sua vitrine antes de adicionar links.");
  const { count } = await supabase.from("external_links").select("id", { count: "exact", head: true }).eq("storefront_id", vitrine.id);

  const { error } = await supabase.from("external_links").insert({
    storefront_id: vitrine.id,
    url: valores.url, // exatamente como colado
    titulo: valores.titulo,
    imagem_url: valores.imagem_url || null,
    preco_centavos: preco,
    plataforma,
    ordem: count ?? 0,
  });
  if (error) return volta("Não foi possível salvar o link. Tente novamente.");
  updateTag(ETIQUETA_VITRINES);
  refresh(); // atualiza a lista de links na tela
  return { sucesso: "Link adicionado à sua vitrine." };
}

export async function removerLink(f: FormData) {
  await exigirPapel("revendedor");
  const supabase = await criarClienteServidor();
  await supabase.from("external_links").delete().eq("id", texto(f, "link_id")); // RLS: só o dono
  updateTag(ETIQUETA_VITRINES);
  redirect("/painel/revendedor/links");
}
