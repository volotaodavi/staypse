"use client";
// Botão "Aceitar e me afiliar" do convite de afiliação.
import { BotaoEnviar, FormAcao } from "@/components/formulario";
import { aceitarConviteAfiliacao } from "./acoes";

export function FormAceiteAfiliacao({ token }: { token: string }) {
  return (
    <FormAcao acao={aceitarConviteAfiliacao}>
      <input type="hidden" name="token" value={token} />
      <BotaoEnviar>Aceitar e me afiliar</BotaoEnviar>
    </FormAcao>
  );
}
