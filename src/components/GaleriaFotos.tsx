"use client";
// Galeria do produto: desliza com o dedo (uma foto por vez) e também tem
// botões "anterior/próxima" e miniaturas — funciona com toque, mouse e teclado.
import Image from "next/image";
import { useRef, useState } from "react";

const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function GaleriaFotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const trilho = useRef<HTMLDivElement>(null);

  if (fotos.length === 0) {
    return <div className="flex aspect-square w-full items-center justify-center rounded-md bg-neutral-100 text-sm text-neutral-600">Sem foto</div>;
  }

  const irPara = (i: number) => {
    const destino = (i + fotos.length) % fotos.length;
    setAtual(destino);
    const el = trilho.current;
    if (el) el.scrollTo({ left: destino * el.clientWidth, behavior: semAnimacao() ? "auto" : "smooth" });
  };
  const seta = "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-white";

  return (
    <div className="flex flex-col gap-2" role="group" aria-roledescription="galeria" aria-label={`Fotos de ${nome}`}>
      <div className="relative">
        <div
          ref={trilho}
          tabIndex={0}
          aria-label={`Foto ${atual + 1} de ${fotos.length}. Use as setas para trocar.`}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtual(Math.round(el.scrollLeft / el.clientWidth));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") irPara(atual + 1);
            if (e.key === "ArrowLeft") irPara(atual - 1);
          }}
        >
          {fotos.map((url, i) => (
            <div key={url} className="relative aspect-square w-full shrink-0 snap-center bg-neutral-100">
              <Image
                src={url}
                alt={i === 0 ? nome : `${nome}, foto ${i + 1}`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {fotos.length > 1 && (
          <>
            <button type="button" onClick={() => irPara(atual - 1)} aria-label="Foto anterior" className={`${seta} left-2`}>
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" onClick={() => irPara(atual + 1)} aria-label="Próxima foto" className={`${seta} right-2`}>
              <span aria-hidden="true">›</span>
            </button>
            <span className="absolute right-2 bottom-2 rounded bg-white/95 px-2 py-1 text-sm text-neutral-900" aria-live="polite">
              {atual + 1} de {fotos.length}
            </span>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={atual === i}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 ${
                atual === i ? "ring-[3px] ring-[var(--loja-link)]" : "ring-1 ring-neutral-200"
              }`}
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
