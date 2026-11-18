"use client";
// Aviso discreto sobre o cookie de atribuição (lojas e vitrines). Informativo:
// o cookie é próprio, sem publicidade de terceiros (legítimo interesse — ver
// /cookies). Some depois do "Entendi" (guardado só neste navegador).
import Link from "next/link";
import { useEffect, useState } from "react";

const CHAVE = "staypse_aviso_cookies";

export function AvisoCookies() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setMostrar(true);
    } catch {
      // navegador sem armazenamento local: não insiste no aviso
    }
  }, []);

  if (!mostrar) return null;
  return (
    <div role="region" aria-label="Aviso sobre cookies" className="border-b border-neutral-200 bg-neutral-50 text-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <p className="min-w-0 flex-1">
          Usamos cookies próprios para manter você conectado e lembrar quem indicou um produto.{" "}
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
            setMostrar(false);
          }}
          className="min-h-9 rounded-md border border-neutral-400 px-3 font-medium hover:bg-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
