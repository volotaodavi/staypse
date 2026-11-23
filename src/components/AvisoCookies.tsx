"use client";
// Aviso discreto sobre o cookie de atribuição (lojas e vitrines). Informativo
// (Guia de Cookies da ANPD): só há cookies próprios, sem analytics nem terceiros;
// o de atribuição não é "estritamente necessário" e se apoia no legítimo interesse
// (ver /cookies). SE algum dia entrar analytics, pixel ou embed de terceiros, este
// aviso precisa virar OPT-IN (bloquear até o aceite), não basta o "Entendi". Some depois do "Entendi" (guardado só neste navegador).
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const CHAVE = "staypse_aviso_cookies";

// lê o armazenamento local. No servidor o aviso já vem desenhado (quem nunca viu
// o aviso não leva um "empurrão" no conteúdo quando a página carrega: CLS 0);
// quem já clicou em "Entendi" tem o aviso removido logo após carregar.
const lerVisto = () => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return "sem-armazenamento";
  }
};
const assinar = (avisar: () => void) => {
  window.addEventListener("storage", avisar);
  return () => window.removeEventListener("storage", avisar);
};

export function AvisoCookies() {
  const visto = useSyncExternalStore(assinar, lerVisto, () => null);
  const [fechado, setFechado] = useState(false);

  if (visto || fechado) return null;
  return (
    <div role="region" aria-label="Aviso sobre cookies" className="border-b border-neutral-200 bg-neutral-50 text-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <p className="min-w-0 flex-1">
          Usamos só cookies próprios: um para manter você conectado e outro para lembrar, por 30 dias, quem indicou um produto. Sem
          publicidade nem rastreamento de outras empresas.{" "}
          <Link href="/cookies" className="underline">
            Saiba mais
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(CHAVE, new Date().toISOString());
            } catch {}
            setFechado(true);
          }}
          className="min-h-11 rounded-md border border-neutral-400 px-3 font-medium hover:bg-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
