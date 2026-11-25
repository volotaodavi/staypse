"use client";

// Botão de ação que não dá para desfazer: pede confirmação antes de enviar o formulário.
export function BotaoConfirmar({ pergunta, className, children }: { pergunta: string; className?: string; children: React.ReactNode }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(pergunta)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
