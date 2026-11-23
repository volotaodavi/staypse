"use client";
import { useState } from "react";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { salvarFrete } from "../../loja/pedidos/acoes";

export function FormFrete({ inicial }: { inicial: { envia: string; quem: string; fixo: string; gratis: string; prazo: string } }) {
  const [envia, setEnvia] = useState(inicial.envia);
  const [quem, setQuem] = useState(inicial.quem);
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
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Quem paga o frete?</legend>
            {[
              ["loja", "Eu assumo o frete", "O comprador vê \"Frete grátis\" em qualquer valor de compra."],
              ["comprador", "O comprador paga o frete", "Você define o valor por pedido e, se quiser, a partir de quanto o frete é grátis."],
            ].map(([valor, rotulo, ajuda]) => (
              <label
                key={valor}
                className="flex cursor-pointer gap-3 rounded-2xl border border-petroleo/40 px-4 py-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo"
              >
                <input type="radio" name="quem_paga" value={valor} checked={quem === valor} onChange={() => setQuem(valor)} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
                <span>
                  <span className="block font-medium">{rotulo}</span>
                  <span className="block text-petroleo/80">{ajuda}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {quem === "comprador" && (
            <>
              <Campo rotulo="Frete por pedido (R$)" name="fixo" inputMode="decimal" required placeholder="19,90" defaultValue={inicial.fixo} dica="Use 0 para frete grátis sempre." />
              <Campo rotulo="Frete grátis acima de (R$, opcional)" name="gratis" inputMode="decimal" placeholder="199,00" defaultValue={inicial.gratis} />
            </>
          )}
          <Campo rotulo="Prazo de entrega após a postagem (dias úteis)" name="prazo" type="number" min={1} max={60} required defaultValue={inicial.prazo} />
        </>
      )}
      <BotaoEnviar>Salvar frete</BotaoEnviar>
    </FormAcao>
  );
}
