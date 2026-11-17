"use client";
// Criar/editar a vitrine em 3 passos: 1) nome e endereço (@), 2) nicho,
// 3) visual: padrão Staypse ou "minhas cores" (cor principal + foto/logo).
// Os 3 passos ficam no mesmo formulário (os outros só ficam escondidos),
// e tudo é enviado junto no final.
import { useState } from "react";
import { EnviarArquivo } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { montarTema } from "@/lib/tema";
import { MODELOS_VISUAIS, NICHOS_VITRINE, problemaNoSlug, sugerirSlug, type ModeloVisual } from "@/lib/vitrine";
import { salvarVitrine } from "../acoes";

type Inicial = {
  slug: string;
  nome_exibicao: string;
  nicho: string;
  modelo_visual: string;
  cor_principal: string;
  foto_path: string;
  bio: string;
};

export function FormVitrine({ inicial, site, uid }: { inicial: Inicial | null; site: string; uid: string }) {
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState(inicial?.nome_exibicao ?? "");
  const [slug, setSlug] = useState(inicial?.slug ?? "");
  // enquanto a pessoa não mexer no endereço, ele acompanha o nome
  const [slugEditado, setSlugEditado] = useState(Boolean(inicial?.slug));
  const [nicho, setNicho] = useState(inicial?.nicho ?? "");
  const [modelo, setModelo] = useState<ModeloVisual>(inicial?.modelo_visual === "proprio" ? "proprio" : "staypse");
  const [cor, setCor] = useState(inicial?.cor_principal || "#7a1f3d");
  const [aviso, setAviso] = useState("");

  const problemaSlug = slug ? problemaNoSlug(slug) : null;
  const tema = montarTema({ principal: modelo === "proprio" ? cor : null });

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
          rotulo="Seu @"
          name="slug"
          maxLength={40}
          value={slug}
          onChange={(e) => {
            setSlugEditado(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          dica={problemaSlug ?? `${site}/@${slug || "seu-nome"}`}
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
        <legend className="mb-2 text-xl font-extrabold">Visual da vitrine</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(MODELOS_VISUAIS) as ModeloVisual[]).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer flex-col gap-1 rounded-2xl px-4 py-3 ring-2 ${modelo === m ? "bg-gelo ring-petroleo" : "ring-petroleo/10"}`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" name="modelo_visual" value={m} checked={modelo === m} onChange={() => setModelo(m)} className="h-4 w-4 accent-petroleo" />
                {MODELOS_VISUAIS[m].rotulo}
              </span>
              <span className="pl-6 text-sm text-petroleo/70">{MODELOS_VISUAIS[m].dica}</span>
            </label>
          ))}
        </div>

        <div hidden={modelo !== "proprio"} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Cor principal
            <span className="flex items-center gap-3">
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-petroleo/20" />
              <input
                name="cor_principal"
                value={cor}
                onChange={(e) => setCor(e.target.value.toLowerCase())}
                maxLength={7}
                className="w-28 rounded-xl border border-petroleo/20 px-3 py-2.5 font-mono text-base font-normal"
                aria-label="Código da cor"
              />
            </span>
          </label>
          <EnviarArquivo
            bucket="fotos-itens"
            campo="foto_path"
            rotulo="Sua foto ou logo (opcional)"
            uid={uid}
            prefixo="vitrine"
            aceita="image/jpeg,image/png,image/webp"
            caminhoInicial={inicial?.foto_path || null}
            tamanhoMaximoMb={5}
          />
        </div>

        {/* prévia ao vivo do botão e dos links com o contraste já ajustado */}
        <div className="flex flex-col gap-2 rounded-2xl border border-petroleo/10 bg-white p-4" style={tema.vars} aria-label="Prévia">
          <p className="text-sm text-neutral-600">Prévia</p>
          <p className="text-base font-semibold">{nome || "Sua vitrine"}</p>
          <span className="inline-flex w-fit rounded-md bg-[var(--loja-principal)] px-4 py-2 text-sm font-semibold text-[var(--loja-principal-texto)]">
            Compartilhar no WhatsApp
          </span>
          <span className="text-sm font-semibold text-[var(--loja-link)] underline">Ver produto</span>
          {tema.avisos.map((a) => (
            <p key={a} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {a}
            </p>
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
            <BotaoEnviar>{inicial?.nicho ? "Salvar vitrine" : "Publicar vitrine"}</BotaoEnviar>
          </div>
        )}
      </div>
    </FormAcao>
  );
}
