// Dados do painel de quem indica (afiliado ou vendedor próprio): tudo vem de
// funções do banco filtradas pela própria pessoa. Do comprador, só o básico: nome e valor pago
// (nunca e-mail, telefone, CPF, endereço ou código de acesso).
import type { Periodo } from "@/lib/periodo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Indicadores = {
  vendas: number;
  vendido_centavos: number;
  a_receber_centavos: number;
  repassada_centavos: number;
  estornada_centavos: number;
  cliques: number;
  cliques_externos: number;
  serie: { dia: string; cliques: number; vendas: number }[];
};

export type Comissao = {
  pedido_id: string;
  data: string;
  produto: string;
  quantidade: number;
  loja: string;
  valor_centavos: number;
  comissao_centavos: number;
  status_pedido: string;
  situacao: string;
  previsao: string | null;
  // como a venda chegou até você: "link" (link curto) ou "codigo" (digitado no checkout)
  origem_atribuicao: "link" | "codigo" | null;
  // o básico do comprador, para acompanhar a comissão: nome e total pago (null até o pagamento)
  comprador_nome: string;
  valor_pago_centavos: number | null;
  // só afiliado: "Taxa da plataforma" sobre a comissão e "Você recebe" (null até haver cobrança; vendedor próprio não paga taxa)
  taxa_centavos?: number | null;
  recebe_centavos?: number | null;
};

export const SITUACAO_COMISSAO: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  a_receber: "Pendente (prazo de 7 dias)",
  repassada: "Liberada (repassada pelo split)",
  estornada: "Estornada (desistência, reembolso ou chargeback)",
  cancelada: "Pedido cancelado",
};

export type PapelIndicador = "afiliado" | "vendedor";

export async function lerIndicadores(
  papel: PapelIndicador,
  periodo: Periodo,
): Promise<Indicadores> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("painel_indicador", {
    p_papel: papel,
    p_inicio: periodo.inicio,
    p_fim: periodo.fim,
  });
  if (error) throw new Error(`Indicadores indisponíveis: ${error.message}`);
  return data as Indicadores;
}

export async function lerComissoes(
  papel: PapelIndicador,
  periodo: Periodo,
): Promise<Comissao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("minhas_comissoes", {
    p_papel: papel,
    p_inicio: periodo.inicio,
    p_fim: periodo.fim,
  });
  if (error) throw new Error(`Vendas indisponíveis: ${error.message}`);
  const lista = (data ?? []) as Comissao[];
  if (papel !== "afiliado" || lista.length === 0) return lista;
  const { data: valores } = await supabase.rpc("afiliado_valores_pedidos", {
    p_ids: [...new Set(lista.map((c) => c.pedido_id))],
  });
  const porPedido = new Map(
    (
      (valores ?? []) as unknown as {
        order_id: string;
        taxa_centavos: number;
        recebe_centavos: number;
      }[]
    ).map((v) => [v.order_id, v]),
  );
  return lista.map((c) => {
    const v = porPedido.get(c.pedido_id);
    return {
      ...c,
      taxa_centavos: v ? Number(v.taxa_centavos) : null,
      recebe_centavos: v ? Number(v.recebe_centavos) : null,
    };
  });
}
