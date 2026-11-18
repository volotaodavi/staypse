// Consulta dos pedidos da loja por período e situação (tela e CSV usam a mesma).
import { lerPeriodo } from "@/lib/periodo";
import { STATUS_EXIBICAO, minhaLoja, statusExibicao } from "../dados";

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type PedidoLista = {
  id: string;
  codigo: string;
  status: string;
  criado_em: string;
  pago_em: string | null;
  total_centavos: number;
  entrega_modo: string | null;
  revendedor_id: string | null;
  vendedor_id: string | null;
  arrependimento_ate: string | null;
  order_items: { nome_item: string; quantidade: number; status_entrega: string; nota_fiscal_numero: string | null }[];
};

export async function lerPedidosDaLoja(sp: Record<string, string | string[] | undefined>) {
  const periodo = lerPeriodo(sp);
  const pedido = um(sp.status) ?? "";
  const filtro = Object.hasOwn(STATUS_EXIBICAO, pedido) ? pedido : "";
  const { supabase, loja } = await minhaLoja();
  if (!loja) return { periodo, filtro, pedidos: [] as PedidoLista[] };
  const { data: bruto, error } = await supabase
    .from("orders")
    .select(
      "id, codigo, status, criado_em, pago_em, total_centavos, entrega_modo, revendedor_id, vendedor_id, arrependimento_ate, order_items(nome_item, quantidade, status_entrega, nota_fiscal_numero)",
    )
    .eq("producer_id", loja.id)
    .gte("criado_em", periodo.inicio)
    .lt("criado_em", periodo.fim)
    .order("criado_em", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Pedidos indisponíveis: ${error.message}`);
  const todos = (bruto ?? []) as unknown as PedidoLista[];
  const pedidos = filtro ? todos.filter((p) => statusExibicao(p.status, p.order_items) === filtro) : todos;
  return { periodo, filtro, pedidos };
}

export const origemDaVenda = (p: { revendedor_id: string | null; vendedor_id: string | null }) =>
  p.vendedor_id ? "Vendedor próprio" : p.revendedor_id ? "Afiliado" : "Direto na loja";
