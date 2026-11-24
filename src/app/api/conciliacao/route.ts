// Conciliação diária de cobranças: /api/conciliacao
// A Vercel Cron chama (GET) com "Authorization: Bearer <CRON_SECRET>" (ver vercel.json).
// Para cada cobrança pendente há mais de 1 hora, pergunta ao provedor e aplica o status pelo
// mesmo caminho do webhook; o resumo fica no audit_log. Sem CRON_SECRET configurado, a rota
// fica FECHADA (nunca aberta por esquecimento).
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { simuladorAtivo, nomeDoProvedor } from "@/lib/pagamentos";
import { despacharEmailsNotificacoes } from "@/lib/notificacoes";
import { conciliarCobrancas } from "@/lib/pagamentos/cobrancas";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const hash = (v: string) => createHash("sha256").update(v).digest();

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || segredo.length < 16) return false;
  const recebido = request.headers.get("authorization") ?? "";
  // compara o hash dos dois lados: tempo constante e tamanhos iguais
  return timingSafeEqual(hash(recebido), hash(`Bearer ${segredo}`));
}

async function conciliar(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 16) {
    return NextResponse.json({ erro: "cron_secret_nao_configurado" }, { status: 503 });
  }
  if (!autorizado(request)) return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  if (nomeDoProvedor() === "mock" && !simuladorAtivo()) return NextResponse.json({ erro: "simulador_desligado" }, { status: 404 });
  try {
    const resumo = await conciliarCobrancas();
    // pedidos pagos sem nota fiscal depois do prazo: avisa a loja (uma vez por pedido) e envia os e-mails da fila
    const { data: semNf } = await criarClienteAdmin().rpc("notificar_pedidos_sem_nf");
    await despacharEmailsNotificacoes();
    // saques pedidos na Lytex que ela nunca devolve como "concluído" (não há consulta): encerra os com mais de 2 dias
    await criarClienteAdmin().rpc("encerrar_saques_pendentes");
    // sem integração com o provedor real, o cron falha de forma visível (nunca finge que conciliou)
    return NextResponse.json({ ok: !resumo.integracao_pendente, ...resumo, avisos_sem_nf: semNf ?? 0 }, { status: resumo.integracao_pendente ? 501 : 200 });
  } catch {
    return NextResponse.json({ erro: "falha_na_conciliacao" }, { status: 500 });
  }
}

export const GET = conciliar;
export const POST = conciliar;
