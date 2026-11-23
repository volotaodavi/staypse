"use client";
// "Minha loja": dados, modelo pronto, logo/cores/fonte, banner, ordem das seções
// e produtos em destaque, com PRÉVIA AO VIVO (celular e computador).
// A prévia usa o MESMO motor da loja pública (components/loja-secoes.tsx) e a
// mesma regra de contraste (lib/tema.ts); só deixa de ter links.
// Sem arrastar e soltar: subir/descer/ocultar são botões comuns, com foco e aviso por voz.
import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { EnviarArquivo } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { CabecalhoLoja } from "@/components/loja";
import { SecoesLoja } from "@/components/loja-secoes";
import { formatarPreco } from "@/lib/produtor";
import type { ItemLoja } from "@/lib/publico";
import { FONTES_LOJA, PADRAO, montarTema, type FonteLoja } from "@/lib/tema";
import {
  LISTA_MODELOS,
  MAX_DESTAQUES,
  MAX_FRASE_BANNER,
  MODELOS_LOJA,
  SECOES_LOJA,
  lerTemaLoja,
  temaDoModelo,
  type ModeloLoja,
  type TemaLoja,
} from "@/lib/tema-loja";
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
  loja_tema: unknown;
};

// Produtos de exemplo (loja ainda sem produto aprovado)
const AMOSTRA: ItemLoja[] = [
  ["Seu primeiro produto", 8990, "casa"],
  ["Outro produto", 4990, "casa"],
  ["Mais um produto", 12900, "moda"],
  ["Produto novo", 6990, "moda"],
].map(([nome, preco, categoria], i) => ({
  id: `amostra-${i + 1}`,
  slug: `amostra-${i + 1}`,
  nome: nome as string,
  fotos: [],
  preco_centavos: preco as number,
  tipo: "fisico",
  categoria: categoria as string,
  ordem_vendidos: i < 2 ? i + 1 : null,
}));

// ---------- miniaturas dos modelos (desenho simples do layout) ----------
function Miniatura({ modelo }: { modelo: ModeloLoja }) {
  const f = "fill-petroleo/20";
  const t = "fill-petroleo/55";
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" className="h-auto w-full rounded-md bg-white" focusable="false">
      <rect x="0.5" y="0.5" width="95" height="71" rx="5" className="fill-none stroke-petroleo/25" />
      <rect x="6" y="6" width="22" height="5" rx="2" className={t} />
      {modelo === "classico" && (
        <>
          {[0, 1].map((r) =>
            [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={6 + c * 29} y={18 + r * 27} width="26" height="20" rx="2" className={f} />)
          )}
        </>
      )}
      {modelo === "vitrine" && (
        <>
          <rect x="6" y="16" width="84" height="26" rx="2" className={t} />
          <rect x="12" y="30" width="30" height="5" rx="2" className="fill-white" />
          {[0, 1, 2, 3].map((c) => <rect key={c} x={6 + c * 21.5} y="48" width="19" height="17" rx="2" className={f} />)}
        </>
      )}
      {modelo === "catalogo" && (
        <>
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <rect x="6" y={17 + r * 13.5} width="12" height="10" rx="2" className={f} />
              <rect x="23" y={19 + r * 13.5} width="40" height="3" rx="1.5" className={t} />
              <rect x="23" y={24 + r * 13.5} width="24" height="2.5" rx="1.2" className={f} />
              <rect x="74" y={20 + r * 13.5} width="16" height="3" rx="1.5" className={t} />
            </g>
          ))}
        </>
      )}
      {modelo === "editorial" && (
        <>
          <rect x="6" y="16" width="41" height="42" rx="2" className={f} />
          <rect x="49" y="16" width="41" height="42" rx="2" className={f} />
          <rect x="14" y="63" width="25" height="3" rx="1.5" className={t} />
          <rect x="57" y="63" width="25" height="3" rx="1.5" className={t} />
        </>
      )}
    </svg>
  );
}

