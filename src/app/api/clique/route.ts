// Registra um clique (item da Staypse ou link externo) — chamado pelo navegador
// com navigator.sendBeacon, sem atrasar a navegação de quem clicou.
//
// O que é gravado: vitrine, item/link, código do afiliado, data e o HASH do IP
// (nunca o IP puro). O banco ignora repetição do mesmo IP no mesmo item/link
// por 10 minutos (função registrar_clique).
import { hashDoIp } from "@/lib/ip";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9-]{1,120}$/;
const CODIGO = /^[0-9a-f]{8}$/;

// só aceita texto curto no formato esperado; o resto vira null
const campo = (valor: unknown, formato: RegExp) =>
  typeof valor === "string" && formato.test(valor) ? valor : null;

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

  const item = campo(corpo.item, SLUG);
  const link = campo(corpo.link, UUID);
  if (!item && !link) return new Response(null, { status: 400 });

  const { error } = await criarClienteAdmin().rpc("registrar_clique", {
    p_vitrine: campo(corpo.vitrine, SLUG),
    p_item_slug: item,
    p_link: link,
    p_codigo: campo(corpo.codigo, CODIGO),
    p_ip_hash: await hashDoIp(),
    p_origem: campo(corpo.origem, /^[a-z_]{1,30}$/),
  });
  // 204 mesmo quando o banco ignorou (repetido/inválido): não revela nada a robôs
  if (error) console.error("registrar_clique:", error.message);
  return new Response(null, { status: 204 });
}
