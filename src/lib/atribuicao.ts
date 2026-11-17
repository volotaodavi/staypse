// Cookie de atribuição (first-party, 30 dias): quem indicou cada produto.
// Formato: lista de { i: item_id, a: afiliado_id, h: @ do afiliado, t: segundos }.
// Regra "último clique vence" POR PRODUTO: um clique novo no mesmo item troca o
// afiliado; itens diferentes guardam indicações diferentes.
// O valor é assinado (HMAC): ninguém consegue forjar uma indicação no navegador.
// A Etapa 6 (checkout) lê este cookie para montar o split.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { segredoDerivado } from "./ip";

export const COOKIE_ATRIBUICAO = "staypse_atrib";
export const DURACAO_ATRIBUICAO_S = 60 * 60 * 24 * 30;
const MAX_ENTRADAS = 20;

export type Atribuicao = { i: string; a: string; h: string; t: number };

const assinatura = (dados: string) =>
  createHmac("sha256", segredoDerivado("staypse:atribuicao:v1")).update(dados).digest("base64url");

export function lerAtribuicoes(valor: string | undefined): Atribuicao[] {
  if (!valor) return [];
  const [dados, sig] = valor.split(".");
  if (!dados || !sig) return [];
  const esperado = Buffer.from(assinatura(dados));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return [];
  try {
    const lista = JSON.parse(Buffer.from(dados, "base64url").toString("utf8")) as Atribuicao[];
    const limite = Date.now() / 1000 - DURACAO_ATRIBUICAO_S;
    return Array.isArray(lista) ? lista.filter((e) => e && typeof e.i === "string" && e.t > limite) : [];
  } catch {
    return [];
  }
}

// Acrescenta (ou substitui) a indicação do item e devolve o novo valor assinado.
export function registrarAtribuicao(valorAtual: string | undefined, nova: Omit<Atribuicao, "t">): string {
  const lista = lerAtribuicoes(valorAtual).filter((e) => e.i !== nova.i);
  lista.unshift({ ...nova, t: Math.floor(Date.now() / 1000) });
  const dados = Buffer.from(JSON.stringify(lista.slice(0, MAX_ENTRADAS))).toString("base64url");
  return `${dados}.${assinatura(dados)}`;
}

export function atribuicaoDoItem(valor: string | undefined, itemId: string): Atribuicao | null {
  return lerAtribuicoes(valor).find((e) => e.i === itemId) ?? null;
}
