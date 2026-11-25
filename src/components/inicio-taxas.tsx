// Tabela de taxas da página inicial: lida das configurações (a mesma fonte de /taxas).
import { connection } from "next/server";
import { MODALIDADES } from "@/lib/pagamentos/taxas";
import { vigenciaFutura } from "@/lib/pagamentos/vigencia";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { lerPar, TabelaTaxas } from "./TabelaTaxas";

export async function TaxasDaInicial() {
  await connection(); // a vigência depende da data de hoje
  const { data } = await criarClienteAdmin()
    .from("configuracoes")
    .select("chave, valor")
    .or("chave.like.taxa_total_%,chave.in.(taxas_vigencia_em,taxas_anteriores,taxa_minima_centavos)");
  const cfg = new Map<string, unknown>((data ?? []).map((c) => [c.chave as string, c.valor]));
  const anteriores = cfg.get("taxas_anteriores") as Record<string, unknown> | undefined;
  const vig = typeof cfg.get("taxas_vigencia_em") === "string" ? (cfg.get("taxas_vigencia_em") as string) : null;
  const futura = vig !== null && vigenciaFutura(vig) && anteriores !== undefined;
  const minimo = futura ? 0 : Number(cfg.get("taxa_minima_centavos") ?? 0) || 0;
  const linha = (m: (typeof MODALIDADES)[number]) => lerPar(futura ? anteriores?.[m] : cfg.get(`taxa_total_${m}`));
  return <TabelaTaxas titulo="Taxa total por meio de pagamento" linha={linha} minimo={minimo} />;
}
