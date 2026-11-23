// Consulta dos inscritos usada pela tela /admin/lista e pela exportação CSV
// (mesmos filtros nos dois lugares). Roda com a sessão do admin: a RLS só
// devolve linhas para quem é admin.
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { NICHOS, PERFIS } from "@/lib/lista";

export type Filtros = { tipo?: string; cidade?: string; nicho?: string };

export type Inscrito = {
  id: number;
  criado_em: string;
  interesse: string;
  nome: string | null;
  email: string;
  whatsapp: string | null;
  cidade: string | null;
  uf: string | null;
  nichos: string[];
  empresa: string | null;
  cnpj: string | null;
  tipo_produto: string | null;
  o_que_vende: string | null;
  indicacoes: number;
  codigo_indicacao: string;
  status_contato: string;
  consentimento_versao: string | null;
  consentimento_em: string;
};

// Limite de segurança para a tela/CSV. Se a lista passar disso, paginamos.
export const LIMITE = 5000;

// Lê os filtros da URL aceitando só valores conhecidos.
export function lerFiltros(params: Record<string, string | string[] | undefined>): Filtros {
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const tipo = um(params.tipo);
  const nicho = um(params.nicho);
  return {
    tipo: PERFIS.some((p) => p.valor === tipo) ? tipo : undefined,
    cidade: um(params.cidade)?.slice(0, 120),
    nicho: NICHOS.some((n) => n.valor === nicho) ? nicho : undefined,
  };
}

export async function buscarInscritos(filtros: Filtros) {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("waitlist_com_indicacoes")
    .select(
      "id, criado_em, interesse, nome, email, whatsapp, cidade, uf, nichos, empresa, cnpj, tipo_produto, o_que_vende, indicacoes, codigo_indicacao, status_contato, consentimento_versao, consentimento_em",
    )
    .order("criado_em", { ascending: false })
    .limit(LIMITE);

  if (filtros.tipo) consulta = consulta.eq("interesse", filtros.tipo);
  // % e _ são curingas no ilike: escapamos para buscar o texto literal
  if (filtros.cidade) consulta = consulta.ilike("cidade", `%${filtros.cidade.replace(/[%_\\]/g, "\\$&")}%`);
  if (filtros.nicho) consulta = consulta.contains("nichos", [filtros.nicho]);

  const { data, error } = await consulta;
  if (error) throw new Error(`Erro ao buscar inscritos: ${error.message}`);
  return (data ?? []) as Inscrito[];
}

// Contadores gerais (sem filtro): total e por perfil.
export async function contarInscritos() {
  const supabase = await criarClienteServidor();
  const contar = (perfil?: string) => {
    const q = supabase.from("waitlist").select("*", { count: "exact", head: true });
    return perfil ? q.eq("interesse", perfil) : q;
  };
  const [total, ...porPerfil] = await Promise.all([contar(), ...PERFIS.map((p) => contar(p.valor))]);
  return {
    total: total.count ?? 0,
    porPerfil: PERFIS.map((p, i) => ({ valor: p.valor, rotulo: p.rotulo, n: porPerfil[i].count ?? 0 })),
  };
}
