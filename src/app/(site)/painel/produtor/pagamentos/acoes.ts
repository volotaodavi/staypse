"use server";
// Parcelamento da loja: até quantas vezes o comprador pode parcelar e até quantas sem juros.
// Até N sem juros a loja absorve a taxa da modalidade; acima de N o comprador paga o acréscimo
// (src/lib/pagamentos/juros.ts). Validado aqui e de novo no banco (salvar_parcelamento).
import { revalidatePath, updateTag } from "next/cache";
import type { EstadoFormulario } from "@/components/formulario";
import { politicaValida } from "@/lib/pagamentos/juros";
import { exigirPapel } from "@/lib/papeis";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function salvarParcelamento(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  await exigirPapel("produtor");
  const valores = { parcelas_max: String(f.get("parcelas_max") ?? ""), parcelas_sem_juros: String(f.get("parcelas_sem_juros") ?? "") };
  const volta = (erro: string) => ({ erro, valores });
  const politica = { parcelasMax: Number(valores.parcelas_max), parcelasSemJuros: Number(valores.parcelas_sem_juros) };
  if (!politicaValida(politica)) return volta("Escolha o máximo de parcelas (1 a 12) e quantas delas sem juros (de 1 até o máximo).");

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_parcelamento", { p_max: politica.parcelasMax, p_sem_juros: politica.parcelasSemJuros });
  if (error) return volta("Não foi possível salvar o parcelamento. Tente de novo.");
  updateTag(ETIQUETA_VITRINES); // a página do produto mostra "até Nx sem juros" (cache por etiqueta)
  revalidatePath("/painel/produtor/pagamentos");
  return {
    sucesso:
      politica.parcelasSemJuros > 1
        ? `Parcelamento salvo: até ${politica.parcelasMax}x, sendo até ${politica.parcelasSemJuros}x sem juros para o comprador.`
        : `Parcelamento salvo: até ${politica.parcelasMax}x, com juros para o comprador em qualquer parcelamento.`,
    valores,
  };
}
