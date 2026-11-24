// Cobrança com split, estorno e conciliação, tudo contra a INTERFACE PaymentProvider
// (simulador agora; Lytex quando a documentação oficial chegar). A Staypse NUNCA recebe
// nem repassa dinheiro: aqui só se pede a cobrança ao provedor (que divide direto entre
// loja, quem indicou e a Staypse), guarda-se a referência + o snapshot do split e aplica-se
// o status que o provedor informa. Nenhum dado de cartão passa por aqui.
import "server-only";
import { despacharEmailsNotificacoes } from "@/lib/notificacoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { nomeDoProvedor, provedorPagamentos, provedorPorNome } from ".";
import { acrescimoParcelamento, parcelaTemJuros, parcelasPermitidas, politicaDoBanco, semJurosAte } from "./juros";
import { montarSplit, type DadosSplitPedido } from "./montar-split";
import { efeitoDoStatus, statusCobrancaValido } from "./status";
import { lerTaxasPlataforma, modalidadeDoPagamento, type Modalidade } from "./taxas";
import { IntegracaoPendente, type Cobranca, type DadosPagamento, type StatusCobranca } from "./tipos";

// Conta da Staypse no provedor (recebedor da taxa da plataforma). Só em variável de ambiente.
export function staypseRecebedorId(): string {
  const id = process.env.STAYPSE_RECEBEDOR_ID?.trim();
  if (id) return id;
  if (nomeDoProvedor() === "mock") return "mock_rec_staypse";
  throw new Error("STAYPSE_RECEBEDOR_ID não configurado (ver .env.example).");
}

// Cria a cobrança do pedido (uma vez só) e devolve a página de pagamento do provedor.
// `escolha` vem do checkout (meio e parcelas): define a modalidade da taxa total da loja e o que
// a fatura habilita. Sem escolha (pedido antigo, "Pagar agora" da página do pedido), o comprador decide
// na página do provedor; a fatura só aceita parcelas SEM juros (até o limite da loja), então nunca há acréscimo.
// Parcelas acima do limite sem juros da loja: o comprador paga o acréscimo de juros.ts (docs/precificacao.md, seção 9).

export type EscolhaPagamento = { meio: "pix" | "boleto" | "cartao"; parcelas: number };

export async function iniciarCobranca(
  pedidoId: string,
  urlRetorno: string,
  escolha?: EscolhaPagamento,
): Promise<{ url: string | null; pagamento: DadosPagamento | null }> {
  const admin = criarClienteAdmin();
  const provedor = provedorPagamentos();

  const { data: atual } = await admin
    .from("orders")
    .select("status, cobranca_url, cobranca_id, cobranca_pagamento, comprador_nome, comprador_documento, comprador_email")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!atual || atual.status !== "aguardando_pagamento") throw new Error("pedido_nao_aguarda_pagamento");
  // repetição: devolve o Pix/boleto já guardado (o GET da fatura na Lytex não traz o código)
  if (atual.cobranca_id) return { url: atual.cobranca_url, pagamento: (atual.cobranca_pagamento as DadosPagamento | null) ?? null };

  const { data: dados, error } = await admin.rpc("dados_split_pedido", { p_order: pedidoId, p_provedor: provedor.nome });
  if (error || !dados) throw new Error(error?.message ?? "falha_ao_montar_split");
  const dadosSplit = dados as unknown as DadosSplitPedido;
  const taxas = lerTaxasPlataforma(dadosSplit.taxas);
  const politica = politicaDoBanco((dados as { politica?: unknown }).politica);
  if (taxas.pedidoMinimoCentavos > dadosSplit.total_centavos) throw new Error("pedido_abaixo_do_minimo");

  // modalidade da taxa e acréscimo do parcelamento (juros pago pelo comprador, só acima do limite sem juros da loja)
  let modalidade: Modalidade;
  let acrescimo = 0;
  let parcelasFatura: number | undefined; // limite de parcelas que a fatura aceita
  if (escolha) {
    modalidade = modalidadeDoPagamento(escolha.meio, escolha.parcelas);
    if (escolha.meio === "cartao") {
      if (escolha.parcelas > parcelasPermitidas(dadosSplit.total_centavos, politica)) throw new Error("parcelas_invalidas");
      if (parcelaTemJuros(escolha.parcelas, politica)) acrescimo = acrescimoParcelamento(dadosSplit.total_centavos, modalidade, taxas);
      parcelasFatura = escolha.parcelas;
    }
  } else {
    parcelasFatura = semJurosAte(dadosSplit.total_centavos, politica);
    modalidade = modalidadeDoPagamento("cartao", parcelasFatura);
  }
  const { partes, snapshot } = montarSplit(dadosSplit, staypseRecebedorId(), modalidade, { acrescimoCentavos: acrescimo });

  const cobranca = await provedor.criarCobranca({
    pedidoId,
    // a fatura vale o total do pedido + o acréscimo do parcelamento (0 na maioria das vendas)
    totalCentavos: dadosSplit.total_centavos + acrescimo,
    split: partes,
    descricao: String((dados as { descricao?: string }).descricao ?? "Pedido Staypse"),
    urlRetorno,
    // meio e parcelas: a Lytex habilita só o escolhido (paymentMethods.*.enable e creditCard.maxParcels)
    ...(escolha ? { meio: escolha.meio } : {}),
    parcelas: parcelasFatura,
    comprador: atual.comprador_documento
      ? { nome: atual.comprador_nome, documento: atual.comprador_documento, email: atual.comprador_email ?? undefined }
      : undefined,
  });

  const { error: erroRegistro } = await admin.rpc("registrar_cobranca", {
    p_order: pedidoId,
    p_provedor: provedor.nome,
    p_cobranca_id: cobranca.provedorId,
    p_url: cobranca.urlPagamento ?? null,
    p_snapshot: snapshot as never,
    p_meio: escolha?.meio,
    p_parcelas: escolha?.meio === "cartao" ? escolha.parcelas : undefined,
    p_pagamento: (cobranca.pagamento ?? undefined) as never,
    p_acrescimo: acrescimo,
  });
  if (erroRegistro) {
    // clique duplo: outra requisição registrou antes, usa a cobrança dela
    const { data: outra } = await admin.from("orders").select("cobranca_url, cobranca_pagamento").eq("id", pedidoId).maybeSingle();
    if (outra?.cobranca_url !== undefined && erroRegistro.message.includes("pedido_sem_cobranca_possivel"))
      return { url: outra.cobranca_url, pagamento: (outra.cobranca_pagamento as DadosPagamento | null) ?? null };
    throw new Error(erroRegistro.message);
  }
  return { url: cobranca.urlPagamento ?? null, pagamento: cobranca.pagamento ?? null };
}

