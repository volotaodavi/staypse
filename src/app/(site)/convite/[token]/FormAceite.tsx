"use client";
// Aceitar o convite: se a pessoa ainda não tem @ (vitrine), escolhe agora —
// os links dela serão <site>/@seu-nome/produto.
import { useState } from "react";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { problemaNoSlug, sugerirSlug } from "@/lib/vitrine";
import { aceitarConvite } from "./acoes";

export function FormAceite({ token, arroba, nome, site }: { token: string; arroba: string | null; nome: string; site: string }) {
  const [slug, setSlug] = useState(arroba ?? sugerirSlug(nome));
  const problema = !arroba && slug ? problemaNoSlug(slug) : null;
  return (
    <FormAcao acao={aceitarConvite}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="tem_vitrine" value={arroba ? "sim" : "nao"} />
      {arroba ? (
        <p className="text-sm">
          Seus links vão usar o seu @ atual: <strong className="font-medium">@{arroba}</strong>
        </p>
      ) : (
        <Campo
          rotulo="Seu @"
          name="slug"
          required
          maxLength={40}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          dica={problema ?? `Seus links: ${site}/@${slug || "seu-nome"}/produto`}
          autoCapitalize="none"
          autoCorrect="off"
        />
      )}
      <BotaoEnviar>Aceitar convite</BotaoEnviar>
    </FormAcao>
  );
}
