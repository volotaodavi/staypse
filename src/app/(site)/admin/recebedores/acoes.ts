"use server";
// "Reconsultar na Lytex": busca o status atual do recebedor no provedor.
import { redirect } from "next/navigation";
import { reconsultarRecebedor } from "@/lib/pagamentos/recebedores";
import { IntegracaoPendente } from "@/lib/pagamentos/tipos";
import { exigirPapel } from "@/lib/papeis";

export async function reconsultarAcao(f: FormData) {
  await exigirPapel("admin");
  let msg = "Status atualizado com a Lytex.";
  try {
    await reconsultarRecebedor(String(f.get("provedor") ?? ""), String(f.get("provedor_id") ?? ""));
  } catch (e) {
    msg = e instanceof IntegracaoPendente ? "A consulta à Lytex abre quando a integração oficial for concluída." : "Não foi possível consultar agora.";
  }
  redirect(`/admin/recebedores?msg=${encodeURIComponent(msg)}`);
}
