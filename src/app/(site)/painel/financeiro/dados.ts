// Dados da Área financeira de quem recebe (loja, afiliado, vendedor com split direto).
// O dinheiro fica na subconta Lytex da própria pessoa; aqui só se LÊ o que a Staypse registrou
// (extrato do split, saques) e, no simulador, um saldo simulado.
import "server-only";
import { nomeDoProvedor } from "@/lib/pagamentos";
import { subcontaLytex, type ContaBancariaSubconta } from "@/lib/pagamentos/lytex";
import type { PapelRecebedor } from "@/lib/pagamentos/tipos";
import type { Papel } from "@/lib/papeis";
import type { Periodo } from "@/lib/periodo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type PapelFin = "loja" | "afiliado" | "vendedor";
export const PAPEL_FIN: Record<PapelFin, { recebedor: PapelRecebedor; papel: Papel; rotulo: string; ganho: string }> = {
  loja: { recebedor: "produtor", papel: "produtor", rotulo: "Loja", ganho: "Vendas" },
  afiliado: { recebedor: "afiliado", papel: "revendedor", rotulo: "Afiliado", ganho: "Comissões" },
  vendedor: { recebedor: "vendedor", papel: "vendedor_proprio", rotulo: "Vendedor", ganho: "Comissões" },
};

export type LinhaExtrato = {
  pedido_id: string;
  codigo: string;
  data: string;
  situacao: "a_receber" | "repassada" | "estornada" | string;
  vendido_centavos: number;
  taxa_centavos: number;
  recebe_centavos: number;
};

export type SaqueLinha = { id: string; valor_centavos: number; custo_centavos: number; status: string; provedor_id: string | null; erro: string | null; criado_em: string };

export async function extrato(papel: PapelFin, p: { inicio: string; fim: string }): Promise<LinhaExtrato[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("meu_extrato_financeiro", { p_papel: PAPEL_FIN[papel].recebedor, p_inicio: p.inicio, p_fim: p.fim });
  if (error) throw new Error(`Extrato indisponível: ${error.message}`);
  return (data ?? []) as unknown as LinhaExtrato[];
}

export function resumir(linhas: LinhaExtrato[]) {
  const soma = (f: (l: LinhaExtrato) => number, so?: string) => linhas.filter((l) => !so || l.situacao === so).reduce((s, l) => s + Number(f(l)), 0);
  const validas = linhas.filter((l) => l.situacao !== "estornada");
  return {
    vendas: validas.length,
    vendido: validas.reduce((s, l) => s + Number(l.vendido_centavos), 0),
    taxa: validas.reduce((s, l) => s + Number(l.taxa_centavos), 0),
    recebe: validas.reduce((s, l) => s + Number(l.recebe_centavos), 0),
    aReceber: soma((l) => l.recebe_centavos, "a_receber"),
    repassado: soma((l) => l.recebe_centavos, "repassada"),
    estornado: soma((l) => l.recebe_centavos, "estornada"),
  };
}

export async function meusSaques(): Promise<SaqueLinha[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("saques")
    .select("id, valor_centavos, custo_centavos, status, provedor_id, erro, criado_em")
    .order("criado_em", { ascending: false })
    .limit(30);
  return (data ?? []) as SaqueLinha[];
}

export const lytexConfigurada = () => Boolean(process.env.LYTEX_CLIENT_ID?.trim() && process.env.LYTEX_CLIENT_SECRET?.trim());

// A "integração pendente" só existe no provedor Lytex sem credenciais
export const integracaoPendente = () => nomeDoProvedor() === "lytex" && !lytexConfigurada();

// Contas bancárias já cadastradas NA LYTEX (a Staypse não cadastra nem guarda conta). Só o final dos números.
export async function contasBancarias(subId: string): Promise<ContaBancariaSubconta[]> {
  if (nomeDoProvedor() === "mock") return [{ id: "mock_conta_1", banco: "Banco Simulado", agenciaFinal: "0001", contaFinal: "1234" }];
  try {
    return await subcontaLytex.contasBancarias(subId);
  } catch {
    return [];
  }
}

// Saldo disponível na conta Lytex. O spec não traz saldo por subconta (PERGUNTAS 58): na Lytex devolve null
// ("Consulte no painel da Lytex"). No simulador: o repassado (prazo de 7 dias vencido) menos os saques não falhos.
export async function saldoDisponivel(papel: PapelFin, saques: SaqueLinha[]): Promise<number | null> {
  if (nomeDoProvedor() !== "mock") return null;
  const todo = await extrato(papel, { inicio: "2020-01-01T00:00:00Z", fim: new Date(Date.now() + 86_400_000).toISOString() });
  const sacado = saques.filter((s) => s.status !== "falhou").reduce((t, s) => t + s.valor_centavos, 0);
  return Math.max(0, resumir(todo).repassado - sacado);
}

export type Intervalo = Pick<Periodo, "inicio" | "fim">;
