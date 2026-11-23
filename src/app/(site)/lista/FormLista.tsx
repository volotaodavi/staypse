"use client";
// Formulário da lista de espera: o perfil vem primeiro (4 opções) e os campos
// mudam conforme a escolha. Os links das seções da página levam a
// #entrar-loja, #entrar-vendedor, #entrar-afiliado ou #entrar-comprador.
//
// Validação: o mesmo schema Zod do servidor (src/lib/lista-schema.ts), carregado
// só quando a pessoa envia (não pesa no carregamento da página). O servidor
// valida tudo de novo — esta checagem é só para dar resposta rápida.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Campo } from "@/components/formulario";
import { NICHOS, PERFIS, TIPOS_PRODUTO, UFS, type Perfil } from "@/lib/lista";
import { inscrever } from "./acoes";

const PERFIL_POR_HASH: Record<string, Perfil> = {
  "#entrar-loja": "loja",
  "#entrar-vendedor": "vendedor",
  "#entrar-afiliado": "afiliado",
  "#entrar-comprador": "comprador",
};

const chip =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-petroleo/40 px-3 py-2 text-center text-sm leading-tight has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo has-[:checked]:border-petroleo has-[:checked]:bg-petroleo has-[:checked]:text-branco";

function MensagemErro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-2 text-sm text-red-800">
      {texto}
    </p>
  );
}

