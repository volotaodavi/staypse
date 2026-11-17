"use client";
// Abre a janela de impressão do navegador (lá dá para "Salvar como PDF").
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-petroleo px-5 py-2.5 font-medium text-branco print:hidden">
      Imprimir / salvar PDF
    </button>
  );
}
