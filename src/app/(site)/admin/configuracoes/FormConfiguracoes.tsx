"use client";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import type { TaxasTexto } from "@/lib/configuracoes";
import { MODALIDADES, ROTULO_MODALIDADE } from "@/lib/pagamentos/taxas";
import { salvarConfiguracoes } from "./acoes";

export type ValoresIniciais = {
  taxas: TaxasTexto;
  comissaoMin: string;
  comissaoMax: string;
  prazoNf: string;
  palavras: string;
  pix: boolean;
  cartao: boolean;
  boleto: boolean;
};

const caixa = "flex min-h-11 items-center gap-3 rounded-xl border border-petroleo/30 bg-branco px-4 text-base";

export function FormConfiguracoes({ inicial }: { inicial: ValoresIniciais }) {
  return (
    <FormAcao acao={salvarConfiguracoes}>
      <fieldset className="grid gap-4 rounded-2xl bg-branco p-4 sm:grid-cols-2 sm:p-5">
        <legend className="px-1 text-lg font-medium">Comissão dos indicadores</legend>
        <Campo rotulo="Comissão mínima (%)" name="comissao_min" inputMode="decimal" required defaultValue={inicial.comissaoMin} dica="Menor comissão que a loja pode definir." />
        <Campo rotulo="Comissão máxima (%)" name="comissao_max" inputMode="decimal" required defaultValue={inicial.comissaoMax} dica="Tem de ser maior ou igual à mínima." />
      </fieldset>

      {MODALIDADES.map((m) => (
        <fieldset key={m} className="grid gap-4 rounded-2xl bg-branco p-4 sm:grid-cols-4 sm:p-5">
          <legend className="px-1 text-lg font-medium">Taxas: {ROTULO_MODALIDADE[m]}</legend>
          <Campo rotulo="Taxa total (%)" name={`taxa_total_${m}_pct`} inputMode="decimal" required defaultValue={inicial.taxas.taxaTotal[m].pct} dica="Cobrada da loja. Única taxa que ela vê." />
          <Campo rotulo="Taxa total, fixo (R$)" name={`taxa_total_${m}_fixo`} inputMode="decimal" required defaultValue={inicial.taxas.taxaTotal[m].fixo} dica="Por venda." />
          <Campo rotulo="Custo Lytex (%)" name={`custo_lytex_${m}_pct`} inputMode="decimal" required defaultValue={inicial.taxas.custoLytex[m].pct} dica="Interno: nunca aparece para a loja." />
          <Campo rotulo="Custo Lytex, fixo (R$)" name={`custo_lytex_${m}_fixo`} inputMode="decimal" required defaultValue={inicial.taxas.custoLytex[m].fixo} dica="A taxa total não pode ficar abaixo." />
        </fieldset>
      ))}

      <fieldset className="grid gap-4 rounded-2xl bg-branco p-4 sm:grid-cols-3 sm:p-5">
        <legend className="px-1 text-lg font-medium">Custo Lytex por divisão (split)</legend>
        <Campo rotulo="Percentual do valor repassado (%)" name="split_pct" inputMode="decimal" required defaultValue={inicial.taxas.split.pct} dica="Interno. Por recebedor." />
        <Campo rotulo="Mínimo (R$)" name="split_min" inputMode="decimal" required defaultValue={inicial.taxas.split.min} />
        <Campo rotulo="Máximo (R$)" name="split_max" inputMode="decimal" required defaultValue={inicial.taxas.split.max} />
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl bg-branco p-4 sm:p-5">
        <legend className="px-1 text-lg font-medium">Nota fiscal</legend>
        <Campo
          rotulo="Prazo para a nota fiscal (dias)"
          name="prazo_nf"
          inputMode="numeric"
          required
          defaultValue={inicial.prazoNf}
          dica="Pedido pago há mais dias que isso, sem nota, entra na fila do admin."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-2xl bg-branco p-4 sm:p-5">
        <legend className="px-1 text-lg font-medium">Meios de pagamento</legend>
        <label className={caixa}>
          <input type="checkbox" name="pix" defaultChecked={inicial.pix} className="h-5 w-5" /> Pix
        </label>
        <label className={caixa}>
          <input type="checkbox" name="cartao" defaultChecked={inicial.cartao} className="h-5 w-5" /> Cartão
        </label>
        <label className={caixa}>
          <input type="checkbox" name="boleto" defaultChecked={inicial.boleto} className="h-5 w-5" /> Boleto
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-2xl bg-branco p-4 sm:p-5">
        <legend className="px-1 text-lg font-medium">Palavras proibidas</legend>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Uma por linha (itens com essas palavras vão para revisão)
          <textarea
            name="palavras"
            rows={8}
            defaultValue={inicial.palavras}
            className="w-full rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none"
          />
        </label>
      </fieldset>

      <BotaoEnviar variante="base">Salvar configurações</BotaoEnviar>
    </FormAcao>
  );
}
