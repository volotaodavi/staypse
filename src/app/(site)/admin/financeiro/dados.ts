// Dados do Financeiro do admin: agregações do banco (informativas, só admin) e a conta
// PRÓPRIA da Staypse na Lytex. A Staypse nunca guarda nem repassa dinheiro de terceiros.
import "server-only";
import { contaLytex, type CarteiraLytex, type ContaBancariaLytex, type ResumoCarteiraLytex } from "@/lib/pagamentos/lytex";
import { diaCurto, formatarDia, type Periodo } from "@/lib/periodo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ResumoFinanceiro = {
  pedidos: number;
  gmv_centavos: number;
  staypse_centavos: number;
  taxa_total_centavos: number;
  taxa_meio_centavos: number; // custo Lytex estimado
  taxa_meio_informada_pedidos: number;
  comissao_afiliados_centavos: number;
  comissao_vendedores_centavos: number;
  liquido_lojas_centavos: number;
  sem_split: number;
  reembolsos_qtd: number;
  reembolsos_centavos: number;
  chargebacks_qtd: number;
  chargebacks_centavos: number;
};

export type DiaFinanceiro = { dia: string; pedidos: number; gmv_centavos: number; staypse_centavos: number };
export type LinhaModalidade = {
  modalidade: string;
  pedidos: number;
  gmv_centavos: number;
  taxa_total_centavos: number;
  custo_lytex_centavos: number;
  receita_staypse_centavos: number;
};
export type LinhaRanking = { nome: string; pedidos: number; vendido_centavos: number; valor_centavos: number; total_linhas: number };
export type TipoRanking = "loja" | "afiliado" | "vendedor";

export async function resumoFinanceiro(p: Periodo): Promise<ResumoFinanceiro> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_fin_resumo", { p_inicio: p.inicio, p_fim: p.fim });
  if (error || !data) throw new Error(`Financeiro indisponível: ${error?.message}`);
  return data as unknown as ResumoFinanceiro;
}

// uma entrada por dia do período (dias sem venda valem 0), para o gráfico não pular datas
export async function serieDiaria(p: Periodo): Promise<(DiaFinanceiro & { rotulo: string; texto: string })[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_fin_por_dia", { p_inicio: p.inicio, p_fim: p.fim });
  if (error) throw new Error(`Série indisponível: ${error.message}`);
  const porDia = new Map(((data ?? []) as unknown as DiaFinanceiro[]).map((d) => [d.dia, d]));
  const saida: (DiaFinanceiro & { rotulo: string; texto: string })[] = [];
  for (let d = new Date(`${p.de}T12:00:00Z`); d.toISOString().slice(0, 10) <= p.ate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = d.toISOString().slice(0, 10);
    const x = porDia.get(dia) ?? { dia, pedidos: 0, gmv_centavos: 0, staypse_centavos: 0 };
    saida.push({ ...x, rotulo: diaCurto(dia), texto: formatarDia(dia) });
  }
  return saida;
}

// separação INTERNA (só admin): taxa total, custo Lytex estimado e receita Staypse por modalidade
export async function porModalidade(p: Periodo): Promise<LinhaModalidade[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_fin_por_modalidade", { p_inicio: p.inicio, p_fim: p.fim });
  if (error) throw new Error(`Taxas por modalidade indisponíveis: ${error.message}`);
  return (data ?? []) as unknown as LinhaModalidade[];
}

export async function ranking(tipo: TipoRanking, p: Periodo, busca: string, limite: number, offset: number): Promise<LinhaRanking[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("admin_fin_ranking", {
    p_tipo: tipo,
    p_inicio: p.inicio,
    p_fim: p.fim,
    p_busca: busca || undefined,
    p_limite: limite,
    p_offset: offset,
  });
  if (error) throw new Error(`Ranking indisponível: ${error.message}`);
  return (data ?? []) as unknown as LinhaRanking[];
}

// ---------------------------------------------------------------------------------
// Conta Staypse na Lytex
// ---------------------------------------------------------------------------------
export type EstadoConta =
  | { conectada: false; motivo: "sem_credenciais" | "indisponivel" }
  | { conectada: true; carteira: CarteiraLytex; resumo: ResumoCarteiraLytex | null; contas: ContaBancariaLytex[] };

export function lytexConfigurada(): boolean {
  return Boolean(process.env.LYTEX_CLIENT_ID?.trim() && process.env.LYTEX_CLIENT_SECRET?.trim());
}

// Nunca quebra a página: sem credenciais (ou com a Lytex fora do ar) devolve "não conectada".
export async function contaStaypse(): Promise<EstadoConta> {
  if (!lytexConfigurada()) return { conectada: false, motivo: "sem_credenciais" };
  try {
    const carteira = await contaLytex.carteira();
    const [resumo, contas] = await Promise.all([contaLytex.resumoCarteira().catch(() => null), contaLytex.contasBancarias().catch(() => [])]);
    return { conectada: true, carteira, resumo, contas };
  } catch {
    return { conectada: false, motivo: "indisponivel" };
  }
}

// endereço do painel da Lytex (variável de ambiente; só https)
export function painelLytexUrl(): string | null {
  const u = process.env.LYTEX_PAINEL_URL?.trim() ?? "";
  return /^https:\/\/[^\s]+$/.test(u) ? u : null;
}
