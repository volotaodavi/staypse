"use client";
// Simulador público "Quanto sobra": usa a MESMA função do split (calcularSplit) e do acréscimo do parcelamento
// (acrescimoParcelamento) que a cobrança usa, com as taxas lidas das configurações. Só a taxa total chega ao
// navegador: o custo da Lytex vai zerado (não altera taxa, loja nem afiliado, só a receita da Staypse, que não é exibida).
import { useId, useState } from "react";
import { acrescimoParcelamento } from "@/lib/pagamentos/juros";
import { CONCORRENTES, CONCORRENTES_ACESSO_EM } from "@/lib/pagamentos/concorrentes";
import { calcularSplit } from "@/lib/pagamentos/split";
import { ROTULO_MODALIDADE, type Modalidade, type Taxa, type TaxasPlataforma } from "@/lib/pagamentos/taxas";
import { formatarPreco } from "@/lib/produtor";

const SEM_CUSTO: Taxa = { percentual: 0, fixoCentavos: 0 };
const MEIOS: Modalidade[] = ["pix", "boleto", "cartao_1x", "cartao_2a6", "cartao_7a12"];
const campo = "min-h-11 w-full rounded-xl border border-petroleo/60 bg-white px-3 text-base";

export type EntradaSimulador = { taxaTotal: Record<Modalidade, Taxa>; taxaMinimaCentavos: number; pedidoMinimoCentavos: number };

// "1.234,56" ou "150" para centavos; NaN se inválido
const lerValor = (t: string) => Math.round(Number(t.trim().replace(/\./g, "").replace(",", ".")) * 100);

