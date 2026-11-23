"use client";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { MOTIVOS_DENUNCIA } from "@/lib/denuncias";
import { enviarDenuncia } from "./acoes";

const campo =
  "w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none";

export function FormDenuncia({ tipo, id }: { tipo: string; id: string }) {
  return (
    <FormAcao acao={enviarDenuncia}>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Não preencha
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Motivo
        <select name="motivo" required defaultValue="" className={campo}>
          <option value="" disabled>
            Escolha
          </option>
          {Object.entries(MOTIVOS_DENUNCIA).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        O que aconteceu?
        <textarea name="descricao" required minLength={10} maxLength={1000} rows={5} className={campo} />
        <span className="text-xs font-normal text-petroleo/70">De 10 a 1000 letras. Não coloque dados pessoais seus.</span>
      </label>
      <Campo rotulo="E-mail (opcional)" name="email" type="email" autoComplete="email" dica="Só para a Staypse poder responder, se precisar." />
      <BotaoEnviar variante="base">Enviar denúncia</BotaoEnviar>
    </FormAcao>
  );
}
