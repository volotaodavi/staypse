// Registra o clique em um link EXTERNO da vitrine (Shopee, Mercado Livre,
// TikTok Shop) — chamado pelo navegador com navigator.sendBeacon, sem atrasar
// a ida para o outro site. (Produtos da Staypse contam o clique no link curto
// /@afiliado/produto.)
// Gravado: vitrine, link, data e o HASH do IP (nunca o IP puro). O banco
// ignora repetição do mesmo IP no mesmo link por 10 minutos.
import { hashDoIp } from "@/lib/ip";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;

export async function POST(request: Request) {
  let corpo: Record<string, unknown> = {};
  try {
    // sendBeacon manda como text/plain; por isso lemos texto e convertemos
    const texto = await request.text();
    if (texto.length > 2000) return new Response(null, { status: 413 });
    corpo = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const vitrine = typeof corpo.vitrine === "string" && SLUG.test(corpo.vitrine) ? corpo.vitrine : null;
  const link = typeof corpo.link === "string" && UUID.test(corpo.link) ? corpo.link : null;
  if (!vitrine || !link) return new Response(null, { status: 400 });

  const { error } = await criarClienteAdmin().rpc("registrar_clique_externo", {
    p_vitrine: vitrine,
    p_link: link,
    p_ip_hash: await hashDoIp(),
  });
  // 204 mesmo quando o banco ignorou (repetido/inválido): não revela nada a robôs
  if (error) console.error("registrar_clique_externo:", error.message);
  return new Response(null, { status: 204 });
}
