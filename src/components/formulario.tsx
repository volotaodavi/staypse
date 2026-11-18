"use client";
// Peças de formulário reutilizadas em login, cadastro e painel.
import { createContext, useActionState, useContext, useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";

// "Enviando..." para formulários que usam <FormAcao> (sem action no <form>)
const EnviandoContexto = createContext(false);

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
        className="w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
      />
      {dica && <span className="text-xs font-normal text-petroleo/70">{dica}</span>}
    </label>
  );
}

// Botão que mostra "Aguarde..." enquanto a ação roda.
export function BotaoEnviar({
  children,
  variante = "destaque",
  name,
  value,
}: {
  children: React.ReactNode;
  variante?: "destaque" | "base";
  // para formulários com mais de um botão (ex.: "Salvar rascunho" / "Enviar")
  name?: string;
  value?: string;
}) {
  const { pending: pendenteForm } = useFormStatus();
  const pendenteFormAcao = useContext(EnviandoContexto);
  const pending = pendenteForm || pendenteFormAcao;
  const cores =
    variante === "destaque"
      ? "bg-ciano text-petroleo hover:brightness-95"
      : "bg-petroleo text-branco hover:bg-petroleo/90";
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`w-full rounded-full px-6 py-3 font-medium transition disabled:opacity-60 ${cores}`}
    >
      {pending ? "Aguarde..." : children}
    </button>
  );
}

// Mensagem de erro ou sucesso. Nunca ciano sobre fundo claro: usamos petróleo.
// Ao aparecer, recebe o foco: quem usa leitor de tela ou está no fim de um
// formulário longo no celular vê na hora o que aconteceu (WCAG 3.3.1 / 4.1.3).
export function Aviso({ estado }: { estado: EstadoFormulario }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const texto = estado?.erro ?? estado?.sucesso;
  useEffect(() => {
    if (texto) ref.current?.focus({ preventScroll: false });
  }, [estado, texto]);
  if (!texto) return null;
  const erro = Boolean(estado?.erro);
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role={erro ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm outline-none ${
        erro ? "bg-red-50 text-red-800" : "bg-gelo text-petroleo"
      }`}
    >
      {texto}
    </p>
  );
}

// Formulário que chama uma ação do servidor SEM apagar os campos depois.
// (o React 19 limpa formulários que usam action={...}; aqui enviamos "na mão")
// Também informa qual botão foi tocado (ex.: intencao=rascunho/analise).
export function FormAcao({
  acao,
  children,
  className = "flex flex-col gap-4",
}: {
  acao: (anterior: EstadoFormulario, dados: FormData) => Promise<EstadoFormulario>;
  children: React.ReactNode;
  className?: string;
}) {
  const [estado, despachar] = useActionState(acao, undefined);
  const [enviando, iniciar] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(evento) => {
        evento.preventDefault();
        const botao = (evento.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const dados = new FormData(evento.currentTarget, botao);
        iniciar(() => despachar(dados));
      }}
    >
      <EnviandoContexto value={enviando}>
        {children}
        <Aviso estado={estado} />
      </EnviandoContexto>
    </form>
  );
}
