// Envio de e-mail pelo Resend (API oficial). SÓ envia se RESEND_API_KEY e
// RESEND_FROM existirem; sem elas, não tenta nada e nada quebra.
// Nunca registra o endereço de e-mail nos logs (LGPD).
import "server-only";

const API = "https://api.resend.com/emails";

export type ResultadoEnvio = "enviado" | "desativado" | "falhou";

export function emailAtivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function enviarEmail(args: { para: string; assunto: string; texto: string; html: string }): Promise<ResultadoEnvio> {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.RESEND_FROM;
  if (!chave || !de) return "desativado";

  try {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: de, to: [args.para], subject: args.assunto, text: args.texto, html: args.html }),
      // e-mail lento não pode travar a inscrição
      signal: AbortSignal.timeout(5_000),
    });
    if (!resposta.ok) {
      console.error(`Resend: HTTP ${resposta.status}`);
      return "falhou";
    }
    return "enviado";
  } catch (e) {
    console.error("Resend: falha no envio", e instanceof Error ? e.name : "erro");
    return "falhou";
  }
}