const classeCampo = "rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal";
const classeBotaoPequeno =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-petroleo/60 bg-branco px-3 text-sm font-medium text-petroleo hover:bg-gelo disabled:cursor-not-allowed disabled:opacity-40";

// ---------- moldura da prévia: celular (390 px) ou computador (1280 px, reduzido) ----------
function Moldura({ largura, children }: { largura: number; children: React.ReactNode }) {
  const externo = useRef<HTMLDivElement>(null);
  const interno = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const medir = () => setMedidas({ w: externo.current?.clientWidth ?? 0, h: interno.current?.offsetHeight ?? 0 });
    medir();
    const obs = new ResizeObserver(medir);
    if (externo.current) obs.observe(externo.current);
    if (interno.current) obs.observe(interno.current);
    return () => obs.disconnect();
  }, [largura]);
  const escala = medidas.w ? Math.min(1, medidas.w / largura) : 1;
  const margem = escala === 1 ? Math.max(0, (medidas.w - largura) / 2) : 0;
  return (
    <div
      ref={externo}
      role="region"
      aria-label="Prévia da loja (role para ver mais)"
      tabIndex={0}
      className="max-h-[70vh] overflow-y-auto rounded-2xl border border-petroleo/20 bg-neutral-100"
    >
      <div style={{ height: medidas.h ? medidas.h * escala : undefined, overflow: "hidden" }}>
        <div ref={interno} style={{ width: largura, marginLeft: margem, transform: `scale(${escala})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormLoja({
  inicial,
  nomeEmpresa,
  uid,
  site,
  itens,
  classesFontes,
}: {
  inicial: Inicial;
  nomeEmpresa: string;
  uid: string;
  site: string;
  itens: ItemLoja[]; // produtos APROVADOS (os que a loja pública mostra)
  classesFontes: string;
}) {
  const [slug, setSlug] = useState(inicial.loja_slug ?? sugerirSlug(inicial.loja_nome ?? nomeEmpresa));
  const [nome, setNome] = useState(inicial.loja_nome ?? nomeEmpresa);
  const [descricao, setDescricao] = useState(inicial.loja_descricao ?? "");
  const [logo, setLogo] = useState(inicial.loja_foto_path ?? "");
  const [principal, setPrincipal] = useState(inicial.loja_cor_principal ?? PADRAO.principal);
  const [destaque, setDestaque] = useState(inicial.loja_cor_destaque ?? PADRAO.destaque);
  const [fonte, setFonte] = useState<FonteLoja>((inicial.loja_fonte as FonteLoja) ?? PADRAO.fonte);
  const [tema, setTema] = useState<TemaLoja>(() => lerTemaLoja(inicial.loja_tema, inicial.loja_layout));
  const [aparelho, setAparelho] = useState<"celular" | "computador">("celular");
  const [chaveBanner, setChaveBanner] = useState(0);
  const [anuncio, setAnuncio] = useState("");
  const foco = useRef<{ tipo: string; dir: "subir" | "descer" } | null>(null);
  const idModelos = useId();

  const problema = slug ? problemaNoSlug(slug) : null;
  const visual = montarTema({ principal, destaque, fonte });
  const itensPrevia = itens.length ? itens : AMOSTRA;

  // depois de mover uma seção, devolve o foco ao botão (o React move o elemento)
  useEffect(() => {
    if (!foco.current) return;
    const { tipo, dir } = foco.current;
    foco.current = null;
    const alvo = document.getElementById(`mover-${tipo}-${dir}`) as HTMLButtonElement | null;
    (alvo && !alvo.disabled ? alvo : document.getElementById(`mover-${tipo}-${dir === "subir" ? "descer" : "subir"}`))?.focus();
  }, [tema.secoes]);

  const escolherModelo = (m: ModeloLoja) =>
    // trocar de modelo volta a ordem das seções ao padrão dele; banner e destaques ficam
    setTema((t) => ({ ...temaDoModelo(m), destaques: t.destaques, banner: t.banner }));

  function mover(i: number, dir: "subir" | "descer") {
    const j = dir === "subir" ? i - 1 : i + 1;
    if (j < 0 || j >= tema.secoes.length) return;
    const secoes = [...tema.secoes];
    [secoes[i], secoes[j]] = [secoes[j], secoes[i]];
    foco.current = { tipo: secoes[j].tipo, dir };
    setTema({ ...tema, secoes });
    setAnuncio(`${SECOES_LOJA[secoes[j].tipo].rotulo}: posição ${j + 1} de ${secoes.length}.`);
  }
  function alternar(i: number) {
    const secoes = tema.secoes.map((s, k) => (k === i ? { ...s, visivel: !s.visivel } : s));
    setTema({ ...tema, secoes });
    setAnuncio(`${SECOES_LOJA[secoes[i].tipo].rotulo}: ${secoes[i].visivel ? "visível" : "oculta"}.`);
  }
  function alternarDestaque(id: string) {
    const ja = tema.destaques.includes(id);
    if (!ja && tema.destaques.length >= MAX_DESTAQUES) return;
    setTema({ ...tema, destaques: ja ? tema.destaques.filter((d) => d !== id) : [...tema.destaques, id] });
  }
  const mudarBanner = (parte: Partial<TemaLoja["banner"]>) => setTema((t) => ({ ...t, banner: { ...t.banner, ...parte } }));

  const seletorCor = (rotulo: string, nomeCampo: string, valor: string, mudar: (v: string) => void, dica: string) => (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      {rotulo}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-petroleo/60"
          aria-label={`${rotulo} (seletor)`}
        />
        <input
          name={nomeCampo}
          value={valor}
          onChange={(e) => mudar(e.target.value.toLowerCase())}
          maxLength={7}
          className="w-full min-w-0 rounded-xl border border-petroleo/60 px-3 py-2.5 font-mono text-base font-normal"
          aria-label={`${rotulo} (código)`}
        />
      </span>
      <span className="text-xs font-normal text-petroleo/70">{dica}</span>
    </label>
  );

  const titulo = "text-xl font-semibold";
  const bloco = "flex flex-col gap-4 border-t border-petroleo/10 pt-5";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <FormAcao acao={salvarLoja} className="flex min-w-0 flex-col gap-5">
        <a href="#previa-loja" className="inline-flex min-h-11 items-center self-start text-sm underline lg:hidden">
          Ir para a prévia
        </a>
        {/* o tema inteiro viaja num campo só; o servidor confere tudo de novo */}
        <input type="hidden" name="tema" value={JSON.stringify(tema)} />

        <section className="flex flex-col gap-4" aria-labelledby="t-dados">
          <h2 id="t-dados" className={titulo}>
            Dados da loja
          </h2>
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
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
            />
          </label>
        </section>

        <fieldset className={bloco}>
          <legend className={`${titulo} mb-1`}>Modelo da loja</legend>
          <p className="text-sm text-petroleo/80">
            Escolha o jeito de mostrar seus produtos. Ao trocar de modelo, a ordem das seções volta ao padrão dele; o banner e os destaques ficam.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {LISTA_MODELOS.map((m) => (
              <label
                key={m}
                className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-petroleo/40 p-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:checked]:ring-2 has-[:checked]:ring-petroleo has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo"
              >
                <Miniatura modelo={m} />
                <span className="flex items-start gap-2">
                  <input
                    type="radio"
                    name={`${idModelos}-modelo`}
                    value={m}
                    checked={tema.modelo === m}
                    onChange={() => escolherModelo(m)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo"
                  />
                  <span>
                    <span className="block font-semibold">{MODELOS_LOJA[m].rotulo}</span>
                    <span className="block text-petroleo/70">{MODELOS_LOJA[m].dica}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={bloco}>
          <legend className={`${titulo} mb-1`}>Logo, cores e fonte</legend>
          <EnviarArquivo
            bucket="fotos-itens"
            campo="loja_foto_path"
            rotulo="Logo da loja (opcional)"
            uid={uid}
            prefixo="loja"
            aceita="image/jpeg,image/png,image/webp"
            caminhoInicial={inicial.loja_foto_path}
            tamanhoMaximoMb={5}
            dica="JPG, PNG ou WebP, até 5 MB. Serve qualquer formato: quadrada, larga ou alta. Só envie imagem que a loja tem direito de usar."
            aoMudar={setLogo}
          />
          <div className="grid grid-cols-2 gap-3">
            {seletorCor("Cor principal", "cor_principal", principal, setPrincipal, "Botões e links.")}
            {seletorCor("Cor de destaque", "cor_destaque", destaque, setDestaque, "Selos e detalhes.")}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fonte
            <select name="fonte" value={fonte} onChange={(e) => setFonte(e.target.value as FonteLoja)} className={classeCampo}>
              {(Object.keys(FONTES_LOJA) as FonteLoja[]).map((f) => (
                <option key={f} value={f}>
                  {FONTES_LOJA[f]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className={bloco}>
          <legend className={`${titulo} mb-1`}>Banner</legend>
          <EnviarArquivo
            key={chaveBanner}
            bucket="fotos-itens"
            campo="banner_imagem"
            rotulo="Imagem do banner (opcional)"
            uid={uid}
            prefixo="banner"
            aceita="image/jpeg,image/png,image/webp"
            caminhoInicial={tema.banner.imagem}
            tamanhoMaximoMb={5}
            dica="JPG, PNG ou WebP, até 5 MB. Imagem horizontal, com o assunto no centro, funciona melhor. Só envie imagem que a loja tem direito de usar."
            aoMudar={(c) => mudarBanner({ imagem: c })}
          />
          {tema.banner.imagem && (
            <button
              type="button"
              className={`${classeBotaoPequeno} self-start`}
              onClick={() => {
                mudarBanner({ imagem: null });
                setChaveBanner((k) => k + 1);
              }}
            >
              Remover imagem do banner
            </button>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Frase do banner (opcional)
            <input
              value={tema.banner.frase ?? ""}
              onChange={(e) => mudarBanner({ frase: e.target.value || null })}
              maxLength={MAX_FRASE_BANNER}
              className={classeCampo}
              aria-describedby="dica-frase"
            />
            <span id="dica-frase" className="text-xs font-normal text-petroleo/70">
              {(tema.banner.frase ?? "").length} de {MAX_FRASE_BANNER} letras. Aparece sobre a imagem.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Botão do banner leva a
            <select
              value={tema.banner.produto ?? ""}
              onChange={(e) => mudarBanner({ produto: e.target.value || null })}
              className={classeCampo}
              disabled={itens.length === 0}
            >
              <option value="">Nenhum botão</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-petroleo/70">O banner só aparece se a seção estiver visível e tiver imagem ou frase.</p>
        </fieldset>

        <section className={bloco} aria-labelledby="t-secoes">
          <h2 id="t-secoes" className={titulo}>
            Seções da página
          </h2>
          <p className="text-sm text-petroleo/80">Use os botões para subir, descer ou ocultar. A primeira da lista fica no topo.</p>
          <ol className="flex flex-col gap-2">
            {tema.secoes.map((s, i) => (
              <li key={s.tipo} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${s.visivel ? "border-petroleo/40 bg-white" : "border-petroleo/20 bg-gelo"}`}>
                <span className="min-w-0 flex-1 text-sm">
                  <span className={`block font-semibold ${s.visivel ? "" : "text-petroleo/70"}`}>{SECOES_LOJA[s.tipo].rotulo}</span>
                  <span className="block text-petroleo/70">{s.visivel ? SECOES_LOJA[s.tipo].dica : "Oculta"}</span>
                </span>
                <button
                  type="button"
                  className={classeBotaoPequeno}
                  onClick={() => alternar(i)}
                  aria-label={`${s.visivel ? "Ocultar" : "Mostrar"} seção ${SECOES_LOJA[s.tipo].rotulo}`}
                >
                  {s.visivel ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  id={`mover-${s.tipo}-subir`}
                  className={classeBotaoPequeno}
                  disabled={i === 0}
                  onClick={() => mover(i, "subir")}
                  aria-label={`Subir ${SECOES_LOJA[s.tipo].rotulo}`}
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  type="button"
                  id={`mover-${s.tipo}-descer`}
                  className={classeBotaoPequeno}
                  disabled={i === tema.secoes.length - 1}
                  onClick={() => mover(i, "descer")}
                  aria-label={`Descer ${SECOES_LOJA[s.tipo].rotulo}`}
                >
                  <span aria-hidden="true">↓</span>
                </button>
              </li>
            ))}
          </ol>
          <p role="status" className="sr-only">
            {anuncio}
          </p>
        </section>

        <fieldset className={bloco}>
          <legend className={`${titulo} mb-1`}>Produtos em destaque</legend>
          {itens.length === 0 ? (
            <p className="text-sm text-petroleo/80">Seus produtos aparecem aqui depois de aprovados.</p>
          ) : (
            <>
              <p className="text-sm text-petroleo/80" role="status">
                {tema.destaques.length} de {MAX_DESTAQUES} escolhidos. Aparecem na seção &ldquo;Produtos em destaque&rdquo;.
              </p>
              <ul className="flex flex-col gap-2">
                {itens.map((i) => {
                  const marcado = tema.destaques.includes(i.id);
                  const cheio = !marcado && tema.destaques.length >= MAX_DESTAQUES;
                  return (
                    <li key={i.id}>
                      <label
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo ${
                          cheio ? "border-petroleo/20 opacity-60" : "border-petroleo/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={cheio}
                          onChange={() => alternarDestaque(i.id)}
                          className="h-5 w-5 shrink-0 accent-petroleo"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{i.nome}</span>
                        <span className="shrink-0 text-petroleo/70">{formatarPreco(i.preco_centavos)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </fieldset>

        <BotaoEnviar>Salvar loja</BotaoEnviar>
      </FormAcao>

      {/* prévia ao vivo (mesmo motor e mesmas regras da página pública) */}
      <section id="previa-loja" aria-labelledby="t-previa" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="t-previa" className={titulo}>
            Prévia
          </h2>
          <div role="group" aria-label="Tamanho da prévia" className="flex gap-2">
            {(["celular", "computador"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={aparelho === a}
                onClick={() => setAparelho(a)}
                className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium ${
                  aparelho === a ? "border-petroleo bg-petroleo text-branco" : "border-petroleo/60 bg-branco text-petroleo hover:bg-gelo"
                }`}
              >
                {a === "celular" ? "Celular" : "Computador"}
              </button>
            ))}
          </div>
        </div>
        {visual.avisos.map((a) => (
          <p key={a} role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {a}
          </p>
        ))}
        {itens.length === 0 && <p className="text-sm text-petroleo/70">A prévia usa produtos de exemplo até você ter produtos aprovados.</p>}
        <Moldura largura={aparelho === "celular" ? 390 : 1280}>
          <div
            data-previa
            inert
            aria-hidden="true"
            className={`${classesFontes} @container bg-white text-neutral-900`}
            style={{ ...visual.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
          >
            <CabecalhoLoja previa href="#" nome={nome || "Sua loja"} logo={logo || null} centralizado={tema.modelo === "editorial"} />
            <div className="pb-6">
              <SecoesLoja
                previa
                tema={tema}
                itens={itensPrevia}
                sobre={{ slug, nome: nome || "Sua loja", descricao: descricao || null, razaoSocial: nomeEmpresa, cidade: null, uf: null, email: null }}
              />
            </div>
          </div>
        </Moldura>
      </section>
    </div>
  );
}
