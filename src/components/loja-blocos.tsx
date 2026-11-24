"use client";
// Blocos da loja que precisam de interação: carrossel de banners e vídeo.
// - Carrossel: sem rotação automática (acessível, sem movimento surpresa); o primeiro
//   banner carrega com prioridade e os demais só quando a pessoa chega neles.
// - Vídeo: nada de terceiros carrega antes do toque em "Assistir". Sem miniatura do
//   YouTube/Vimeo (isso já contaria como acesso). Depois do toque, o player entra.
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { urlDoPlayer, urlDoVideo, type HeroTipo } from "@/lib/tema-loja";

export type SlideBanner = {
  desktop: string | null; // endereço da imagem para computador
  celular: string | null;
  frase: string | null;
  alt: string;
  href: string | null;
  externo: boolean;
  rotuloBotao: string;
};

const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Imagem do slide. Na loja pública, a troca entre celular e computador usa <picture>
// (só uma das duas é baixada). Na prévia do painel, a largura é a do quadro e não a
// da janela, então as duas ficam no HTML e o contêiner (@container) escolhe qual aparece.
function ImagemSlide({ s, prioridade, previa, tipo, comCelular }: { s: SlideBanner; prioridade: boolean; previa: boolean; tipo: HeroTipo; comCelular: boolean }) {
  if (!s.desktop && !s.celular) return null;
  const cheio = tipo === "cheio" || tipo === "empilhado";
  const sizes = cheio ? "100vw" : "(min-width: 1152px) 1152px, 100vw";
  const base = { alt: s.alt, fill: true as const, sizes, className: "object-cover", priority: prioridade, loading: prioridade ? ("eager" as const) : ("lazy" as const) };
  const d = s.desktop ?? s.celular!;
  if (previa) {
    return (
      <>
        <Image {...base} alt={s.alt} src={s.celular ?? d} className={`object-cover ${comCelular ? "@2xl:hidden" : "hidden"}`} priority={false} fetchPriority="auto" />
        <Image {...base} alt={s.alt} src={d} className={`object-cover ${comCelular ? "hidden @2xl:block" : ""}`} priority={false} fetchPriority="auto" />
      </>
    );
  }
  const { props: pd } = getImageProps({ ...base, src: d });
  const { props: pc } = getImageProps({ ...base, src: s.celular ?? d });
  return (
    <picture>
      {s.celular && <source media="(max-width: 671px)" srcSet={pc.srcSet} sizes={sizes} />}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- o alt vem em pd.alt */}
      <img {...pd} fetchPriority={prioridade ? "high" : "auto"} />
    </picture>
  );
}

const seta = (dir: "esq" | "dir") => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

