// Tabela de taxas por meio de pagamento (valores sempre lidos das configurações).
// Usada em /taxas e na página inicial.
import { MODALIDADES, ROTULO_MODALIDADE, taxaTotalCentavos, type Modalidade } from "@/lib/pagamentos/taxas";
import { formatarPreco } from "@/lib/produtor";

export const EXEMPLO_CENTAVOS = 10_000;

export type Par = { percentual: number; fixoCentavos: number };
export const lerPar = (v: unknown): Par | undefined => {
  const o = v as { percentual?: unknown; fixo_centavos?: unknown } | null;
  return typeof o?.percentual === "number" && typeof o?.fixo_centavos === "number"
    ? { percentual: o.percentual, fixoCentavos: o.fixo_centavos }
    : undefined;
};
export const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
export function TabelaTaxas({ titulo, linha, minimo }: { titulo: string; linha: (m: Modalidade) => Par | undefined; minimo: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="mb-1 text-left font-medium">{titulo}</caption>
        <thead>
          <tr className="text-left text-petroleo/75">
            <th scope="col" className="py-2 pr-3 font-medium">
              Meio de pagamento
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Taxa
            </th>
            <th scope="col" className="py-2 text-right font-medium whitespace-nowrap">
              Em uma venda de {formatarPreco(EXEMPLO_CENTAVOS)}
            </th>
          </tr>
        </thead>
        <tbody>
          {MODALIDADES.map((m) => {
            const t = linha(m);
            return (
              <tr key={m} className="border-t border-petroleo/10">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {ROTULO_MODALIDADE[m]}
                </th>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {t ? `${pct(t.percentual)} + ${formatarPreco(t.fixoCentavos)}` : "Consulte o atendimento"}
                </td>
                <td className="py-2 text-right tabular-nums">{t ? formatarPreco(taxaTotalCentavos(EXEMPLO_CENTAVOS, t, minimo)) : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

