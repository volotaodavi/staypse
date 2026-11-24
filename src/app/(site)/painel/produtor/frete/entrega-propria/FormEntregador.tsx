"use client";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { salvarEntregador } from "./acoes";

export function FormEntregador() {
  return (
    <FormAcao acao={salvarEntregador}>
      <Campo rotulo="Nome do entregador" name="nome" required maxLength={80} placeholder="João" />
      <Campo rotulo="Telefone com DDD" name="telefone" type="tel" inputMode="tel" required maxLength={16} placeholder="(21) 99999-0000" />
      <BotaoEnviar variante="base">Cadastrar entregador</BotaoEnviar>
    </FormAcao>
  );
}
