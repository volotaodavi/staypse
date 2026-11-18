// Webhook do provedor de pagamento: /api/webhooks/pagamentos/mock | /lytex
//  1. confere a assinatura (origem verdadeira) — sem ela, 401;
//  2. grava o evento bruto (auditoria) e ignora repetições (idempotência);
//  3. aplica o efeito (status do recebedor, pagamento confirmado...).
// Lytex: responde 501 até a integração ser feita com a documentação oficial.
import { NextResponse } from "next/server";
import { provedorPorNome, simuladorAtivo } from "@/lib/pagamentos";
import { processarEvento } from "@/lib/pagamentos/recebedores";
import { IntegracaoPendente } from "@/lib/pagamentos/tipos";

export async function POST(request: Request, ctx: RouteContext<"/api/webhooks/pagamentos/[provedor]">) {
  const { provedor: nome } = await ctx.params;
  const provedor = provedorPorNome(nome);
  if (!provedor) return NextResponse.json({ erro: "provedor_desconhecido" }, { status: 404 });
  // o simulador só aceita eventos enquanto estiver ligado (nunca em produção)
  if (provedor.nome === "mock" && !simuladorAtivo()) return NextResponse.json({ erro: "simulador_desligado" }, { status: 404 });

  const corpo = await request.text();
  if (corpo.length > 100_000) return NextResponse.json({ erro: "corpo_grande_demais" }, { status: 413 });
  let evento;
  try {
    evento = await provedor.validarWebhook(corpo, request.headers);
  } catch (e) {
    if (e instanceof IntegracaoPendente) return NextResponse.json({ erro: "integracao_pendente" }, { status: 501 });
    return NextResponse.json({ erro: "assinatura_invalida" }, { status: 401 });
  }

  try {
    const r = await processarEvento(provedor, evento, corpo);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    // 500: o provedor reenvia; o evento bruto já ficou registrado com o erro
    return NextResponse.json({ erro: "falha_ao_processar" }, { status: 500 });
  }
}
