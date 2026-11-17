"use client";
// Galeria do produto: no celular, desliza com o dedo (uma foto por vez, com
// contador "1 de 4"); no computador, as miniaturas trocam a foto grande.
import Image from "next/image";
import { useRef, useState } from "react";

export function GaleriaFotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const trilho = useRef<HTMLDivElement>(null);

  if (fotos.length === 0) {
    return <div className="flex aspect-square w-full items-center justify-center rounded-md bg-neutral-100 text-sm text-neutral-500">Sem foto</div>;
  }

  const irPara = (i: number) => {
    setAtual(i);
    const el = trilho.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div
          ref={trilho}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtual(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-label="Fotos do produto"
        >
          {fotos.map((url, i) => (
            <div key={url} className="relative aspect-square w-full shrink-0 snap-center bg-neutral-100">
              <Image
                src={url}
                alt={i === 0 ? nome : `${nome} — foto ${i + 1}`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {fotos.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded bg-white/90 px-2 py-1 text-sm text-neutral-800 md:hidden" aria-live="polite">
            {atual + 1} de {fotos.length}
          </span>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="hidden gap-2 md:flex">
          {fotos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={atual === i}
              className={`relative h-16 w-16 overflow-hidden rounded-md bg-neutral-100 ring-2 ${atual === i ? "ring-[var(--loja-principal)]" : "ring-transparent"}`}
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
