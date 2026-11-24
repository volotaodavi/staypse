"use client";
import { useState } from "react";
import { BotaoEnviar, FormAcao } from "@/components/formulario";
import { salvarAssumeTaxa } from "./acoes";

export function FormAssumeTaxa({ inicial }: { inicial: boolean }) {
  const [assume, setAssume] = useState(inicial);
  return (
    <FormAcao acao={salvarAssumeTaxa}>
      <label className="flex min-h-11 items-start gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="assume_taxa_afiliado"
          checked={assume}
          onChange={(e) => setAssume(e.target.checked)}
          className="mt-0.5 size-6 shrink-0 accent-petroleo"
        />
        <span>
          Minha loja paga a taxa do afiliado
          <span className="mt-1 block font-normal text-petroleo/80">
            Desligado (padrão): loja e afiliado dividem a taxa, cada um na proporção da sua parte. Ligado: o afiliado recebe a comissão cheia e a loja
            paga a taxa inteira. O total cobrado do comprador não muda. Os produtos da sua loja aparecem no catálogo com o aviso &quot;Loja paga a taxa&quot;.
          </span>
        </span>
      </label>
      <BotaoEnviar>Salvar opção</BotaoEnviar>
    </FormAcao>
  );
}
