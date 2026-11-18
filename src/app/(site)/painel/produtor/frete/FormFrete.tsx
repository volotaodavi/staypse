"use client";
import { useState } from "react";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { salvarFrete } from "../pedidos/acoes";

export function FormFrete({ inicial }: { inicial: { envia: string; fixo: string; gratis: string; prazo: string } }) {
  const [envia, setEnvia] = useState(inicial.envia);
  return (
    <FormAcao acao={salvarFrete}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Você envia produtos pelo correio ou transportadora?</legend>
        {[
          ["sim", "Sim, envio"],
          ["nao", "Não: só retirada no local e produtos digitais"],
        ].map(([valor, rotulo]) => (
          <label
            key={valor}
            className="flex cursor-pointer gap-3 rounded-2xl border border-petroleo/40 px-4 py-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo"
          >
            <input type="radio" name="envia" value={valor} checked={envia === valor} onChange={() => setEnvia(valor)} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
            {rotulo}
          </label>
        ))}
      </fieldset>
      {envia === "sim" && (
        <>
          <Campo rotulo="Frete por pedido (R$)" name="fixo" inputMode="decimal" required placeholder="19,90" defaultValue={inicial.fixo} dica="Use 0 para frete grátis sempre." />
          <Campo rotulo="Frete grátis acima de (R$, opcional)" name="gratis" inputMode="decimal" placeholder="199,00" defaultValue={inicial.gratis} />
          <Campo rotulo="Prazo de entrega após a postagem (dias úteis)" name="prazo" type="number" min={1} max={60} required defaultValue={inicial.prazo} />
        </>
      )}
      <BotaoEnviar>Salvar frete</BotaoEnviar>
    </FormAcao>
  );
}
