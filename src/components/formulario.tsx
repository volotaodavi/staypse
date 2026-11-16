"use client";
// Peças de formulário reutilizadas em login, cadastro e painel.
import { useFormStatus } from "react-dom";

// Resultado que toda ação de formulário devolve para a tela.
// "valores": o que a pessoa digitou (NUNCA a senha). O React 19 limpa o
// formulário depois de cada envio; devolvendo os valores, a tela preenche
// de novo e ninguém precisa redigitar tudo por causa de um erro.
export type EstadoFormulario =
  | { erro?: string; sucesso?: string; valores?: Record<string, string> }
  | undefined;

export function Campo({
  rotulo,
  dica,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string; dica?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {rotulo}
      <input
        {...props}
        className="w-full min-w-0 rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
      />
      {dica && <span className="text-xs font-normal text-petroleo/70">{dica}</span>}
    </label>
  );
}

// Botão que mostra "Aguarde..." enquanto a ação roda.
export function BotaoEnviar({
  children,
  variante = "destaque",
}: {
  children: React.ReactNode;
  variante?: "destaque" | "base";
}) {
  const { pending } = useFormStatus();
  const cores =
    variante === "destaque"
      ? "bg-ciano text-petroleo hover:brightness-95"
      : "bg-petroleo text-branco hover:bg-petroleo/90";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-full px-6 py-3 font-medium transition disabled:opacity-60 ${cores}`}
    >
      {pending ? "Aguarde..." : children}
    </button>
  );
}

// Mensagem de erro ou sucesso. Nunca ciano sobre fundo claro: usamos petróleo.
export function Aviso({ estado }: { estado: EstadoFormulario }) {
  if (!estado?.erro && !estado?.sucesso) return null;
  const erro = Boolean(estado.erro);
  return (
    <p
      role={erro ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${
        erro ? "bg-red-50 text-red-800" : "bg-gelo text-petroleo"
      }`}
    >
      {estado.erro ?? estado.sucesso}
    </p>
  );
}
