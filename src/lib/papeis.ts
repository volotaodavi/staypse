// Quem está logado, quais papéis tem e para qual página deve ir.
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { adminEmail, ehEmailAdmin, sincronizarAdminEmail } from "@/lib/admin-email";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Papel = "produtor" | "revendedor" | "admin" | "vendedor_proprio";

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
  papeis: Papel[];
  // preenchido quando o admin suspendeu a conta (motivo mostrado à pessoa)
  suspensoMotivo: string | null;
};

// Busca o usuário logado + nome + papéis. Devolve null se ninguém estiver logado.
// Os papéis vêm do BANCO (tabela user_roles, protegida por RLS), nunca do
// navegador, assim ninguém se faz de admin mexendo no cookie.
export async function usuarioAtual(): Promise<UsuarioAtual | null> {
  // Marca a página como "do momento do pedido": a validação da sessão usa a
  // hora atual (expiração do token), o que o Next não aceita em pré-renderização.
  await connection();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;

  await sincronizarAdminEmail();
  const email = String(data.claims.email ?? "");
  const [{ data: perfil }, { data: papeis }] = await Promise.all([
    supabase.from("profiles").select("nome, suspenso_motivo").eq("id", id).single(),
    supabase.from("user_roles").select("papel").eq("user_id", id),
  ]);

  return {
    id,
    email,
    nome: perfil?.nome ?? "",
    // admin único: o papel só vale para o e-mail de ADMIN_EMAIL (sem diferenciar maiúsculas)
    // shortcut: sem ADMIN_EMAIL configurado vale o papel admin do banco (como antes); configure ADMIN_EMAIL na Vercel para travar em um e-mail só
    papeis: (papeis ?? []).map((p) => p.papel as Papel).filter((p) => p !== "admin" || !adminEmail() || ehEmailAdmin(email)),
    suspensoMotivo: perfil?.suspenso_motivo ?? null,
  };
}

// Para usar no topo de páginas restritas: exige login e (opcionalmente) um papel.
export async function exigirPapel(papel?: Papel): Promise<UsuarioAtual> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  // conta suspensa pelo admin: nenhum painel abre
  if (usuario.suspensoMotivo) redirect("/conta-suspensa");
  if (papel && !usuario.papeis.includes(papel)) redirect("/painel");
  return usuario;
}

// Como exigirPapel, mas basta ter UM dos papéis (ex.: a vitrine serve para o
// revendedor e para o vendedor próprio da loja).
export async function exigirAlgumPapel(papeis: Papel[]): Promise<UsuarioAtual> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (usuario.suspensoMotivo) redirect("/conta-suspensa");
  if (!papeis.some((p) => usuario.papeis.includes(p))) redirect("/painel");
  return usuario;
}

// Áreas do painel de cada papel
export const AREAS: { papel: Papel; caminho: string; titulo: string; texto: string }[] = [
  { papel: "produtor", caminho: "/painel/loja", titulo: "Loja", texto: "Vendas, pedidos, produtos, afiliados e vendedores." },
  { papel: "revendedor", caminho: "/painel/afiliado", titulo: "Afiliado", texto: "Suas indicações, comissões, vitrine e links." },
  { papel: "vendedor_proprio", caminho: "/painel/vendedor", titulo: "Vendedor da loja", texto: "Seus links, vendas e comissão." },
];

// Para onde vai cada pessoa depois de entrar.
// Retorna null quando a pessoa tem mais de uma área: aí /painel mostra a escolha.
export function destinoDoPainel(papeis: Papel[]): string | null {
  if (papeis.includes("admin")) return "/admin";
  const minhas = AREAS.filter((a) => papeis.includes(a.papel));
  if (minhas.length > 1) return null; // mostra os atalhos
  if (minhas.length === 1) return minhas[0].caminho;
  return "/painel/comecar"; // ainda sem papel: escolhe um
}