// Confere o que o provedor diz ter recebido ANTES de confirmar o pagamento (seguranca-auditoria A2): o valor tem que
// ser exatamente o da fatura (total do pedido + acréscimo do parcelamento) e a moeda BRL. Nunca confia só no aviso:
// sem a cobrança já consultada, pergunta ao provedor. Divergência não confirma o pedido: fica no log, avisa os admins
// e o evento falha (o provedor reenvia ou a conciliação tenta de novo).
async function conferirPagamento(provedorNome: string, cobrancaId: string, consultada?: Cobranca) {
  const admin = criarClienteAdmin();
  const { data: o } = await admin
    .from("orders")
    .select("id, status, total_centavos, cobranca_acrescimo_centavos")
    .eq("cobranca_provedor", provedorNome)
    .eq("cobranca_id", cobrancaId)
    .maybeSingle();
  if (!o) throw new Error("cobranca_inexistente");
  const provedor = provedorPorNome(provedorNome);
  if (!provedor) throw new Error("provedor_desconhecido");
  const c = consultada ?? (await provedor.consultarCobranca(cobrancaId));
  const esperado = Number(o.total_centavos) + Number(o.cobranca_acrescimo_centavos ?? 0);
  const moeda = String(c.moeda ?? "").toUpperCase();
  if (c.valorCentavos !== esperado || moeda !== "BRL") {
    await admin.rpc("registrar_pagamento_divergente", {
      p_order: o.id,
      p_detalhes: { esperado_centavos: esperado, informado_centavos: c.valorCentavos ?? null, moeda: moeda || null, cobranca_id: cobrancaId } as never,
    });
    throw new Error("pagamento_divergente");
  }
}

// Aplica o status que o provedor informou (webhook ou conciliação). Idempotente no banco.
// `consultada` = a cobrança que a conciliação acabou de buscar (evita uma segunda chamada ao provedor).
export async function aplicarStatusCobranca(provedor: string, cobrancaId: string, status: StatusCobranca, pedidoId?: string, consultada?: Cobranca) {
  if (!statusCobrancaValido(status)) throw new Error("status_cobranca_invalido");
  if (status === "paga") await conferirPagamento(provedor, cobrancaId, consultada);
  const { data, error } = await criarClienteAdmin().rpc("aplicar_status_cobranca", {
    p_provedor: provedor,
    p_cobranca_id: cobrancaId,
    p_status: status,
    p_pedido: pedidoId ?? undefined,
  });
  if (error) throw new Error(error.message);
  const efeito = String(data);
  // dinheiro entrou em pedido já cancelado: estorno automático (ou fila do admin se o provedor não conseguir)
  if (efeito === "pago_em_pedido_cancelado") await tratarPagamentoTardio(provedor, cobrancaId);
  // venda nova / comissão estornada: o e-mail importante sai logo depois (sem chave de e-mail, não faz nada)
  await despacharEmailsNotificacoes();
  return efeito;
}

