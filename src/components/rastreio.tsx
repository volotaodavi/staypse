"use client";
// Peças que rodam no navegador nas páginas públicas:
//  - LinkRastreado: link externo que registra o clique SEM mudar o endereço
//    (o href continua exatamente o link que o revendedor colou).
//  - CopiarLink: copia um endereço com um toque.
import { useState } from "react";

type Clique = { vitrine: string; link: string };

// sendBeacon: o navegador entrega mesmo se a pessoa já saiu da página.
function enviarClique(dados: Clique) {
  const corpo = JSON.stringify(dados);
  if (!navigator.sendBeacon?.("/api/clique", corpo)) {
    fetch("/api/clique", {
      method: "POST",
      body: corpo,
      keepalive: true,
    }).catch(() => {});
  }
}

export function LinkRastreado({
  href,
  vitrine,
  linkId,
  className,
  children,
}: {
  href: string;
  vitrine: string;
  linkId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      // publicidade: buscadores não seguem; o outro site não controla esta aba
      rel="nofollow sponsored noopener noreferrer"
      className={className}
      onClick={() => enviarClique({ vitrine, link: linkId })}
    >
      {children}
    <span className="sr-only"> (abre em nova aba)</span></a>
  );
}

export function CopiarLink({
  url,
  rotulo = "Copiar link",
  className,
}: {
  url: string;
  rotulo?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  return (
    <>
      <button
        type="button"
        className={
          className ??
          "rounded-full border border-petroleo/30 px-4 py-2 text-sm font-medium text-petroleo hover:bg-gelo"
        }
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          } catch {
            window.prompt("Copie o link:", url);
          }
        }}
      >
        {copiado ? "Copiado!" : rotulo}
      </button>
      {/* região de status fixa, fora do botão: leitores de tela anunciam a cópia */}
      <span role="status" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
    </>
  );
}
