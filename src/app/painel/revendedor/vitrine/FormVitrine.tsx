"use client";
// Criar/editar a vitrine em 3 passos: 1) nome e endereço, 2) nicho, 3) modelo visual.
// Os 3 passos ficam no mesmo formulário (os outros só ficam escondidos),
// e tudo é enviado junto no final.
import { useState } from "react";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { MODELOS_VISUAIS, NICHOS_VITRINE, problemaNoSlug, sugerirSlug, type ModeloVisual } from "@/lib/vitrine";
import { salvarVitrine } from "../acoes";

type Inicial = { slug: string; nome_exibicao: string; nicho: string; modelo_visual: string; bio: string };

export function FormVitrine({ inicial, site }: { inicial: Inicial | null; site: string }) {
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState(inicial?.nome_exibicao ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  // enquanto a pessoa não mexer no endereço, ele acompanha o nome
  const [slugEditado, setSlugEditado] = useState(Boolean(inicial));
  const [nicho, setNicho] = useState(inicial?.nicho ?? "");
  const [modelo, setModelo] = useState<string>(inicial?.modelo_visual ?? "petroleo");
  const [aviso, setAviso] = useState("");

  const problemaSlug = slug ? problemaNoSlug(slug) : null;

  function avancar() {
    if (passo === 1 && (nome.trim().length < 2 || !slug || problemaSlug)) {
      setAviso(nome.trim().length < 2 ? "Dê um nome à vitrine." : (problemaSlug ?? "Escolha o endereço da vitrine."));
      return;
    }
    if (passo === 2 && !nicho) {
      setAviso("Escolha um nicho.");
      return;
    }
    setAviso("");
    setPasso(passo + 1);
  }

  return (
    <FormAcao acao={salvarVitrine} className="flex flex-col gap-5">
      <ol className="flex gap-2 text-sm" aria-label="Passos">
        {["Nome", "Nicho", "Visual"].map((rotulo, i) => (
          <li
            key={rotulo}
            aria-current={passo === i + 1 ? "step" : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center font-medium ${
              passo === i + 1 ? "bg-petroleo text-branco" : passo > i + 1 ? "bg-ciano text-petroleo" : "bg-gelo text-petroleo/70"
            }`}
          >
            {i + 1}. {rotulo}
          </li>
        ))}
      </ol>

      {/* passo 1 */}
      <fieldset hidden={passo !== 1} className="flex flex-col gap-4">
        <legend className="mb-2 text-xl font-extrabold">Como sua vitrine se chama?</legend>
        <Campo
          rotulo="Nome da vitrine"
          name="nome_exibicao"
          maxLength={80}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            if (!slugEditado) setSlug(sugerirSlug(e.target.value));
          }}
          placeholder="Ex.: Achados da Bia"
        />
        <Campo
          rotulo="Endereço"
          name="slug"
          maxLength={40}
          value={slug}
          onChange={(e) => {
            setSlugEditado(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          dica={problemaSlug ?? `${site}/v/${slug || "seu-nome"}`}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </fieldset>

      {/* passo 2 */}
      <fieldset hidden={passo !== 2} className="flex flex-col gap-3">
        <legend className="mb-2 text-xl font-extrabold">Qual é o nicho da vitrine?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NICHOS_VITRINE.map((n) => (
            <label
              key={n.valor}
              className={`cursor-pointer rounded-2xl px-4 py-3 text-center font-medium ring-1 ${
                nicho === n.valor ? "bg-petroleo text-branco ring-petroleo" : "bg-gelo ring-petroleo/10 hover:ring-petroleo/40"
              }`}
            >
              <input type="radio" name="nicho" value={n.valor} checked={nicho === n.valor} onChange={() => setNicho(n.valor)} className="sr-only" />
              {n.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {/* passo 3 */}
      <fieldset hidden={passo !== 3} className="flex flex-col gap-4">
        <legend className="mb-2 text-xl font-extrabold">Escolha o visual</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MODELOS_VISUAIS) as ModeloVisual[]).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-branco ring-2 ${modelo === m ? "ring-petroleo" : "ring-petroleo/10"}`}
            >
              <input type="radio" name="modelo_visual" value={m} checked={modelo === m} onChange={() => setModelo(m)} className="sr-only" />
              <span className={`flex h-16 items-end p-2 text-xs font-medium ${MODELOS_VISUAIS[m].topo}`}>{nome || "Sua vitrine"}</span>
              <span className="grid grid-cols-2 gap-1 p-2" aria-hidden="true">
                <span className="h-6 rounded bg-gelo" />
                <span className="h-6 rounded bg-gelo" />
              </span>
              <span className="px-2 pb-2 text-center text-sm font-medium">{MODELOS_VISUAIS[m].rotulo}</span>
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Apresentação (opcional)
          <textarea
            name="bio"
            maxLength={500}
            rows={3}
            defaultValue={inicial?.bio ?? ""}
            placeholder="Conte em poucas palavras o que você indica."
            className="rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
          />
        </label>
      </fieldset>

      {aviso && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {aviso}
        </p>
      )}

      <div className="flex gap-2">
        {passo > 1 && (
          <button type="button" onClick={() => setPasso(passo - 1)} className="rounded-full border border-petroleo px-6 py-3 font-medium">
            Voltar
          </button>
        )}
        {passo < 3 ? (
          <button type="button" onClick={avancar} className="flex-1 rounded-full bg-petroleo px-6 py-3 font-medium text-branco">
            Próximo
          </button>
        ) : (
          <div className="flex-1">
            <BotaoEnviar>{inicial ? "Salvar vitrine" : "Publicar vitrine"}</BotaoEnviar>
          </div>
        )}
      </div>
    </FormAcao>
  );
}
