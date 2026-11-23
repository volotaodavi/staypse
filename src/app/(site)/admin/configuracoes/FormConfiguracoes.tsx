"use client";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { salvarConfiguracoes } from "./acoes";

export type ValoresIniciais = {
  taxa: string;
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
      <fieldset className="grid gap-4 rounded-2xl bg-branco p-4 sm:grid-cols-3 sm:p-5">
        <legend className="px-1 text-lg font-medium">Taxas e comissão</legend>
        <Campo rotulo="Taxa da Staypse (%)" name="taxa" inputMode="decimal" required defaultValue={inicial.taxa} dica="De 0 a 100." />
        <Campo rotulo="Comissão mínima (%)" name="comissao_min" inputMode="decimal" required defaultValue={inicial.comissaoMin} dica="Menor comissão que a loja pode definir." />
        <Campo rotulo="Comissão máxima (%)" name="comissao_max" inputMode="decimal" required defaultValue={inicial.comissaoMax} dica="Tem de ser maior ou igual à mínima." />
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
