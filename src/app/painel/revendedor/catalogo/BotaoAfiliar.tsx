"use client";
// Botão "Afiliar-se" de cada cartão do catálogo (mostra o resultado no próprio cartão).
import { useActionState } from "react";
import { Aviso, BotaoEnviar } from "@/components/formulario";
import { afiliar } from "../acoes";

export function BotaoAfiliar({ itemId, manual }: { itemId: string; manual: boolean }) {
  const [estado, acao] = useActionState(afiliar, undefined);
  if (estado?.sucesso) return <Aviso estado={estado} />;
  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="item_id" value={itemId} />
      <BotaoEnviar variante="base">{manual ? "Pedir afiliação" : "Afiliar-se"}</BotaoEnviar>
      <Aviso estado={estado} />
    </form>
  );
}
