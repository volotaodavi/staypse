"use client";
// Formulário da lista de espera, com duas abas: revendedor e produtor.
// As abas seguem o endereço: os botões do topo levam a #revender ou #produtos.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Aviso, BotaoEnviar, Campo } from "@/components/formulario";
import { NICHOS, TIPOS_PRODUTO, UFS, type TipoInscricao } from "@/lib/lista";
import { inscrever } from "./acoes";

const ABA_POR_HASH: Record<string, TipoInscricao> = {
  "#revender": "revendedor",
  "#produtos": "produtor",
};

export function FormLista() {
  const ref = useSearchParams().get("ref") ?? ""; // quem indicou (staypse.com.br/?ref=...)
  const [estado, acao] = useActionState(inscrever, undefined);
  const [tipo, setTipo] = useState<TipoInscricao>("revendedor");

  // Abre a aba certa quando a pessoa clica nos botões do topo (#revender / #produtos)
  useEffect(() => {
    const seguirHash = () => {
      const aba = ABA_POR_HASH[window.location.hash];
      if (aba) setTipo(aba);
    };
    seguirHash();
    window.addEventListener("hashchange", seguirHash);
    return () => window.removeEventListener("hashchange", seguirHash);
  }, []);

  // Depois de um erro, o React limpa o formulário: reaproveitamos o que veio de volta
  const v = estado?.valores ?? {};
  const abaAtual = (v.interesse as TipoInscricao) || tipo;
  const nichosMarcados = (v.nichos ?? "").split(",");

  if (estado?.sucesso) return <Aviso estado={estado} />;

  const botaoAba = (valor: TipoInscricao, rotulo: string) => (
    <button
      type="button"
      onClick={() => setTipo(valor)}
      aria-pressed={abaAtual === valor}
      className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${
        abaAtual === valor ? "bg-petroleo text-branco" : "text-petroleo"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-full bg-gelo p-1">
        {botaoAba("revendedor", "Quero revender")}
        {botaoAba("produtor", "Tenho produtos")}
      </div>

      {/* "key" troca o formulário inteiro ao mudar de aba */}
      <form key={abaAtual} action={acao} className="flex flex-col gap-4">
        <input type="hidden" name="interesse" value={abaAtual} />
        <input type="hidden" name="ref" value={ref} />

        {/* Honeypot: invisível para pessoas; robôs preenchem e são descartados */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Não preencha este campo
            <input type="text" name="site" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <Campo rotulo="Nome" name="nome" autoComplete="name" required minLength={2} maxLength={120} defaultValue={v.nome} />

        {abaAtual === "produtor" && (
          <>
            <Campo rotulo="Empresa ou marca" name="empresa" autoComplete="organization" required maxLength={200} defaultValue={v.empresa} />
            <Campo
              rotulo="CNPJ (opcional)"
              name="cnpj"
              inputMode="text"
              maxLength={18}
              placeholder="00.000.000/0000-00"
              dica="Para vender na Staypse o CNPJ será obrigatório. Agora é opcional."
              defaultValue={v.cnpj}
            />
          </>
        )}

        <Campo
          rotulo="WhatsApp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(81) 99876-5432"
          required
          defaultValue={v.whatsapp}
        />
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required defaultValue={v.email} />

        {abaAtual === "revendedor" ? (
          <>
            {/* minmax(0,1fr): deixa o campo Cidade encolher no celular (sem isso a UF vaza da tela) */}
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
              <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" required maxLength={120} defaultValue={v.cidade} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                UF
                <select
                  name="uf"
                  required
                  defaultValue={v.uf ?? ""}
                  className="rounded-xl border border-petroleo/20 bg-branco px-3 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none"
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

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Nichos de interesse</legend>
              <div className="flex flex-wrap gap-2">
                {NICHOS.map((n) => (
                  <label
                    key={n.valor}
                    className="cursor-pointer rounded-full border border-petroleo/20 px-3 py-2 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-petroleo has-[:checked]:text-branco"
                  >
                    <input
                      type="checkbox"
                      name="nichos"
                      value={n.valor}
                      defaultChecked={nichosMarcados.includes(n.valor)}
                      className="sr-only"
                    />
                    {n.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Tipo de produto</legend>
              <div className="flex gap-2">
                {TIPOS_PRODUTO.map((t) => (
                  <label
                    key={t.valor}
                    className="flex-1 cursor-pointer rounded-full border border-petroleo/20 px-3 py-2 text-center text-sm has-[:checked]:border-petroleo has-[:checked]:bg-petroleo has-[:checked]:text-branco"
                  >
                    <input
                      type="radio"
                      name="tipo_produto"
                      value={t.valor}
                      required
                      defaultChecked={v.tipo_produto === t.valor}
                      className="sr-only"
                    />
                    {t.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 text-sm font-medium">
              O que você vende?
              <textarea
                name="o_que_vende"
                required
                maxLength={500}
                rows={3}
                placeholder="Ex.: cosméticos naturais, camisetas, curso de confeitaria"
                defaultValue={v.o_que_vende}
                className="rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none"
              />
            </label>
          </>
        )}

        {/* LGPD: nunca vem marcado */}
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="consentimento" value="sim" required className="mt-0.5 h-4 w-4 shrink-0 accent-petroleo" />
          <span>
            Concordo que a Staypse use meus dados para me avisar sobre o lançamento, conforme a{" "}
            <Link href="/privacidade" target="_blank" className="font-medium underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        <Aviso estado={estado} />
        <BotaoEnviar>Entrar na lista de espera</BotaoEnviar>
      </form>
    </div>
  );
}
