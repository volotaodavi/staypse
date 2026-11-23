"use client";
// "Minha loja": dados, galeria de modelos (miniatura real), logo/cores/fonte, blocos da página
// (anúncio, cabeçalho, banners, coleções, sobre, vídeo, perguntas, rodapé...) em ordem editável,
// com PRÉVIA AO VIVO (celular e computador).
// A prévia usa o MESMO motor da loja pública (components/loja-secoes.tsx) e a
// mesma regra de contraste (lib/tema.ts); só deixa de ter links.
// Sem arrastar e soltar: subir/descer/ocultar são botões comuns, com foco e aviso por voz.
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { EnviarArquivo } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { AnuncioLoja, CabecalhoLoja, RodapeLoja, itensDoMenu } from "@/components/loja";
import { SecoesLoja } from "@/components/loja-secoes";
import type { ItemLoja } from "@/lib/publico";
import { AA, FONTES_LOJA, contraste, montarTema, textoSobre, type FonteLoja } from "@/lib/tema";
import { MODELOS_LOJA, SECOES_LOJA, lerTemaLoja, restaurarModelo, varsDoModelo, type ModeloLoja, type TemaLoja } from "@/lib/tema-loja";
import { problemaNoSlug, sugerirSlug } from "@/lib/vitrine";
import { EditorAnuncio, EditorCabecalho, EditorRodape, EditorSecao, TEM_EDICAO, classeBotaoPequeno } from "./EditorBlocos";
import { GaleriaModelos } from "./GaleriaModelos";
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
  const [tema, setTema] = useState<TemaLoja>(() => lerTemaLoja(inicial.loja_tema, inicial.loja_layout));
  const cfgInicial = MODELOS_LOJA[tema.modelo];
  const [slug, setSlug] = useState(inicial.loja_slug ?? sugerirSlug(inicial.loja_nome ?? nomeEmpresa));
  const [nome, setNome] = useState(inicial.loja_nome ?? nomeEmpresa);
  const [descricao, setDescricao] = useState(inicial.loja_descricao ?? "");
  const [logo, setLogo] = useState(inicial.loja_foto_path ?? "");
  const [principal, setPrincipal] = useState(inicial.loja_cor_principal ?? cfgInicial.principal);
  const [destaque, setDestaque] = useState(inicial.loja_cor_destaque ?? cfgInicial.destaque);
  const [fonte, setFonte] = useState<FonteLoja>((inicial.loja_fonte as FonteLoja) ?? cfgInicial.fonte);
  const [aparelho, setAparelho] = useState<"celular" | "computador">("celular");
  const [anuncio, setAnuncio] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const foco = useRef<{ tipo: string; dir: "subir" | "descer" } | null>(null);

  const cfg = MODELOS_LOJA[tema.modelo];
  const problema = slug ? problemaNoSlug(slug) : null;
  const visual = montarTema({ principal, destaque, fonte });
  const itensPrevia = itens.length ? itens : AMOSTRA;
  const mudar = (f: (t: TemaLoja) => TemaLoja) => setTema(f);

  // depois de mover um bloco, devolve o foco ao botão (o React move o elemento)
  useEffect(() => {
    if (!foco.current) return;
    const { tipo, dir } = foco.current;
    foco.current = null;
    const alvo = document.getElementById(`mover-${tipo}-${dir}`) as HTMLButtonElement | null;
    (alvo && !alvo.disabled ? alvo : document.getElementById(`mover-${tipo}-${dir === "subir" ? "descer" : "subir"}`))?.focus();
  }, [tema.secoes]);

  function escolherModelo(m: ModeloLoja) {
    // trocar de modelo volta a ordem dos blocos ao padrão dele; o conteúdo escrito fica.
    // Cores e fonte acompanham o modelo, a não ser que a loja já tenha escolhido as dela.
    const anterior = MODELOS_LOJA[tema.modelo];
    const personalizou = principal !== anterior.principal || destaque !== anterior.destaque || fonte !== anterior.fonte;
    setTema((t) => restaurarModelo(t, m));
    if (!personalizou) {
      setPrincipal(MODELOS_LOJA[m].principal);
      setDestaque(MODELOS_LOJA[m].destaque);
      setFonte(MODELOS_LOJA[m].fonte);
    }
    setAnuncio(`Modelo ${MODELOS_LOJA[m].rotulo} escolhido.`);
  }
  function restaurarPadrao() {
    setTema((t) => restaurarModelo(t));
    setPrincipal(cfg.principal);
    setDestaque(cfg.destaque);
    setFonte(cfg.fonte);
    setConfirmando(false);
    setAnuncio(`Padrão do modelo ${cfg.rotulo} restaurado: ordem dos blocos, cores e fonte.`);
  }
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

  const seletorCor = (rotulo: string, nomeCampo: string, valor: string, mudarCor: (v: string) => void, dica: string) => {
    const valida = /^#[0-9a-f]{6}$/i.test(valor);
    const texto = valida ? textoSobre(valor) : "#000000";
    const razao = valida ? contraste(valor, texto) : 0;
    return (
      <div className="flex min-w-0 flex-col gap-1 text-sm font-medium">
        <label htmlFor={`cor-${nomeCampo}`}>{rotulo}</label>
        <span className="flex items-center gap-2">
          <input type="color" value={valida ? valor : "#000000"} onChange={(e) => mudarCor(e.target.value)} className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-petroleo/60" aria-label={`${rotulo} (seletor)`} />
          <input id={`cor-${nomeCampo}`} name={nomeCampo} value={valor} onChange={(e) => mudarCor(e.target.value.toLowerCase())} maxLength={7} className="min-h-11 w-full min-w-0 rounded-xl border border-petroleo/60 px-3 py-2.5 font-mono text-base font-normal" />
        </span>
        <span className="text-xs font-normal text-petroleo/70">{dica}</span>
        {valida && (
          <span className="flex items-center gap-2 text-xs font-normal" role="status">
            <span className="inline-flex h-6 items-center rounded px-2 font-semibold" style={{ background: valor, color: texto }}>
              Texto
            </span>
            <span>
              {texto === "#ffffff" ? "branco" : "preto"} sobre a cor: {razao.toFixed(1).replace(".", ",")}:1, {razao >= AA ? "passa no mínimo AA (4,5:1)" : "abaixo do mínimo AA"}. O texto é escolhido sozinho.
            </span>
          </span>
        )}
      </div>
    );
  };

  const titulo = "text-xl font-semibold";
  const bloco = "flex flex-col gap-4 border-t border-petroleo/10 pt-5";
  const sobre = { slug, nome: nome || "Sua loja", descricao: descricao || null, razaoSocial: nomeEmpresa, cidade: null, uf: null, email: null };

  // bloco fixo (anúncio, cabeçalho, rodapé): título + campos dentro de "Editar"
  const fixo = (id: string, rotulo: string, dica: string, resumo: string, filhos: React.ReactNode) => (
    <li key={id} className="rounded-2xl border border-petroleo/40 bg-white px-3 py-2">
      <div className="flex min-h-11 items-center gap-2">
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold">{rotulo}</span>
          <span className="block text-petroleo/70">{resumo || dica}</span>
        </span>
      </div>
      <details className="group pb-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-4">Editar {rotulo.toLowerCase()}</summary>
        <div className="flex flex-col gap-4 pt-2 pb-2">{filhos}</div>
      </details>
    </li>
  );

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
            Cada miniatura é o modelo de verdade, com o seu nome e os seus produtos. Ao trocar, a ordem dos blocos volta ao padrão dele; banners, textos e destaques ficam.
          </p>
          <GaleriaModelos valor={tema.modelo} aoEscolher={escolherModelo} tema={tema} itens={itensPrevia} sobre={sobre} logo={logo || null} classesFontes={classesFontes} />
          <p className="text-sm text-petroleo/80">{cfg.dica}</p>
          {confirmando ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-gelo p-4 text-sm" role="alert">
              <p>
                Isso volta a ordem dos blocos, as cores e a fonte ao padrão do modelo {cfg.rotulo}. Os textos, banners e destaques que você escreveu ficam.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={classeBotaoPequeno} onClick={restaurarPadrao}>
                  Restaurar padrão
                </button>
                <button type="button" className={classeBotaoPequeno} onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${classeBotaoPequeno} self-start`} onClick={() => setConfirmando(true)}>
              Restaurar padrão do modelo
            </button>
          )}
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
          <div className="grid gap-3 sm:grid-cols-2">
            {seletorCor("Cor principal", "cor_principal", principal, setPrincipal, "Botões, rodapé e links.")}
            {seletorCor("Cor de destaque", "cor_destaque", destaque, setDestaque, "Botões de chamada e detalhes.")}
          </div>
          <div role="radiogroup" aria-label="Fonte" className="flex flex-col gap-2">
            <span className="text-sm font-medium">Fonte</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(FONTES_LOJA) as FonteLoja[]).map((f) => (
                <label
                  key={f}
                  className="flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl border border-petroleo/40 bg-white px-3 py-2 has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:checked]:ring-2 has-[:checked]:ring-petroleo has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo"
                >
                  <input type="radio" name="fonte" value={f} checked={fonte === f} onChange={() => setFonte(f)} className="h-5 w-5 shrink-0 accent-petroleo" />
                  <span className={classesFontes}>
                    <span className="block text-xl leading-6" style={{ fontFamily: `var(--fonte-${f.replace("_", "-")}), system-ui, sans-serif` }}>
                      Aa
                    </span>
                    <span className="block text-sm">{FONTES_LOJA[f]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <section className={bloco} aria-labelledby="t-blocos">
          <h2 id="t-blocos" className={titulo}>
            Blocos da página
          </h2>
          <p className="text-sm text-petroleo/80">
            A faixa de anúncio e o cabeçalho ficam no topo e o rodapé no fim. Os demais blocos você sobe, desce ou oculta. Bloco sem conteúdo não aparece na loja.
          </p>
          <ol className="flex flex-col gap-2">
            {fixo("anuncio", "Faixa de anúncio", "Uma frase curta no topo, com link opcional.", tema.anuncio.visivel && tema.anuncio.texto ? tema.anuncio.texto : "", <EditorAnuncio tema={tema} mudar={mudar} />)}
            {fixo("cabecalho", "Cabeçalho", "Logo, menu com categorias e busca.", [tema.cabecalho.busca && "Com busca", tema.cabecalho.menu && "Menu de categorias"].filter(Boolean).join(", "), <EditorCabecalho tema={tema} mudar={mudar} />)}
            {tema.secoes.map((s, i) => (
              <li key={s.tipo} className={`rounded-2xl border px-3 py-2 ${s.visivel ? "border-petroleo/40 bg-white" : "border-petroleo/20 bg-gelo"}`}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className={`block font-semibold ${s.visivel ? "" : "text-petroleo/70"}`}>{SECOES_LOJA[s.tipo].rotulo}</span>
                    <span className="block text-petroleo/70">{s.visivel ? SECOES_LOJA[s.tipo].dica : "Oculta"}</span>
                  </span>
                  <button type="button" className={classeBotaoPequeno} onClick={() => alternar(i)} aria-label={`${s.visivel ? "Ocultar" : "Mostrar"} bloco ${SECOES_LOJA[s.tipo].rotulo}`}>
                    {s.visivel ? "Ocultar" : "Mostrar"}
                  </button>
                  <button type="button" id={`mover-${s.tipo}-subir`} className={classeBotaoPequeno} disabled={i === 0} onClick={() => mover(i, "subir")} aria-label={`Subir ${SECOES_LOJA[s.tipo].rotulo}`}>
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button type="button" id={`mover-${s.tipo}-descer`} className={classeBotaoPequeno} disabled={i === tema.secoes.length - 1} onClick={() => mover(i, "descer")} aria-label={`Descer ${SECOES_LOJA[s.tipo].rotulo}`}>
                    <span aria-hidden="true">↓</span>
                  </button>
                </div>
                {TEM_EDICAO.includes(s.tipo) && (
                  <details className="group pb-1" data-bloco={s.tipo}>
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-4">Editar {SECOES_LOJA[s.tipo].rotulo.toLowerCase()}</summary>
                    <div className="flex flex-col gap-4 pt-2 pb-2">
                      <EditorSecao tipo={s.tipo} tema={tema} mudar={mudar} uid={uid} itens={itens} />
                    </div>
                  </details>
                )}
              </li>
            ))}
            {fixo(
              "rodape",
              "Rodapé",
              "Redes sociais, WhatsApp e links.",
              [tema.rodape.instagram && "Instagram", tema.rodape.facebook && "Facebook", tema.rodape.tiktok && "TikTok", tema.rodape.youtube && "YouTube", tema.rodape.whatsapp && "WhatsApp"].filter(Boolean).join(", "),
              <EditorRodape tema={tema} mudar={mudar} />,
            )}
          </ol>
          <p role="status" className="sr-only">
            {anuncio}
          </p>
        </section>

        {/* barra de salvar sempre à vista; a confirmação aparece logo abaixo e recebe o foco */}
        <div className="sticky bottom-0 z-10 -mx-5 border-t border-petroleo/10 bg-branco px-5 py-3">
          <BotaoEnviar>Salvar loja</BotaoEnviar>
        </div>
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
                className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium ${aparelho === a ? "border-petroleo bg-petroleo text-branco" : "border-petroleo/60 bg-branco text-petroleo hover:bg-gelo"}`}
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
            data-modelo={tema.modelo}
            inert
            aria-hidden="true"
            className={`${classesFontes} @container flex min-h-[70vh] flex-col bg-[var(--loja-fundo)] text-neutral-900`}
            style={{ ...varsDoModelo(tema.modelo), ...visual.vars, fontFamily: "var(--loja-fonte)" } as CSSProperties}
          >
            <AnuncioLoja anuncio={tema.anuncio} previa />
            <CabecalhoLoja previa href="#" slug={slug} nome={nome || "Sua loja"} logo={logo || null} tipo={cfg.cabecalho} menu={itensDoMenu(tema, slug, itensPrevia)} busca={tema.cabecalho.busca} />
            <div className="pb-6">
              <SecoesLoja previa tema={tema} itens={itensPrevia} sobre={sobre} />
            </div>
            <RodapeLoja previa nome={nome || "Sua loja"} descricao={descricao || null} email={null} rodape={tema.rodape} />
          </div>
        </Moldura>
      </section>
    </div>
  );
}
