// Cliente do Supabase para o SERVIDOR (páginas, ações de formulário e rotas).
// Usa a chave pública + o cookie de sessão do usuário: tudo passa pela RLS,
// ou seja, o usuário só enxerga o que o banco permite.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseChavePublica, supabaseUrl } from "./env";

export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseChavePublica(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de dentro de uma página (Server Component): não dá para
          // gravar cookie ali. Sem problema: o proxy.ts renova a sessão.
        }
      },
    },
  });
}
