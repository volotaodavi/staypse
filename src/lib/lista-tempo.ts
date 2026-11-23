// Tempo mínimo de preenchimento do formulário (antispam).
// O relógio é do SERVIDOR: ao abrir o formulário o navegador pede um "carimbo"
// (hora + assinatura HMAC). No envio, o servidor confere a assinatura e
// calcula há quanto tempo o carimbo foi emitido. Como o cliente não consegue
// assinar nem alterar a hora, não dá para "fingir" que demorou.
// Sem "server-only" para poder ser testado; o segredo vem de quem chama.
import { createHmac, timingSafeEqual } from "node:crypto";

export const TEMPO_MINIMO_MS = 3_000; // 3 segundos
export const TEMPO_MAXIMO_MS = 2 * 60 * 60 * 1_000; // carimbo vale por 2 horas

const assinatura = (segredo: string, hora: string) =>
  createHmac("sha256", segredo).update(`lista-tempo:${hora}`).digest("hex");

export function assinarTempo(segredo: string, agora = Date.now()): string {
  const hora = String(agora);
  return `${hora}.${assinatura(segredo, hora)}`;
}

export type ResultadoTempo = "ok" | "invalido" | "cedo" | "expirado";

export function conferirTempo(segredo: string, carimbo: unknown, agora = Date.now()): ResultadoTempo {
  if (typeof carimbo !== "string") return "invalido";
  const [hora, sig, resto] = carimbo.split(".");
  if (resto !== undefined || !hora || !sig || !/^\d{10,16}$/.test(hora)) return "invalido";

  const esperado = Buffer.from(assinatura(segredo, hora));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return "invalido";

  const decorrido = agora - Number(hora);
  if (decorrido < TEMPO_MINIMO_MS) return "cedo";
  if (decorrido > TEMPO_MAXIMO_MS) return "expirado";
  return "ok";
}
