"use client";
// Convidar vendedor próprio: e-mail, comissão (conforme contrato) e forma de
// pagamento da comissão. "Split direto" só para quem NÃO é empregado da loja.
import { useActionState, useState } from "react";
import { Aviso, BotaoEnviar, Campo } from "@/components/formulario";
import { linkWhatsapp } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { convidarVendedor } from "./acoes";

export function FormConvite({ loja }: { loja: string }) {
  const [estado, acao] = useActionState(convidarVendedor, undefined);
  const [forma, setForma] = useState("folha");
  const v = estado?.valores ?? {};

  // convite criado: mostra o link UMA vez (a loja envia ao vendedor)
  if (estado?.sucesso) {
    const link = estado.sucesso;
    return (
      <div className="flex flex-col gap-3" data-convite>
        <p role="status" className="rounded-xl bg-gelo px-4 py-3 text-sm">
          Convite criado para <strong className="font-medium">{v.email}</strong>. Envie o link abaixo para essa pessoa —
          ele vale por 14 dias e só funciona com esse e-mail.
        </p>
        <p className="break-all rounded-lg bg-gelo px-3 py-2 text-xs" data-link-convite>
          {link}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopiarLink url={link} rotulo="Copiar link do convite" />
          <a
            href={linkWhatsapp(`Oi! A ${loja} convidou você para ser vendedor(a) da loja na Staypse. Aceite aqui:\n${link}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco"
          >
            Enviar no WhatsApp
          <span className="sr-only"> (abre em nova aba)</span></a>
        </div>
        <a href="/painel/produtor/vendedores" className="text-sm underline">
          Convidar outra pessoa
        </a>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo rotulo="E-mail do vendedor" name="email" type="email" required autoComplete="off" defaultValue={v.email} />
      <Campo
        rotulo="Comissão (%)"
        name="comissao_percentual"
        inputMode="decimal"
        required
        placeholder="10"
        defaultValue={v.comissao_percentual}
        dica="Conforme o contrato com o vendedor. Não usa a comissão pública do produto."
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Forma de pagamento da comissão</legend>
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-petroleo/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo px-4 py-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo">
          <input type="radio" name="forma_pagamento" value="folha" checked={forma === "folha"} onChange={() => setForma("folha")} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
          <span>
            <span className="block font-medium">Folha de pagamento (padrão, CLT)</span>
            <span className="block text-petroleo/70">
              No split, a parte do vendedor fica com a loja. A Staypse registra e gera o relatório mensal para o RH.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-petroleo/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo px-4 py-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo">
          <input type="radio" name="forma_pagamento" value="split_direto" checked={forma === "split_direto"} onChange={() => setForma("split_direto")} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
          <span>
            <span className="block font-medium">Split direto</span>
            <span className="block text-petroleo/70">Só para vendedor autônomo ou MEI com contrato. Ele recebe a parte dele no split automático.</span>
          </span>
        </label>
      </fieldset>
      {forma === "split_direto" && (
        <label className="flex gap-3 rounded-2xl bg-gelo px-4 py-3 text-sm">
          <input type="checkbox" name="declaracao_nao_empregado" value="sim" required className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
          <span>
            <strong className="font-medium">Este vendedor não é meu empregado.</strong> Declaro que a relação é de prestação de
            serviço (autônomo ou MEI), com contrato.
          </span>
        </label>
      )}
      <BotaoEnviar>Criar convite</BotaoEnviar>
      <Aviso estado={estado} />
    </form>
  );
}
