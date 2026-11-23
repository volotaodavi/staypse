// Hash do IP de quem fez o pedido (LGPD: o IP puro nunca é guardado).
// Usado na lista de espera (limite por IP) e nos cliques (1 por IP/item a cada 10 min).
import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";

// HASH_IP_SEGREDO é opcional: sem ele, derivamos um segredo da chave secreta
// do Supabase (HMAC com rótulo fixo, o valor final não é a chave em si).
function segredoDoHash(): string {
  if (process.env.HASH_IP_SEGREDO) return process.env.HASH_IP_SEGREDO;
  return segredoDerivado("staypse:hash-ip:v1");
}

// Segredo próprio para cada uso (ex.: assinar o cookie de atribuição), derivado
// da chave secreta do Supabase. Um rótulo diferente dá um segredo diferente.
export function segredoDerivado(rotulo: string): string {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Configure SUPABASE_SECRET_KEY (ver .env.example).");
  return createHmac("sha256", chave).update(rotulo).digest("hex");
}

// Na Vercel, x-forwarded-for é preenchido pela própria Vercel.
export async function hashDoIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  return createHmac("sha256", segredoDoHash()).update(ip).digest("hex");
}