export function CarrosselBanners({
  slides,
  tipo,
  alinha,
  tom,
  previa,
}: {
  slides: SlideBanner[];
  tipo: HeroTipo;
  alinha: "centro" | "esquerda";
  tom: "papel" | "marca";
  previa: boolean;
}) {
  const [atual, setAtual] = useState(0);
  const trilho = useRef<HTMLDivElement>(null);
  const total = slides.length;
  const comCelular = slides.every((s) => !!s.celular);
  const irPara = (i: number) => {
    const el = trilho.current;
    const alvo = (i + total) % total;
    setAtual(alvo);
    if (el) el.scrollTo({ left: alvo * el.clientWidth, behavior: semAnimacao() ? "auto" : "smooth" });
  };

  const dividido = tipo === "dividido";
  const fora = dividido || tipo === "empilhado"; // texto fora da imagem
  // com imagem própria para celular, o banner fica em pé (4:5) no celular
  const proporcao = {
    cheio: [comCelular ? "aspect-[4/5]" : "aspect-[4/3]", "@2xl:aspect-[21/9]"],
    contido: [comCelular ? "aspect-[4/5]" : "aspect-[16/9]", "@2xl:aspect-[21/8]"],
    faixa: [comCelular ? "aspect-[4/5]" : "aspect-[16/7]", "@2xl:aspect-[24/6]"],
    empilhado: [comCelular ? "aspect-[4/5]" : alinha === "centro" ? "aspect-[3/4]" : "aspect-[4/3]", alinha === "centro" ? "@2xl:aspect-[16/8]" : "@2xl:aspect-[16/7]"],
    dividido: [comCelular ? "aspect-[4/5]" : "aspect-[4/3]", "@2xl:aspect-auto @2xl:h-full @2xl:min-h-96"],
  }[tipo].join(" ");
  const arredondar = tipo === "contido" || tipo === "faixa" || dividido ? "rounded-[var(--loja-raio,6px)]" : "";

  const botao = (s: SlideBanner) => {
    if (!s.href) return null;
    const cls =
      "mt-4 inline-flex min-h-12 items-center justify-center rounded-[var(--loja-raio,6px)] bg-[var(--loja-destaque)] px-6 py-3 text-base font-semibold text-[var(--loja-destaque-texto)] hover:opacity-90";
    if (previa) return <span className={cls}>{s.rotuloBotao}</span>;
    return s.externo ? (
      <a href={s.href} rel="noopener noreferrer" className={cls}>
        {s.rotuloBotao}
      </a>
    ) : (
      <Link href={s.href} className={cls}>
        {s.rotuloBotao}
      </Link>
    );
  };

  const texto = (s: SlideBanner) => {
    const h = s.frase && (
      <h2
        className={`text-balance ${tipo === "empilhado" && alinha === "centro" ? "text-3xl font-light tracking-tight @2xl:text-5xl" : "text-2xl font-semibold @2xl:text-4xl"}`}
      >
        {s.frase}
      </h2>
    );
    if (!h && !s.href) return null;
    if (fora) {
      const cor = dividido && tom === "marca" ? "text-[var(--loja-principal-texto)]" : "text-neutral-900";
      return (
        <div className={`flex flex-col ${alinha === "centro" ? "items-center text-center" : "items-start"} justify-center gap-0 p-6 @2xl:p-10 ${cor}`}>
          {h}
          {botao(s)}
        </div>
      );
    }
    // painel escuro sólido sob o texto: contraste AA com qualquer foto
    return (
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-black/75 p-4 text-white @2xl:inset-x-auto @2xl:bottom-8 @2xl:left-8 @2xl:max-w-xl @2xl:p-6">
        {h}
        {botao(s)}
      </div>
    );
  };

  const slide = (s: SlideBanner, i: number) => {
    const imagem = (
      <div className={`relative w-full overflow-hidden bg-neutral-200 ${proporcao} ${fora ? "" : arredondar}`}>
        <ImagemSlide s={s} prioridade={i === 0} previa={previa} tipo={tipo} comCelular={comCelular} />
        {!fora && texto(s)}
      </div>
    );
    if (!s.desktop && !s.celular) {
      // banner só de texto: painel na cor da loja
      return (
        <div className="bg-[var(--loja-principal)] px-6 py-10 text-[var(--loja-principal-texto)] @2xl:py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start">
            {s.frase && <h2 className="text-2xl font-semibold text-balance @2xl:text-4xl">{s.frase}</h2>}
            {botao(s)}
          </div>
        </div>
      );
    }
    if (dividido) {
      return (
        <div
          className={`grid h-full overflow-hidden ${arredondar} @2xl:grid-cols-2 ${
            tom === "marca" ? "bg-[var(--loja-principal)]" : "bg-white"
          }`}
        >
          {imagem}
          <div className="flex items-center @2xl:order-first">{texto(s)}</div>
        </div>
      );
    }
    return (
      <>
        {imagem}
        {tipo === "empilhado" && texto(s)}
      </>
    );
  };

  const envolver = tipo === "cheio" || tipo === "empilhado" ? "w-full" : "mx-auto w-full max-w-6xl px-4 pt-4";

  return (
    <section aria-roledescription="carrossel" aria-label="Banners da loja" className={`${envolver} relative`}>
      <div
        ref={trilho}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtual(Math.round(el.scrollLeft / el.clientWidth));
        }}
        tabIndex={total > 1 ? 0 : undefined}
        aria-label={total > 1 ? "Banners. Use as setas para trocar." : undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") irPara(atual + 1);
          if (e.key === "ArrowLeft") irPara(atual - 1);
        }}
      >
        {slides.map((s, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${total}`} className="w-full shrink-0 snap-center">
            {slide(s, i)}
          </div>
        ))}
      </div>
      {total > 1 && (
        <>
          {!fora &&
            (["esq", "dir"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => irPara(atual + (d === "esq" ? -1 : 1))}
                aria-label={d === "esq" ? "Banner anterior" : "Próximo banner"}
                className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-900 ring-1 ring-neutral-300 hover:bg-white @2xl:flex ${d === "esq" ? "left-6" : "right-6"}`}
              >
                {seta(d)}
              </button>
            ))}
          <ul className="flex items-center justify-center">
            {slides.map((_, i) => (
              <li key={i}>
                <button type="button" onClick={() => irPara(i)} aria-label={`Ir para o banner ${i + 1}`} aria-current={atual === i} className="flex h-11 w-7 items-center justify-center">
                  <span className={`block h-2.5 rounded-full ring-1 ring-neutral-500 ${atual === i ? "w-6 bg-neutral-900" : "w-2.5 bg-white"}`} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ---------- vídeo: o player só entra depois do toque ----------
export function VideoLoja({ video, previa }: { video: { plataforma: "youtube" | "vimeo"; id: string; titulo: string | null }; previa: boolean }) {
  const [ligado, setLigado] = useState(false);
  const nome = video.plataforma === "youtube" ? "YouTube" : "Vimeo";
  const titulo = video.titulo || "Vídeo da loja";
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--loja-raio,6px)] bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]">
        {ligado && !previa ? (
          <iframe
            src={urlDoPlayer(video)}
            title={titulo}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLigado(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
            aria-label={`Assistir: ${titulo}`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--loja-destaque)] text-[var(--loja-destaque-texto)]">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="text-lg font-semibold text-balance">{titulo}</span>
            <span className="max-w-sm text-sm opacity-90">Ao assistir, o vídeo é carregado do {nome}, que pode usar cookies.</span>
          </button>
        )}
      </div>
      {!previa && (
        <a href={urlDoVideo(video)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start text-sm font-medium text-[var(--loja-link)] underline underline-offset-4">
          Abrir no {nome}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      )}
    </div>
  );
}
