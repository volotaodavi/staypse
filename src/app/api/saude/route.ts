// Checagem de saúde para monitor externo gratuito (ex.: UptimeRobot a cada 5 min).
// 200 = site e banco respondendo; 503 = banco fora. Também evita que o
// Supabase gratuito "durma" por falta de acesso.
import { NextResponse, connection } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function GET() {
  await connection();
  const inicio = Date.now();
  try {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase.rpc("saude");
    if (error || data !== 1) throw new Error("banco");
    return NextResponse.json({ ok: true, banco_ms: Date.now() - inicio }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
