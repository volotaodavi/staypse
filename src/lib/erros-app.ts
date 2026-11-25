// Grava um erro tratado (que não chega ao onRequestError) em erros_app, para o admin ver em /admin/erros.
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { limparMensagemErro } from "./erros-app-limpar";

export async function registrarErroApp(erro: unknown, rota: string) {
  try {
    const m = erro instanceof Error ? erro.message : String(erro);
    await criarClienteAdmin().from("erros_app").insert({
      mensagem: limparMensagemErro(m || "(sem mensagem)"),
      caminho: rota.slice(0, 300),
      rota: rota.slice(0, 200),
      metodo: "POST",
      tipo: "action",
    });
  } catch {
    // o monitor nunca derruba a ação
  }
}
