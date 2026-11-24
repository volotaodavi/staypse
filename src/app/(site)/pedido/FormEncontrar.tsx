"use client";
import { useActionState } from "react";
import { Aviso, BotaoEnviar, Campo } from "@/components/formulario";
import { recuperarLink } from "./[codigo]/acoes";

export function FormEncontrar() {
  const [estado, acao] = useActionState(recuperarLink, undefined);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo rotulo="Código do pedido" name="codigo" required maxLength={12} autoComplete="off" />
      <Campo rotulo="E-mail da compra" name="email" type="email" required autoComplete="email" />
      <Aviso estado={estado} />
      <BotaoEnviar variante="base">Receber o link por e-mail</BotaoEnviar>
    </form>
  );
}
