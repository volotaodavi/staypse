// Link curto do afiliado/vendedor: /@ana/tenis-runner (página do produto na loja).
// A lógica fica em abrir.ts, compartilhada com /@ana/tenis-runner/comprar.
import type { NextRequest } from "next/server";
import { abrirLink } from "./abrir";

export async function GET(request: NextRequest, { params }: RouteContext<"/ir/[afiliado]/[produto]">) {
  const { afiliado, produto } = await params;
  return abrirLink(request, afiliado, produto, false);
}
