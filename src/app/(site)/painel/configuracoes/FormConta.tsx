"use client";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import type { CampoEmail } from "@/lib/preferencias-notificacao";
import { salvarConfiguracoesConta } from "./acoes";

type Props = {
  nome: string;
  telefone: string;
  email: string;
  avisos: { campo: CampoEmail; rotulo: string; descricao: string; ligado: boolean }[];
};

const caixa = "flex min-h-11 items-start gap-3 rounded-xl border border-petroleo/30 bg-branco px-4 py-3 text-base";

export function FormConta({ nome, telefone, email, avisos }: Props) {
  return (
    <FormAcao acao={salvarConfiguracoesConta}>
      <fieldset className="grid gap-4 rounded-3xl bg-branco p-5 sm:p-6">
        <legend className="px-1 text-xl">Contato</legend>
        <Campo rotulo="Nome" name="nome" required minLength={2} maxLength={120} defaultValue={nome} autoComplete="name" />
        <Campo
          rotulo="Telefone (opcional)"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={telefone}
          dica="Com DDD, por exemplo (11) 91234-5678."
        />
        <p className="text-sm text-petroleo/80">
          E-mail de acesso: <span className="font-medium">{email}</span>. É nele que você recebe os avisos abaixo.
        </p>
      </fieldset>

      {avisos.length > 0 ? (
        <fieldset className="flex flex-col gap-3 rounded-3xl bg-branco p-5 sm:p-6">
          <legend className="px-1 text-xl">Avisos por e-mail</legend>
          <p className="text-sm text-petroleo/80">
            Todos os avisos aparecem no sininho do painel. Aqui você escolhe quais também chegam por e-mail.
          </p>
          {avisos.map((a) => (
            <label key={a.campo} className={caixa}>
              <input type="checkbox" name={a.campo} defaultChecked={a.ligado} className="mt-0.5 size-5 shrink-0" />
              <span className="flex flex-col">
                <span className="font-medium">{a.rotulo}</span>
                <span className="text-sm text-petroleo/80">{a.descricao}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="rounded-3xl bg-branco p-5 text-sm text-petroleo/80 sm:p-6">
          Como administrador, você recebe os avisos (denúncias e lojas para análise) no sininho do painel.
        </p>
      )}

      <BotaoEnviar variante="base">Salvar configurações</BotaoEnviar>
    </FormAcao>
  );
}
