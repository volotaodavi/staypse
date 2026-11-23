// Cliente do Supabase com a chave SECRETA (service_role).
// Passa por cima da RLS, por isso:
//  * só pode ser usado no servidor ("server-only" quebra o build se alguém
//    importar este arquivo numa tela do navegador);
//  * só para operações que o banco libera exclusivamente ao servidor
//    (ex.: inscrição na lista de espera, com limite por IP).
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) {
    throw new Error("Variável de ambiente SUPABASE_SECRET_KEY não configurada (ver .env.example).");
  }
  return createClient(supabaseUrl(), chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
