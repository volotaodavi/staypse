// Segunda modalidade do link: /@ana/tenis-runner/comprar leva DIRETO ao
// checkout da loja oficial (mesmo clique contado e mesma atribuição).
import type { NextRequest } from "next/server";
import { abrirLink } from "../abrir";

export async function GET(request: NextRequest, { params }: RouteContext<"/ir/[afiliado]/[produto]/comprar">) {
  const { afiliado, produto } = await params;
  return abrirLink(request, afiliado, produto, true);
}
