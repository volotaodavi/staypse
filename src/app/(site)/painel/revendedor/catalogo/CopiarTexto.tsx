"use client";
// "Copiar texto": copia o texto de divulgação pronto da loja para a área de transferência.
import { useState } from "react";

export function CopiarTexto({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <>
      <button
        type="button"
        data-copiar-texto
        className="min-h-11 w-full rounded-full border border-petroleo px-4 py-2 text-sm font-medium text-petroleo hover:bg-gelo"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          } catch {
            window.prompt("Copie o texto:", texto);
          }
        }}
      >
        {copiado ? "Texto copiado!" : "Copiar texto"}
      </button>
      {/* região de status fixa, fora do botão: leitores de tela anunciam a cópia */}
      <span role="status" className="sr-only">
        {copiado ? "Texto copiado." : ""}
      </span>
    </>
  );
}
