"use client";
// Galeria de modelos: cada miniatura é o PRÓPRIO modelo renderizado (o mesmo motor da
// loja) com o nome, o logo e os produtos da loja, reduzido a 41% do tamanho de um celular.
import type { CSSProperties } from "react";
import { useId } from "react";
import { AnuncioLoja, CabecalhoLoja, itensDoMenu } from "@/components/loja";
import { SecoesLoja, type DadosSobre } from "@/components/loja-secoes";
import type { ItemLoja } from "@/lib/publico";
import { montarTema } from "@/lib/tema";
import { LISTA_MODELOS, MODELOS_LOJA, restaurarModelo, varsDoModelo, type ModeloLoja, type TemaLoja } from "@/lib/tema-loja";

const LARGURA = 390;
const ESCALA = 0.41;

function Miniatura({ modelo, tema, itens, sobre, logo, classesFontes }: { modelo: ModeloLoja; tema: TemaLoja; itens: ItemLoja[]; sobre: DadosSobre; logo: string | null; classesFontes: string }) {
  const cfg = MODELOS_LOJA[modelo];
  const t = restaurarModelo(tema, modelo);
  const visual = montarTema({ principal: cfg.principal, destaque: cfg.destaque, fonte: cfg.fonte });
  return (
    <div className="relative mx-auto h-60 overflow-hidden rounded-xl border border-petroleo/20 bg-white" style={{ width: LARGURA * ESCALA }} aria-hidden="true">
      <div
        inert
        data-miniatura={modelo}
        className={`${classesFontes} @container bg-[var(--loja-fundo)] text-neutral-900`}
        style={{ width: LARGURA, transform: `scale(${ESCALA})`, transformOrigin: "top left", ...varsDoModelo(modelo), ...visual.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
      >
        <AnuncioLoja anuncio={t.anuncio} previa />
        <CabecalhoLoja previa href="#" slug={sobre.slug} nome={sobre.nome} logo={logo} tipo={cfg.cabecalho} menu={itensDoMenu(t, sobre.slug, itens)} busca={t.cabecalho.busca} />
        <SecoesLoja previa tema={t} itens={itens} sobre={sobre} />
      </div>
    </div>
  );
}

export function GaleriaModelos(props: {
  valor: ModeloLoja;
  aoEscolher: (m: ModeloLoja) => void;
  tema: TemaLoja;
  itens: ItemLoja[];
  sobre: DadosSobre;
  logo: string | null;
  classesFontes: string;
}) {
  const nome = useId();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {LISTA_MODELOS.map((m) => (
        <label
          key={m}
          className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-petroleo/40 bg-branco p-2 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:checked]:ring-2 has-[:checked]:ring-petroleo has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo"
        >
          <Miniatura modelo={m} tema={props.tema} itens={props.itens} sobre={props.sobre} logo={props.logo} classesFontes={props.classesFontes} />
          <span className="flex items-start gap-2 px-1 pb-1">
            <input type="radio" name={`${nome}-modelo`} value={m} checked={props.valor === m} onChange={() => props.aoEscolher(m)} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
            <span>
              <span className="block font-semibold">{MODELOS_LOJA[m].rotulo}</span>
              <span className="block text-petroleo/80">{MODELOS_LOJA[m].nichos}</span>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
