"use server";
// Salva as configurações: valida no servidor e chama a função do banco, que
// valida de novo, grava e registra no log o antes e o depois de cada mudança.
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/formulario";
import { validarConfiguracoes, type TaxaTexto } from "@/lib/configuracoes";
import { MODALIDADES } from "@/lib/pagamentos/taxas";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "");

const par = (f: FormData, nome: string): TaxaTexto => ({ pct: texto(f, `${nome}_pct`), fixo: texto(f, `${nome}_fixo`) });

export async function salvarConfiguracoes(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("admin");
  const resultado = validarConfiguracoes({
    taxas: {
      taxaTotal: Object.fromEntries(MODALIDADES.map((m) => [m, par(f, `taxa_total_${m}`)])) as never,
      custoLytex: Object.fromEntries(MODALIDADES.map((m) => [m, par(f, `custo_lytex_${m}`)])) as never,
      split: { pct: texto(f, "split_pct"), min: texto(f, "split_min"), max: texto(f, "split_max") },
    },
    comissaoMin: texto(f, "comissao_min"),
    comissaoMax: texto(f, "comissao_max"),
    prazoNf: texto(f, "prazo_nf"),
    palavras: texto(f, "palavras"),
    pix: f.get("pix") === "on",
    cartao: f.get("cartao") === "on",
    boleto: f.get("boleto") === "on",
  });
  if ("erro" in resultado) return { erro: resultado.erro };

  const supabase = await criarClienteServidor();
  const { taxas, ...demais } = resultado.valores;
  const { error } = await supabase.rpc("admin_salvar_configuracoes", { p_valores: { ...demais, ...taxas } as never });
  if (error) {
    if (error.message.includes("taxa_total_menor_que_custo_lytex")) return { erro: "A taxa total de uma modalidade ficou abaixo do custo da Lytex." };
    if (error.message.includes("comissao_min_maior_que_max")) return { erro: "A comissão mínima não pode ser maior que a máxima." };
    return { erro: "Não foi possível salvar. Confira os valores e tente de novo." };
  }
  revalidatePath("/admin/configuracoes");
  return { sucesso: "Configurações salvas. Cada mudança ficou registrada no log de auditoria." };
}
