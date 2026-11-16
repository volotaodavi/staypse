"use client";
// Formulário de login com duas abas: senha ou link mágico.
import { useActionState, useState } from "react";
import { Aviso, BotaoEnviar, Campo } from "@/components/formulario";
import { entrarComSenha, enviarLinkMagico } from "./acoes";

export function FormEntrar({ proximo }: { proximo: string }) {
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [estadoSenha, acaoSenha] = useActionState(entrarComSenha, undefined);
  const [estadoLink, acaoLink] = useActionState(enviarLinkMagico, undefined);

  const aba = (valor: "senha" | "link", texto: string) => (
    <button
      type="button"
      onClick={() => setModo(valor)}
      aria-pressed={modo === valor}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
        modo === valor ? "bg-petroleo text-branco" : "text-petroleo"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-full bg-gelo p-1">
        {aba("senha", "Com senha")}
        {aba("link", "Link por e-mail")}
      </div>

      {modo === "senha" ? (
        <form action={acaoSenha} className="flex flex-col gap-4">
          <input type="hidden" name="proximo" value={proximo} />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={estadoSenha?.valores?.email}
          />
          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
          />
          <Aviso estado={estadoSenha} />
          <BotaoEnviar>Entrar</BotaoEnviar>
        </form>
      ) : (
        <form action={acaoLink} className="flex flex-col gap-4">
          <input type="hidden" name="proximo" value={proximo} />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={estadoLink?.valores?.email}
            dica="Enviaremos um link para você entrar sem senha."
          />
          <Aviso estado={estadoLink} />
          <BotaoEnviar>Enviar link de acesso</BotaoEnviar>
        </form>
      )}
    </div>
  );
}
