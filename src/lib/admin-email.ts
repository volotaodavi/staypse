// Admin único: só a conta cujo e-mail é o ADMIN_EMAIL tem o papel admin.
// O banco também impede o papel para outro e-mail (tabela configuracoes, chave
// 'admin_email'); o servidor copia o ADMIN_EMAIL para lá na primeira requisição.
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// e-mail do admin geral, em minúsculas (vazio = ninguém é admin)
export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

// comparação sem diferenciar maiúsculas de minúsculas
export function ehEmailAdmin(email: string): boolean {
  const admin = adminEmail();
  return admin !== "" && email.trim().toLowerCase() === admin;
}

let sincronizado = "";

// Copia o ADMIN_EMAIL para o banco (uma vez por processo e por valor). Falha em silêncio:
// o filtro do servidor (ehEmailAdmin) continua valendo mesmo se o banco estiver fora.
export async function sincronizarAdminEmail(): Promise<void> {
  const admin = adminEmail();
  if (!admin || sincronizado === admin || !process.env.SUPABASE_SECRET_KEY) return;
  try {
    const { error } = await criarClienteAdmin().rpc("definir_admin_email", { p_email: admin });
    if (!error) sincronizado = admin;
  } catch {
    // tenta de novo na próxima requisição
  }
}
