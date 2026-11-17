"use client";
// Configurações da loja: endereço, nome, descrição, logo e identidade visual
// (cor principal, cor de destaque, fonte e layout), com PRÉVIA AO VIVO.
// A prévia usa a mesma regra de contraste das páginas (lib/tema.ts) e avisa
// quando a cor precisa de ajuste.
import type { CSSProperties } from "react";
import { useState } from "react";
import { EnviarArquivo } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { FONTES_LOJA, LAYOUTS_LOJA, PADRAO, montarTema, type FonteLoja, type LayoutLoja } from "@/lib/tema";
import { problemaNoSlug, sugerirSlug } from "@/lib/vitrine";
import { salvarLoja } from "./acoes";

type Inicial = {
  loja_slug: string | null;
  loja_nome: string | null;
  loja_descricao: string | null;
  loja_foto_path: string | null;
  loja_cor_principal: string | null;
  loja_cor_destaque: string | null;
  loja_fonte: string | null;
  loja_layout: string | null;
};
export type ItemPrevia = { nome: string; preco: string; foto: string | null };

export function FormLoja({
  inicial,
  nomeEmpresa,
  uid,
  site,
  logoUrl,
  itens,
  classesFontes,
}: {
  inicial: Inicial;
  nomeEmpresa: string;
  uid: string;
  site: string;
  logoUrl: string | null;
  itens: ItemPrevia[];
  classesFontes: string;
}) {
  const [slug, setSlug] = useState(inicial.loja_slug ?? sugerirSlug(inicial.loja_nome ?? nomeEmpresa));
  const [nome, setNome] = useState(inicial.loja_nome ?? nomeEmpresa);
  const [principal, setPrincipal] = useState(inicial.loja_cor_principal ?? PADRAO.principal);
  const [destaque, setDestaque] = useState(inicial.loja_cor_destaque ?? PADRAO.destaque);
  const [fonte, setFonte] = useState<FonteLoja>((inicial.loja_fonte as FonteLoja) ?? PADRAO.fonte);
  const [layout, setLayout] = useState<LayoutLoja>((inicial.loja_layout as LayoutLoja) ?? PADRAO.layout);
  const problema = slug ? problemaNoSlug(slug) : null;
  const tema = montarTema({ principal, destaque, fonte, layout });
  const amostra: ItemPrevia[] = itens.length
    ? itens.slice(0, 4)
    : [
        { nome: "Seu produto", preco: "R$ 89,90", foto: null },
        { nome: "Outro produto", preco: "R$ 49,90", foto: null },
      ];

  const seletorCor = (rotulo: string, nomeCampo: string, valor: string, mudar: (v: string) => void, dica: string) => (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {rotulo}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-petroleo/20"
          aria-label={`${rotulo} (seletor)`}
        />
        <input
          name={nomeCampo}
          value={valor}
          onChange={(e) => mudar(e.target.value.toLowerCase())}
          maxLength={7}
          className="w-full min-w-0 rounded-xl border border-petroleo/20 px-3 py-2.5 font-mono text-base font-normal"
          aria-label={`${rotulo} (código)`}
        />
      </span>
      <span className="text-xs font-normal text-petroleo/70">{dica}</span>
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <FormAcao acao={salvarLoja}>
        <Campo rotulo="Nome da loja" name="loja_nome" required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo
          rotulo="Endereço da loja"
          name="loja_slug"
          required
          maxLength={40}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          dica={problema ?? `${site}/loja/${slug || "sua-loja"}`}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Descrição (opcional)
          <textarea
            name="loja_descricao"
            rows={3}
            maxLength={500}
            defaultValue={inicial.loja_descricao ?? ""}
            className="rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
          />
        </label>
        <EnviarArquivo
          bucket="fotos-itens"
          campo="loja_foto_path"
          rotulo="Logo da loja (opcional)"
          uid={uid}
          prefixo="loja"
          aceita="image/jpeg,image/png,image/webp"
          caminhoInicial={inicial.loja_foto_path}
          tamanhoMaximoMb={5}
          dica="JPG, PNG ou WebP, até 5 MB. Quadrada fica melhor."
        />

        <fieldset className="flex flex-col gap-4 border-t border-petroleo/10 pt-4">
          <legend className="text-lg font-extrabold">Identidade visual</legend>
          <div className="grid grid-cols-2 gap-3">
            {seletorCor("Cor principal", "cor_principal", principal, setPrincipal, "Botões e links.")}
            {seletorCor("Cor de destaque", "cor_destaque", destaque, setDestaque, "Selos e detalhes.")}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fonte
            <select
              name="fonte"
              value={fonte}
              onChange={(e) => setFonte(e.target.value as FonteLoja)}
              className="rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal"
            >
              {(Object.keys(FONTES_LOJA) as FonteLoja[]).map((f) => (
                <option key={f} value={f}>
                  {FONTES_LOJA[f]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Layout</span>
            {(Object.keys(LAYOUTS_LOJA) as LayoutLoja[]).map((l) => (
              <label
                key={l}
                className="flex cursor-pointer gap-3 rounded-2xl border border-petroleo/20 px-4 py-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo"
              >
                <input type="radio" name="layout" value={l} checked={layout === l} onChange={() => setLayout(l)} className="mt-0.5 h-4 w-4 accent-petroleo" />
                <span>
                  <span className="block font-medium">{LAYOUTS_LOJA[l].rotulo}</span>
                  <span className="block text-petroleo/70">{LAYOUTS_LOJA[l].dica}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <BotaoEnviar>Salvar loja</BotaoEnviar>
      </FormAcao>

      {/* prévia ao vivo (mesmas regras da página pública) */}
      <section aria-label="Prévia da loja" className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <h2 className="text-lg font-extrabold">Prévia</h2>
        {tema.avisos.map((a) => (
          <p key={a} role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {a}
          </p>
        ))}
        <div
          data-previa
          className={`${classesFontes} overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900`}
          style={{ ...tema.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
        >
          <div className={`flex items-center gap-3 border-b border-neutral-200 px-4 py-3 ${layout === "lista" ? "justify-center" : ""}`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--loja-principal)] text-sm font-semibold text-[var(--loja-principal-texto)]">
                {nome.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-base font-semibold">{nome || "Sua loja"}</span>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {layout === "destaque" && (
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="aspect-[4/5] overflow-hidden rounded-md bg-neutral-100">
                  {amostra[0].foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={amostra[0].foto} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-base font-semibold">{amostra[0].nome}</span>
                  <span className="text-base font-semibold">{amostra[0].preco}</span>
                  <span className="inline-flex w-fit rounded-md bg-[var(--loja-principal)] px-3 py-2 text-sm font-semibold text-[var(--loja-principal-texto)]">
                    Ver produto
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {amostra.map((i) => (
                <div key={i.nome} className={`flex flex-col gap-1 ${layout === "lista" ? "items-center text-center" : ""}`}>
                  <div className={`w-full overflow-hidden rounded-md bg-neutral-100 ${layout === "lista" ? "aspect-[4/5]" : "aspect-square"}`}>
                    {i.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.foto} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="line-clamp-2 text-sm">{i.nome}</span>
                  <span className="text-sm font-semibold">{i.preco}</span>
                </div>
              ))}
            </div>
            <span className="inline-flex w-full justify-center rounded-md bg-[var(--loja-principal)] px-4 py-2.5 text-sm font-semibold text-[var(--loja-principal-texto)]">
              Comprar
            </span>
            <span className="text-sm">
              Indicado por <span className="font-semibold text-[var(--loja-link)] underline">@ana</span>
              <span className="ml-2 inline-block rounded bg-[var(--loja-destaque)] px-2 py-0.5 text-xs font-semibold text-[var(--loja-destaque-texto)]">
                Novo
              </span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
