"use client";
import { useState } from "react";
import { BotaoEnviar, FormAcao } from "@/components/formulario";
import { salvarParcelamento } from "./acoes";

const campo = "min-h-12 w-full rounded-xl border border-petroleo/40 bg-white px-3";

export function FormParcelamento({ inicial }: { inicial: { max: number; semJuros: number } }) {
  const [max, setMax] = useState(inicial.max);
  const [semJuros, setSemJuros] = useState(Math.min(inicial.semJuros, inicial.max));
  const trocarMax = (n: number) => {
    setMax(n);
    setSemJuros((atual) => Math.min(atual, n));
  };
  return (
    <FormAcao acao={salvarParcelamento}>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Parcelar em até
        <select name="parcelas_max" value={max} onChange={(e) => trocarMax(Number(e.target.value))} className={campo}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "1x (só à vista)" : `${n}x`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Sem juros até
        <select name="parcelas_sem_juros" value={semJuros} onChange={(e) => setSemJuros(Number(e.target.value))} className={campo}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "1x (sem parcelas sem juros)" : `${n}x sem juros`}
            </option>
          ))}
        </select>
        <span className="text-sm font-normal text-petroleo/80">
          Nessas parcelas você absorve a taxa do cartão parcelado. Acima delas, o comprador paga um acréscimo que cobre só a diferença da taxa, e você
          recebe o mesmo que receberia no cartão à vista.
        </span>
      </label>
      <BotaoEnviar>Salvar parcelamento</BotaoEnviar>
    </FormAcao>
  );
}
