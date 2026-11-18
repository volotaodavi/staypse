"use client";
// Botões de compartilhar: WhatsApp com texto pronto + copiar link.
import { useState } from "react";

export function Compartilhar({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  // Texto sem promessa de ganho (regra de comunicação da Staypse)
  const mensagem =
    `Entrei na lista de espera da Staypse, uma plataforma de afiliados para produtos ` +
    `físicos e digitais. Se quiser entrar também, use meu link: ${link}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // navegador sem permissão de área de transferência: seleciona o texto
      document.getElementById("link-indicacao")?.focus();
      (document.getElementById("link-indicacao") as HTMLInputElement | null)?.select();
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-ciano px-6 py-4 text-center font-medium text-petroleo hover:brightness-95"
      >
        Compartilhar no WhatsApp
        <span className="sr-only"> (abre em nova aba)</span>
      </a>

      <label className="text-sm font-medium" htmlFor="link-indicacao">
        Seu link de indicação
      </label>
      <div className="flex gap-2">
        <input
          id="link-indicacao"
          readOnly
          value={link}
          className="min-w-0 flex-1 rounded-xl border border-petroleo/60 bg-gelo px-3 py-3 text-sm"
        />
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 rounded-xl bg-petroleo px-4 py-3 text-sm font-medium text-branco"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <span role="status" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
    </div>
  );
}
