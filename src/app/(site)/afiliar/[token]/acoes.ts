"use server";
// Aceitar o convite de afiliação por produto. O banco confere tudo: convite
// válido (não expirado, não revogado, não usado por outra pessoa) e as mesmas
// regras de afiliar_se (cadastro de recebimento aprovado, bloqueio pela loja...).
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const ERROS: Record<string, string> = {
  convite_invalido: "Este convite não existe ou foi trocado por outro. Peça um novo link à loja.",
  convite_revogado: "A loja cancelou este convite. Peça um novo link.",
  convite_usado: "Este convite já foi usado por outra pessoa. Peça um novo link à loja.",
  convite_expirado: "Este convite expirou. Peça um novo link à loja.",
  apenas_revendedor: "Entre com uma conta de afiliado para aceitar.",
  recebedor_pendente: "Para se afiliar, complete seu cadastro de recebimento na Lytex (Painel do afiliado → Recebimentos). Depois, abra o link de novo.",
  crie_sua_vitrine: "Crie sua vitrine antes de aceitar o convite. Depois, abra o link de novo.",
  afiliado_bloqueado: "A loja não aceita mais suas indicações.",
  item_indisponivel: "Este produto não está mais disponível.",
  afiliacao_propria: "Você não pode se afiliar ao seu próprio produto.",
  endereco_repetido: "Você já indica outro produto com o mesmo endereço de link. Peça à loja para mudar o endereço deste produto.",
};

export async function aceitarConviteAfiliacao(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("revendedor");
  const token = String(f.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { erro: ERROS.convite_invalido };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("afiliar_por_convite", { p_token: token });
  if (error) {
    const chave = Object.keys(ERROS).find((k) => error.message.includes(k));
    return { erro: chave ? ERROS[chave] : "Não foi possível aceitar o convite. Tente novamente." };
  }
  // o produto entra na vitrine do afiliado: renova o cache público
  updateTag(ETIQUETA_VITRINES);
  redirect("/painel/revendedor?afiliado=convite");
}