export function Simulador({ taxaTotal, taxaMinimaCentavos, pedidoMinimoCentavos }: EntradaSimulador) {
  const id = useId();
  const [valorTxt, setValorTxt] = useState("150,00");
  const [meio, setMeio] = useState<Modalidade>("pix");
  const [parcelas, setParcelas] = useState(2);
  const [semJuros, setSemJuros] = useState(3);
  const [comissaoTxt, setComissaoTxt] = useState("20");
  const [assume, setAssume] = useState(false);

  const trocarMeio = (m: Modalidade) => {
    setMeio(m);
    if (m === "cartao_2a6") setParcelas((p) => Math.min(6, Math.max(2, p)));
    if (m === "cartao_7a12") setParcelas((p) => Math.max(7, p));
  };

  const total = lerValor(valorTxt);
  const comissao = comissaoTxt.trim() === "" ? 0 : Number(comissaoTxt.replace(",", "."));
  let erro = "";
  if (!Number.isInteger(total) || total <= 0 || total > 100_000_000) erro = "Informe o valor da venda, por exemplo 150,00.";
  else if (pedidoMinimoCentavos > total) erro = `O pedido mínimo é de ${formatarPreco(pedidoMinimoCentavos)}.`;
  else if (!(comissao >= 0 && comissao < 100)) erro = "Informe a comissão do afiliado entre 0 e 99%.";

  const cartaoParcelado = meio === "cartao_2a6" || meio === "cartao_7a12";
  const faixa = meio === "cartao_2a6" ? [2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
  const taxas: TaxasPlataforma = { taxaTotal, custoLytex: { pix: SEM_CUSTO, boleto: SEM_CUSTO, cartao_1x: SEM_CUSTO, cartao_2a6: SEM_CUSTO, cartao_7a12: SEM_CUSTO }, custoSplit: { percentual: 0, minimoCentavos: 0, maximoCentavos: 0 }, taxaMinimaCentavos, pedidoMinimoCentavos };

  let r: ReturnType<typeof calcularSplit> | null = null;
  if (!erro) {
    try {
      // acima do limite sem juros da loja o comprador paga um acréscimo e a loja paga a taxa do cartão à vista (montar-split.ts)
      const comJuros = cartaoParcelado && parcelas > semJuros;
      r = calcularSplit({
        totalCentavos: total,
        subtotalCentavos: total,
        modalidade: meio,
        taxaTotal: taxaTotal[comJuros ? "cartao_1x" : meio],
        taxaMinimaCentavos,
        acrescimoCentavos: comJuros ? acrescimoParcelamento(total, meio, taxas) : 0,
        custoLytex: SEM_CUSTO,
        custoSplit: taxas.custoSplit,
        comissaoPercentual: comissao,
        assumeTaxaAfiliado: assume,
        indicador: comissao > 0 ? "afiliado" : "nenhum",
      });
    } catch {
      erro = "Não foi possível calcular com esses valores. Confira o valor e a comissão.";
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Valor da venda (R$)
          <input className={campo} inputMode="decimal" value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} aria-describedby={`${id}-res`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Meio de pagamento
          <select className={campo} value={meio} onChange={(e) => trocarMeio(e.target.value as Modalidade)}>
            {MEIOS.map((m) => (
              <option key={m} value={m}>
                {ROTULO_MODALIDADE[m]}
              </option>
            ))}
          </select>
        </label>
        {cartaoParcelado && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Parcelas do comprador
              <select className={campo} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                {faixa.map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Parcelas sem juros da loja
              <select className={campo} value={semJuros} onChange={(e) => setSemJuros(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Só à vista" : `Até ${n}x`}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Comissão do afiliado (%)
          <input className={campo} inputMode="decimal" value={comissaoTxt} onChange={(e) => setComissaoTxt(e.target.value)} />
          <span className="text-xs font-normal text-petroleo/75">Use 0 para venda sem afiliado.</span>
        </label>
        <label className="flex min-h-11 items-center gap-3 self-start text-sm font-medium sm:mt-6">
          <input type="checkbox" checked={assume} onChange={(e) => setAssume(e.target.checked)} className="size-6 shrink-0 accent-petroleo" />
          Loja assume a taxa do afiliado
        </label>
      </div>

      <div id={`${id}-res`} aria-live="polite" className="rounded-2xl bg-gelo p-5">
        {erro || !r ? (
          <p role="alert">{erro}</p>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-petroleo/80">Taxa da plataforma</dt>
                <dd className="text-2xl font-semibold tabular-nums" data-sim="taxa">{formatarPreco(r.taxaTotalCentavos)}</dd>
              </div>
              <div>
                <dt className="text-sm text-petroleo/80">A loja recebe</dt>
                <dd className="text-2xl font-semibold tabular-nums" data-sim="loja">{formatarPreco(r.produtorCentavos)}</dd>
              </div>
              <div>
                <dt className="text-sm text-petroleo/80">O afiliado recebe</dt>
                <dd className="text-2xl font-semibold tabular-nums" data-sim="afiliado">{comissao > 0 ? formatarPreco(r.indicadorCentavos) : "Sem afiliado"}</dd>
              </div>
            </dl>
            {r.acrescimoCentavos > 0 && (
              <p className="mt-3 text-sm">
                Acima de {semJuros}x sem juros, o comprador paga {formatarPreco(r.acrescimoCentavos)} a mais (total de {formatarPreco(r.cobradoCentavos)}) e a loja
                recebe como no cartão à vista.
              </p>
            )}
            {comissao > 0 && (
              <p className="mt-3 text-sm">
                {assume ? "A loja paga toda a taxa e o afiliado recebe a comissão cheia." : `Taxa da loja ${formatarPreco(r.taxaLojaCentavos)} e do afiliado ${formatarPreco(r.taxaAfiliadoCentavos)}.`}
              </p>
            )}
          </>
        )}
      </div>

      {r && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-1 text-left font-medium">Na mesma venda de {formatarPreco(total)}, antes da comissão do afiliado</caption>
            <thead>
              <tr className="text-left text-petroleo/75">
                <th scope="col" className="py-2 pr-3 font-medium">Plataforma</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Taxa</th>
                <th scope="col" className="py-2 text-right font-medium">Sobra</th>
              </tr>
            </thead>
            <tbody>
              {[{ nome: "Staypse", taxa: r.taxaTotalCentavos }, ...CONCORRENTES.map((c) => ({ nome: c.nome, taxa: c.taxaCentavos(total) }))].map((l) => (
                <tr key={l.nome} className={`border-t border-petroleo/10 ${l.nome === "Staypse" ? "font-semibold" : ""}`}>
                  <th scope="row" className="py-2 pr-3 text-left font-[inherit]">{l.nome}</th>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatarPreco(l.taxa)}</td>
                  <td className="py-2 text-right tabular-nums">{formatarPreco(total - l.taxa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-petroleo/75">
            Taxas dos concorrentes por venda, conforme páginas oficiais em {CONCORRENTES_ACESSO_EM}, sem mensalidade e sem afiliado. Podem mudar; confira nas
            páginas deles. Staypse: sem mensalidade nem taxa escondida.
          </p>
        </div>
      )}
    </div>
  );
}
