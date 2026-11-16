// Quem está logado, quais papéis tem e para qual página deve ir.
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Papel = "produtor" | "revendedor" | "admin";

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
  papeis: Papel[];
};

// Busca o usuário logado + nome + papéis. Devolve null se ninguém estiver logado.
// Os papéis vêm do BANCO (tabela user_roles, protegida por RLS), nunca do
// navegador — assim ninguém se faz de admin mexendo no cookie.
export async function usuarioAtual(): Promise<UsuarioAtual | null> {
  // Marca a página como "do momento do pedido": a validação da sessão usa a
  // hora atual (expiração do token), o que o Next não aceita em pré-renderização.
  await connection();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;

  const [{ data: perfil }, { data: papeis }] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", id).single(),
    supabase.from("user_roles").select("papel").eq("user_id", id),
  ]);

  return {
    id,
    email: String(data.claims.email ?? ""),
    nome: perfil?.nome ?? "",
    papeis: (papeis ?? []).map((p) => p.papel as Papel),
  };
}

// Para usar no topo de páginas restritas: exige login e (opcionalmente) um papel.
export async function exigirPapel(papel?: Papel): Promise<UsuarioAtual> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (papel && !usuario.papeis.includes(papel)) redirect("/painel");
  return usuario;
}

// Para onde vai cada pessoa depois de entrar.
// Retorna null quando a pessoa tem os dois papéis: aí /painel mostra a escolha.
export function destinoDoPainel(papeis: Papel[]): string | null {
  if (papeis.includes("admin")) return "/admin";
  const produtor = papeis.includes("produtor");
  const revendedor = papeis.includes("revendedor");
  if (produtor && revendedor) return null; // mostra os dois atalhos
  if (produtor) return "/painel/produtor";
  if (revendedor) return "/painel/revendedor";
  return "/painel/comecar"; // ainda sem papel: escolhe um
}
