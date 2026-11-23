// Cobrança com split, estorno e conciliação — tudo contra a INTERFACE PaymentProvider
// (simulador agora; Lytex quando a documentação oficial chegar). A Staypse NUNCA recebe
// nem repassa dinheiro: aqui só se pede a cobrança ao provedor (que divide direto entre
// loja, quem indicou e a Staypse), guarda-se a referência + o snapshot do split e aplica-se
// o status que o provedor informa. Nenhum dado de cartão passa por aqui.
import "server-only";
import { despacharEmailsNotificacoes } from "@/lib/notificacoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { nomeDoProvedor, provedorPagamentos } from ".";
import { montarSplit, type DadosSplitPedido } from "./montar-split";
import { efeitoDoStatus, statusCobrancaValido } from "./status";
import { IntegracaoPendente, type StatusCobranca } from "./tipos";

// Conta da Staypse no provedor (recebedor da taxa da plataforma). Só em variável de ambiente.
export function staypseRecebedorId(): string {
  const id = process.env.STAYPSE_RECEBEDOR_ID?.trim();
  if (id) return id;
  if (nomeDoProvedor() === "mock") return "mock_rec_staypse";
  throw new Error("STAYPSE_RECEBEDOR_ID não configurado (ver .env.example).");
}

// Cria a cobrança do pedido (uma vez só) e devolve a página de pagamento do provedor.
export async function iniciarCobranca(pedidoId: string, urlRetorno: string): Promise<{ url: string | null }> {
  const admin = criarClienteAdmin();
  const provedor = provedorPagamentos();

  const { data: atual } = await admin.from("orders").select("status, cobranca_url, cobranca_id").eq("id", pedidoId).maybeSingle();
  if (!atual || atual.status !== "aguardando_pagamento") throw new Error("pedido_nao_aguarda_pagamento");
  if (atual.cobranca_id) return { url: atual.cobranca_url };

  const { data: dados, error } = await admin.rpc("dados_split_pedido", { p_order: pedidoId, p_provedor: provedor.nome });
  if (error || !dados) throw new Error(error?.message ?? "falha_ao_montar_split");
  const { partes, snapshot } = montarSplit(dados as unknown as DadosSplitPedido, staypseRecebedorId());

  const cobranca = await provedor.criarCobranca({
    pedidoId,
    totalCentavos: (dados as unknown as DadosSplitPedido).total_centavos,
    split: partes,
    descricao: String((dados as { descricao?: string }).descricao ?? "Pedido Staypse"),
    urlRetorno,
  });

  const { error: erroRegistro } = await admin.rpc("registrar_cobranca", {
    p_order: pedidoId,
    p_provedor: provedor.nome,
    p_cobranca_id: cobranca.provedorId,
    p_url: cobranca.urlPagamento ?? null,
    p_snapshot: snapshot as never,
  });
  if (erroRegistro) {
    // clique duplo: outra requisição registrou antes — usa a cobrança dela
    const { data: outra } = await admin.from("orders").select("cobranca_url").eq("id", pedidoId).maybeSingle();
    if (outra?.cobranca_url !== undefined && erroRegistro.message.includes("pedido_sem_cobranca_possivel")) return { url: outra.cobranca_url };
    throw new Error(erroRegistro.message);
  }
  return { url: cobranca.urlPagamento ?? null };
}

// Aplica o status que o provedor informou (webhook ou conciliação). Idempotente no banco.
export async function aplicarStatusCobranca(provedor: string, cobrancaId: string, status: StatusCobranca, pedidoId?: string) {
  if (!statusCobrancaValido(status)) throw new Error("status_cobranca_invalido");
  const { data, error } = await criarClienteAdmin().rpc("aplicar_status_cobranca", {
    p_provedor: provedor,
    p_cobranca_id: cobrancaId,
    p_status: status,
    p_pedido: pedidoId ?? undefined,
  });
  if (error) throw new Error(error.message);
  // venda nova / comissão estornada: o e-mail importante sai logo depois (sem chave de e-mail, não faz nada)
  await despacharEmailsNotificacoes();
  return String(data);
}

// Reembolso pelo admin: pede o estorno ao provedor. O pedido só vira "reembolsado" quando o
// provedor CONFIRMAR (webhook "estornada"; se ele já responder "estornada", aplica na hora).
export async function solicitarEstorno(pedidoId: string, adminId: string): Promise<{ confirmado: boolean }> {
  const admin = criarClienteAdmin();
  const provedor = provedorPagamentos();
  const { data: p } = await admin.from("orders").select("status, cobranca_provedor, cobranca_id").eq("id", pedidoId).maybeSingle();
  if (!p?.cobranca_id) throw new Error("pedido_sem_cobranca");
  if (p.status !== "em_reembolso") throw new Error("pedido_nao_esta_em_reembolso");
  if (p.cobranca_provedor !== provedor.nome) throw new Error("provedor_diferente");

  const r = await provedor.estornar(p.cobranca_id);
  await admin.rpc("registrar_estorno_solicitado", { p_order: pedidoId, p_ator: adminId, p_status_provedor: r.status });
  if (r.status === "estornada") {
    await aplicarStatusCobranca(provedor.nome, p.cobranca_id, "estornada", pedidoId);
    return { confirmado: true };
  }
  return { confirmado: false };
}

export type ResumoConciliacao = {
  provedor: string;
  consultadas: number;
  aplicadas: Record<string, number>; // efeito → quantidade (ex.: confirmado: 2)
  sem_mudanca: number;
  erros: number;
  integracao_pendente?: boolean;
};

// Conciliação: para cada cobrança pendente há mais de 1 hora (ou em estorno), pergunta ao
// provedor e aplica o status pelo MESMO caminho do webhook. O resumo vai para o audit_log.
export async function conciliarCobrancas(): Promise<ResumoConciliacao> {
  const admin = criarClienteAdmin();
  const provedor = provedorPagamentos();
  const resumo: ResumoConciliacao = { provedor: provedor.nome, consultadas: 0, aplicadas: {}, sem_mudanca: 0, erros: 0 };

  const { data: pendentes, error } = await admin.rpc("cobrancas_para_conciliar", { p_provedor: provedor.nome });
  if (error) throw new Error(error.message);

  for (const c of pendentes ?? []) {
    try {
      const cobranca = await provedor.consultarCobranca(c.cobranca_id);
      resumo.consultadas++;
      if (efeitoDoStatus(cobranca.status) === "nenhum") {
        resumo.sem_mudanca++;
        continue;
      }
      const efeito = await aplicarStatusCobranca(provedor.nome, c.cobranca_id, cobranca.status, c.pedido_id);
      if (efeito === "sem_efeito") resumo.sem_mudanca++;
      else resumo.aplicadas[efeito] = (resumo.aplicadas[efeito] ?? 0) + 1;
    } catch (e) {
      resumo.erros++;
      if (e instanceof IntegracaoPendente) {
        resumo.integracao_pendente = true;
        break; // sem integração não adianta consultar o resto
      }
    }
  }
  await admin.rpc("registrar_conciliacao", { p_resumo: resumo as never });
  return resumo;
}
