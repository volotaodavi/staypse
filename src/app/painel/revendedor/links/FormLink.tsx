"use client";
// Adicionar link externo: cola o link → "Buscar dados" preenche título/imagem/preço
// (lidos do próprio site); se não der, preenche à mão. "Salvar link" grava.
import { useActionState } from "react";
import { Aviso, Campo } from "@/components/formulario";
import { adicionarLink } from "../acoes";

export function FormLink() {
  const [estado, acao, enviando] = useActionState(adicionarLink, undefined);
  // depois de cada envio o React limpa o formulário; reaproveitamos o que voltou
  const v = estado?.valores ?? {};

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo
        rotulo="Link do produto"
        name="url"
        type="url"
        inputMode="url"
        required
        maxLength={2000}
        placeholder="https://shopee.com.br/..."
        defaultValue={v.url}
        dica="Shopee, Mercado Livre ou TikTok Shop. O link é salvo exatamente como você colar."
      />
      <button
        name="intencao"
        value="buscar"
        disabled={enviando}
        className="rounded-full border border-petroleo px-5 py-2.5 font-medium disabled:opacity-60"
      >
        {enviando ? "Aguarde..." : "Buscar dados do link"}
      </button>

      <Campo rotulo="Título" name="titulo" maxLength={140} defaultValue={v.titulo} />
      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
        <Campo rotulo="Imagem (opcional)" name="imagem_url" type="url" maxLength={2000} placeholder="https://..." defaultValue={v.imagem_url} />
        <Campo rotulo="Preço (opcional)" name="preco" inputMode="decimal" placeholder="49,90" defaultValue={v.preco} />
      </div>
      <button
        name="intencao"
        value="salvar"
        disabled={enviando}
        className="rounded-full bg-ciano px-5 py-3 font-medium text-petroleo hover:brightness-95 disabled:opacity-60"
      >
        Salvar link
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
