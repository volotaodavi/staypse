"use client";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { ASSUNTOS_ATENDIMENTO } from "@/lib/pedidos";
import { abrirAtendimento } from "./acoes";

const campo = "w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none";

export function FormAtendimento({ inicial }: { inicial: { nome: string; email: string; pedido: string; assunto: string } }) {
  return (
    <FormAcao acao={abrirAtendimento}>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Não preencha
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Campo rotulo="Nome" name="nome" autoComplete="name" required maxLength={120} defaultValue={inicial.nome} />
      <Campo rotulo="E-mail para a resposta" name="email" type="email" autoComplete="email" required defaultValue={inicial.email} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Assunto
        <select name="assunto" required defaultValue={inicial.assunto} className={campo}>
          <option value="" disabled>
            Escolha
          </option>
          {Object.entries(ASSUNTOS_ATENDIMENTO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <Campo
        rotulo="Código do pedido (se for sobre uma compra)"
        name="pedido"
        maxLength={12}
        autoComplete="off"
        defaultValue={inicial.pedido}
        dica="Está na página do pedido. Use o mesmo e-mail da compra."
      />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mensagem
        <textarea name="mensagem" required minLength={10} maxLength={4000} rows={6} className={campo} />
      </label>
      <BotaoEnviar variante="base">Enviar</BotaoEnviar>
    </FormAcao>
  );
}
