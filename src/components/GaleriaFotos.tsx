"use client";
// Galeria do produto: desliza com o dedo (uma foto por vez), tem botões
// "anterior/próxima", miniaturas e ampliação em tela cheia. Tudo funciona com
// toque, mouse e teclado: setas trocam a foto e ESC fecha a ampliação.
// A ampliação usa o <dialog> nativo (showModal): o foco fica preso dentro dela
// e volta ao botão "Ampliar" quando ela fecha.
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const iconeSeta = (dir: "esq" | "dir") => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

export function GaleriaFotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const trilho = useRef<HTMLDivElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  // abre/fecha o <dialog> conforme o estado (o ESC nativo avisa pelo evento "close")
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (ampliada && !d.open) d.showModal();
    if (!ampliada && d.open) d.close();
  }, [ampliada]);

  if (fotos.length === 0) {
    return <div className="flex aspect-square w-full items-center justify-center rounded-md bg-neutral-100 text-sm text-neutral-600">Sem foto</div>;
  }

  const total = fotos.length;
  const irPara = (i: number) => {
    const destino = (i + total) % total;
    setAtual(destino);
    const el = trilho.current;
    if (el) el.scrollTo({ left: destino * el.clientWidth, behavior: semAnimacao() ? "auto" : "smooth" });
  };
  // dentro da ampliação só o estado muda; ao fechar, o trilho acompanha
  const fechar = () => {
    setAmpliada(false);
    const el = trilho.current;
    if (el) el.scrollTo({ left: atual * el.clientWidth, behavior: "auto" });
  };

  const botao =
    "flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-sm ring-1 ring-neutral-300 hover:bg-white";
  const seta = `${botao} absolute top-1/2 -translate-y-1/2`;

  return (
    <div className="flex flex-col gap-3" role="group" aria-roledescription="galeria" aria-label={`Fotos de ${nome}`}>
      <div className="relative">
        <div
          ref={trilho}
          tabIndex={0}
          aria-label={`Foto ${atual + 1} de ${total}. Use as setas para trocar.`}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtual(Math.round(el.scrollLeft / el.clientWidth));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") irPara(atual + 1);
            if (e.key === "ArrowLeft") irPara(atual - 1);
            if (e.key === "Enter") setAmpliada(true);
          }}
        >
          {fotos.map((url, i) => (
            <div key={url} className="relative aspect-square w-full shrink-0 cursor-zoom-in snap-center bg-neutral-100" onClick={() => setAmpliada(true)}>
              <Image
                src={url}
                alt={i === 0 ? nome : `${nome}, foto ${i + 1}`}
                fill
                sizes="(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setAmpliada(true)} aria-label="Ampliar foto" className={`${botao} absolute top-2 right-2`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
        {total > 1 && (
          <>
            <button type="button" onClick={() => irPara(atual - 1)} aria-label="Foto anterior" className={`${seta} left-2`}>
              {iconeSeta("esq")}
            </button>
            <button type="button" onClick={() => irPara(atual + 1)} aria-label="Próxima foto" className={`${seta} right-2`}>
              {iconeSeta("dir")}
            </button>
            <span className="absolute bottom-2 left-2 rounded bg-white/95 px-2 py-1 text-sm text-neutral-900 tabular-nums" aria-live="polite">
              {atual + 1} de {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="flex gap-2 overflow-x-auto p-1 [scrollbar-width:thin]">
          {fotos.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => irPara(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={atual === i}
                className={`relative block h-16 w-16 overflow-hidden rounded-md bg-neutral-100 ${
                  atual === i ? "ring-[3px] ring-[var(--loja-link)]" : "ring-1 ring-neutral-300"
                }`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ampliação: só carrega a imagem grande quando abre */}
      <dialog
        ref={dialogo}
        aria-label={`Foto ampliada de ${nome}`}
        onClose={() => ampliada && fechar()}
        onClick={(e) => e.target === e.currentTarget && fechar()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setAtual((a) => (a + 1) % total);
          if (e.key === "ArrowLeft") setAtual((a) => (a - 1 + total) % total);
        }}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-black p-0 text-white open:flex open:flex-col backdrop:bg-black"
      >
        {ampliada && (
          <>
            <div className="flex items-center justify-between gap-4 px-4 py-2">
              <p className="text-sm tabular-nums" aria-live="polite">
                {atual + 1} de {total}
              </p>
              <button type="button" onClick={fechar} autoFocus className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-neutral-900">
                Fechar
              </button>
            </div>
            <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && fechar()}>
              <Image
                src={fotos[atual]}
                alt={atual === 0 ? nome : `${nome}, foto ${atual + 1}`}
                fill
                sizes="100vw"
                className="pointer-events-none object-contain"
              />
              {total > 1 && (
                <>
                  <button type="button" onClick={() => setAtual((atual - 1 + total) % total)} aria-label="Foto anterior" className={`${seta} left-3`}>
                    {iconeSeta("esq")}
                  </button>
                  <button type="button" onClick={() => setAtual((atual + 1) % total)} aria-label="Próxima foto" className={`${seta} right-3`}>
                    {iconeSeta("dir")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
