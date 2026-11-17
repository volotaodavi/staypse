"use client";
// Formulário da loja pública do produtor: endereço, nome, descrição e foto.
import { useState } from "react";
import { EnviarArquivo } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { problemaNoSlug, sugerirSlug } from "@/lib/vitrine";
import { salvarLoja } from "./acoes";

type Inicial = { loja_slug: string | null; loja_nome: string | null; loja_descricao: string | null; loja_foto_path: string | null };

export function FormLoja({ inicial, nomeEmpresa, uid, site }: { inicial: Inicial; nomeEmpresa: string; uid: string; site: string }) {
  const [slug, setSlug] = useState(inicial.loja_slug ?? sugerirSlug(inicial.loja_nome ?? nomeEmpresa));
  const problema = slug ? problemaNoSlug(slug) : null;

  return (
    <FormAcao acao={salvarLoja}>
      <Campo rotulo="Nome da loja" name="loja_nome" required maxLength={80} defaultValue={inicial.loja_nome ?? nomeEmpresa} />
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
          rows={4}
          maxLength={500}
          defaultValue={inicial.loja_descricao ?? ""}
          className="rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
        />
      </label>
      <EnviarArquivo
        bucket="fotos-itens"
        campo="loja_foto_path"
        rotulo="Foto ou logo da loja (opcional)"
        uid={uid}
        prefixo="loja"
        aceita="image/jpeg,image/png,image/webp"
        caminhoInicial={inicial.loja_foto_path}
        tamanhoMaximoMb={5}
        dica="JPG, PNG ou WebP, até 5 MB. Aparece redonda no topo da loja."
      />
      <BotaoEnviar>Salvar loja</BotaoEnviar>
    </FormAcao>
  );
}
