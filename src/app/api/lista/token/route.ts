// Carimbo de hora assinado do formulário da lista de espera (ver
// src/lib/lista-tempo.ts). A página é estática/cacheada; por isso a hora é
// pedida aqui, a cada abertura do formulário, e nunca vem do cache.
import { NextResponse, connection } from "next/server";
import { segredoDerivado } from "@/lib/ip";
import { assinarTempo } from "@/lib/lista-tempo";

export async function GET() {
  await connection();
  return NextResponse.json(
    { t: assinarTempo(segredoDerivado("staypse:lista-tempo:v1")) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
