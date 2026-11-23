"use server";
// Salva as configurações: valida no servidor e chama a função do banco, que
// valida de novo, grava e registra no log o antes e o depois de cada mudança.
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/formulario";
import { validarConfiguracoes } from "@/lib/configuracoes";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "");

export async function salvarConfiguracoes(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("admin");
  const resultado = validarConfiguracoes({
    taxa: texto(f, "taxa"),
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
  const { error } = await supabase.rpc("admin_salvar_configuracoes", { p_valores: resultado.valores });
  if (error) {
    if (error.message.includes("comissao_min_maior_que_max")) return { erro: "A comissão mínima não pode ser maior que a máxima." };
    return { erro: "Não foi possível salvar. Confira os valores e tente de novo." };
  }
  revalidatePath("/admin/configuracoes");
  return { sucesso: "Configurações salvas. Cada mudança ficou registrada no log de auditoria." };
}