// Pagamento em pedido cancelado: reserva o tratamento (uma vez só), pede o estorno total ao provedor e registra.
// Se o provedor recusar ou não responder, o caso vai para a fila do admin (audit_log + notificação).
async function tratarPagamentoTardio(provedorNome: string, cobrancaId: string) {
  const admin = criarClienteAdmin();
  const { data: o } = await admin.from("orders").select("id").eq("cobranca_provedor", provedorNome).eq("cobranca_id", cobrancaId).maybeSingle();
  if (!o) return;
  const { data: novo } = await admin.rpc("iniciar_pagamento_tardio", { p_order: o.id });
  if (!novo) return; // já tratado
  try {
    const provedor = provedorPorNome(provedorNome);
    if (!provedor) throw new Error("provedor_desconhecido");
    const r = await provedor.estornar(cobrancaId);
    await admin.rpc("registrar_pagamento_tardio", { p_order: o.id, p_resultado: "estorno_solicitado", p_detalhe: r.status });
  } catch (e) {
    await admin.rpc("registrar_pagamento_tardio", {
      p_order: o.id,
      p_resultado: "fila_admin",
      p_detalhe: e instanceof Error ? e.message.slice(0, 250) : "falha_no_estorno",
    });
  }
}

// Pedido cancelado (desistência ou prazo vencido) cancela a cobrança no provedor, para o comprador não pagar um Pix
// antigo (seguranca-auditoria M5). Falha de rede não quebra nada: a próxima conciliação tenta de novo.
export async function cancelarCobrancasDePedidosCancelados(limite = 100): Promise<{ canceladas: number; erros: number }> {
  const admin = criarClienteAdmin();
  const provedor = provedorPorNome(nomeDoProvedor());
  const resumo = { canceladas: 0, erros: 0 };
  if (!provedor) return resumo;
  const { data: lista } = await admin.rpc("cobrancas_para_cancelar", { p_provedor: provedor.nome, p_limite: limite });
  for (const c of lista ?? []) {
    try {
      const r = await provedor.cancelarCobranca(c.cobranca_id);
      if (r.status === "paga") {
        // pagou antes do cancelamento chegar: o status "paga" cai no tratamento de pagamento tardio
        await aplicarStatusCobranca(provedor.nome, c.cobranca_id, "paga", c.pedido_id, r);
      } else {
        await admin.rpc("registrar_cobranca_cancelada", { p_order: c.pedido_id, p_status: r.status });
        resumo.canceladas++;
      }
    } catch (e) {
      resumo.erros++;
      if (e instanceof IntegracaoPendente) break;
    }
  }
  return resumo;
}

// cancela a cobrança de UM pedido recém-cancelado (a desistência do comprador chama; a conciliação varre o resto)
export async function cancelarCobrancaDoPedido(pedidoId: string): Promise<void> {
  try {
    const admin = criarClienteAdmin();
    const provedor = provedorPorNome(nomeDoProvedor());
    if (!provedor) return;
    const { data: p } = await admin.from("orders").select("status, cobranca_provedor, cobranca_id, cobranca_cancelada_em").eq("id", pedidoId).maybeSingle();
    if (!p?.cobranca_id || p.status !== "cancelado" || p.cobranca_cancelada_em || p.cobranca_provedor !== provedor.nome) return;
    const r = await provedor.cancelarCobranca(p.cobranca_id);
    if (r.status === "paga") await aplicarStatusCobranca(provedor.nome, p.cobranca_id, "paga", pedidoId, r);
    else await admin.rpc("registrar_cobranca_cancelada", { p_order: pedidoId, p_status: r.status });
  } catch (e) {
    console.error("cancelarCobrancaDoPedido:", e instanceof Error ? e.message : e);
  }
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
  canceladas_no_provedor?: number; // cobranças de pedidos cancelados que foram canceladas no provedor
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

  // 1) pedidos cancelados: cancela a cobrança no provedor (nenhum Pix antigo continua pagável)
  const cancel = await cancelarCobrancasDePedidosCancelados();
  resumo.canceladas_no_provedor = cancel.canceladas;
  resumo.erros += cancel.erros;

  // 2) pendentes, em estorno e cancelados recentes (pagamento tardio)
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
      const efeito = await aplicarStatusCobranca(provedor.nome, c.cobranca_id, cobranca.status, c.pedido_id, cobranca);
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
