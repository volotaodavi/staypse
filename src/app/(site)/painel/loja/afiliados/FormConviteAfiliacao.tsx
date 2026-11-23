"use client";
// "Gerar link de convite" por produto. O link aparece UMA vez (no banco fica só o
// hash do código): a loja copia ou manda pelo WhatsApp para o afiliado escolhido.
import { useActionState } from "react";
import { Aviso } from "@/components/formulario";
import { linkWhatsapp } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { criarConviteAfiliacao } from "./acoes";

const estiloCampo =
  "min-h-11 w-full rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none";

export function FormConviteAfiliacao({ itens, loja }: { itens: { id: string; nome: string }[]; loja: string }) {
  const [estado, acao, pendente] = useActionState(criarConviteAfiliacao, undefined);

  if (itens.length === 0) {
    return <p className="rounded-2xl bg-branco p-4 text-sm text-petroleo/80">Quando você tiver um produto aprovado, poderá gerar convites aqui.</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-branco p-4">
      <form action={acao} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
          Produto do convite
          <select name="item_id" defaultValue={estado?.valores?.item_id ?? itens[0].id} className={estiloCampo}>
            {itens.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pendente}
          className="min-h-11 rounded-full bg-petroleo px-5 py-2.5 font-medium text-branco hover:bg-petroleo/90 disabled:opacity-60"
        >
          {pendente ? "Gerando..." : "Gerar link de convite"}
        </button>
      </form>
      {estado?.erro && <Aviso estado={estado} />}
      {estado?.sucesso && (
        <div className="flex flex-col gap-3" data-convite-afiliacao>
          <p role="status" className="rounded-xl bg-gelo px-4 py-3 text-sm">
            Link criado. Ele aparece só agora: copie e envie para a pessoa que você escolheu. Vale por 30 dias, é de uso único e
            quem entra por ele já fica aprovado neste produto (precisa ter o cadastro de recebimento aprovado).
          </p>
          <p className="break-all rounded-lg bg-gelo px-3 py-2 text-xs" data-link-convite-afiliacao>
            {estado.sucesso}
          </p>
          <div className="flex flex-wrap gap-2">
            <CopiarLink
              url={estado.sucesso}
              rotulo="Copiar link do convite"
              className="min-h-11 rounded-full border border-petroleo/30 px-4 text-sm font-medium text-petroleo hover:bg-gelo"
            />
            <a
              href={linkWhatsapp(`Oi! A loja ${loja} convidou você para ser afiliado(a) de um produto na Staypse. Aceite aqui:\n${estado.sucesso}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-4 text-sm font-medium text-branco"
            >
              Enviar no WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