export function FormLista() {
  const ref = useSearchParams().get("ref") ?? ""; // quem indicou (<endereço do site>/?ref=...)
  const [estado, despachar] = useActionState(inscrever, undefined);
  const [enviando, iniciar] = useTransition();
  const [perfil, setPerfil] = useState<Perfil | "">("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  // carimbo de hora assinado pelo servidor (tempo mínimo de preenchimento)
  const carimbo = useRef<string>("");

  useEffect(() => {
    let ativo = true;
    fetch("/api/lista/token", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { t?: string } | null) => {
        if (ativo && j?.t) carimbo.current = j.t;
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // Escolhe o perfil quando a pessoa chega por um link das seções (#entrar-...)
  useEffect(() => {
    const seguirHash = () => {
      const p = PERFIL_POR_HASH[window.location.hash];
      if (p) setPerfil(p);
    };
    seguirHash();
    window.addEventListener("hashchange", seguirHash);
    return () => window.removeEventListener("hashchange", seguirHash);
  }, []);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    dados.set("ref", ref);

    // Zod carregado só agora (não pesa na abertura da página)
    const { lerFormulario, validarLista, CAMPOS_DA_LISTA } = await import("@/lib/lista-schema");
    const r = validarLista(lerFormulario(dados));
    if (!r.ok) {
      setErros(r.erros);
      const primeiro = CAMPOS_DA_LISTA.find((c) => r.erros[c]);
      // foca o primeiro campo com problema (nos grupos, o primeiro botão do grupo)
      const alvo = primeiro ? form.querySelector<HTMLElement>(`[name="${primeiro}"]`) : null;
      alvo?.focus();
      return;
    }
    setErros({});

    // sem carimbo (a busca falhou): tenta de novo agora; o servidor confere
    if (!carimbo.current) {
      try {
        const j = (await (await fetch("/api/lista/token", { cache: "no-store" })).json()) as { t?: string };
        carimbo.current = j.t ?? "";
      } catch {
        /* o servidor recusa com uma mensagem clara */
      }
    }
    dados.set("t", carimbo.current);
    iniciar(() => despachar(dados));
  }

  if (estado?.sucesso) return <Aviso estado={estado} />;

  return (
    <form ref={formRef} onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      {/* Honeypot: invisível para pessoas; robôs preenchem e são descartados */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Não preencha este campo
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset aria-describedby={erros.perfil ? "erro-perfil" : undefined}>
        <legend className="mb-2 text-sm font-medium">Eu sou</legend>
        <div className="grid grid-cols-2 gap-2">
          {PERFIS.map((p) => (
            <label key={p.valor} className={chip}>
              <input
                type="radio"
                name="perfil"
                value={p.valor}
                checked={perfil === p.valor}
                onChange={() => setPerfil(p.valor)}
                className="sr-only"
              />
              {p.rotulo}
            </label>
          ))}
        </div>
        <MensagemErro id="erro-perfil" texto={erros.perfil} />
      </fieldset>

      {perfil === "" ? (
        <p className="text-sm text-petroleo/75">Escolha o seu perfil para continuar.</p>
      ) : (
        <>
          <Campo rotulo="Nome" name="nome" autoComplete="name" maxLength={120} erro={erros.nome} />

          {(perfil === "loja" || perfil === "vendedor") && (
            <Campo
              rotulo={perfil === "loja" ? "Nome da loja, fábrica ou marca" : "Em qual loja você trabalha?"}
              name="empresa"
              autoComplete="organization"
              maxLength={200}
              erro={erros.empresa}
            />
          )}
          {perfil === "loja" && (
            <Campo
              rotulo="CNPJ (opcional)"
              name="cnpj"
              inputMode="text"
              maxLength={18}
              placeholder="00.000.000/0000-00"
              dica="Para vender na Staypse o CNPJ será obrigatório. Agora é opcional."
              erro={erros.cnpj}
            />
          )}

          <Campo
            rotulo={perfil === "vendedor" || perfil === "comprador" ? "WhatsApp (opcional)" : "WhatsApp"}
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(81) 99876-5432"
            erro={erros.whatsapp}
          />
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" erro={erros.email} />

          {perfil === "afiliado" && (
            <>
              {/* minmax(0,1fr): deixa o campo Cidade encolher no celular (sem isso a UF vaza da tela) */}
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-3">
                <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" maxLength={120} erro={erros.cidade} />
                <label className="flex flex-col gap-1 text-sm font-medium">
                  UF
                  <select
                    name="uf"
                    defaultValue=""
                    aria-invalid={erros.uf ? true : undefined}
                    aria-describedby={erros.uf ? "erro-uf" : undefined}
                    className="rounded-xl border border-petroleo/60 bg-branco px-3 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none"
                  >
                    <option value="" disabled>
                      --
                    </option>
                    {UFS.map((uf) => (
                      <option key={uf}>{uf}</option>
                    ))}
                  </select>
                </label>
              </div>
              <MensagemErro id="erro-uf" texto={erros.uf} />

              <fieldset aria-describedby={erros.nichos ? "erro-nichos" : undefined}>
                <legend className="mb-2 text-sm font-medium">Nichos de interesse</legend>
                <div className="flex flex-wrap gap-2">
                  {NICHOS.map((n) => (
                    <label key={n.valor} className={`${chip} rounded-full`}>
                      <input type="checkbox" name="nichos" value={n.valor} className="sr-only" />
                      {n.rotulo}
                    </label>
                  ))}
                </div>
                <MensagemErro id="erro-nichos" texto={erros.nichos} />
              </fieldset>
            </>
          )}

          {perfil === "loja" && (
            <>
              <fieldset aria-describedby={erros.tipo_produto ? "erro-tipo_produto" : undefined}>
                <legend className="mb-2 text-sm font-medium">Tipo de produto</legend>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS_PRODUTO.map((t) => (
                    <label key={t.valor} className={`${chip} rounded-full`}>
                      <input type="radio" name="tipo_produto" value={t.valor} className="sr-only" />
                      {t.rotulo}
                    </label>
                  ))}
                </div>
                <MensagemErro id="erro-tipo_produto" texto={erros.tipo_produto} />
              </fieldset>
              <label className="flex flex-col gap-1 text-sm font-medium">
                O que você vende?
                <textarea
                  name="o_que_vende"
                  maxLength={500}
                  rows={3}
                  placeholder="Ex.: cosméticos naturais, camisetas, curso de confeitaria"
                  aria-invalid={erros.o_que_vende ? true : undefined}
                  aria-describedby={erros.o_que_vende ? "erro-o_que_vende" : undefined}
                  className="rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none"
                />
                <MensagemErro id="erro-o_que_vende" texto={erros.o_que_vende} />
              </label>
            </>
          )}

          {/* LGPD: nunca vem marcado */}
          <div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="consentimento"
                value="sim"
                aria-describedby={erros.consentimento ? "erro-consentimento" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo"
              />
              <span>
                Concordo que a Staypse use meus dados para me avisar sobre o lançamento, conforme a{" "}
                <Link href="/privacidade" target="_blank" className="font-medium underline">
                  Política de Privacidade
                  <span className="sr-only"> (abre em nova aba)</span>
                </Link>
                .
              </span>
            </label>
            <MensagemErro id="erro-consentimento" texto={erros.consentimento} />
          </div>

          <Aviso estado={estado} />
          <button
            type="submit"
            disabled={enviando}
            className="min-h-12 w-full rounded-full bg-ciano px-6 py-3 font-medium text-petroleo transition hover:brightness-95 disabled:opacity-60"
          >
            {enviando ? "Aguarde..." : "Entrar na lista de espera"}
          </button>
        </>
      )}
    </form>
  );
}
