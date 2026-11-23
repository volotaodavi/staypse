// Simulador de pagamentos (PAYMENTS_PROVIDER=mock). Imita o que esperamos da
// Lytex — recebedor em análise → aprovado/recusado, cobrança paga/recusada,
// estorno e atraso de webhook — para testar o sistema inteiro sem dinheiro real.
// Os webhooks do simulador são ASSINADOS (HMAC), como os de verdade serão.
import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { segredoDerivado } from "@/lib/ip";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { statusCobrancaValido } from "./status";
import type { EventoPagamento, PaymentProvider, RecebedorNoProvedor, StatusCobranca, StatusRecebedor } from "./tipos";

export const CABECALHO_ASSINATURA = "x-staypse-mock-assinatura";
const segredo = () => segredoDerivado("staypse:pagamentos-mock:v1");

export function assinarMock(corpo: string): string {
  return createHmac("sha256", segredo()).update(corpo).digest("hex");
}

// no simulador, a "Lytex" é o próprio banco: o status da cobrança fica em simulador_cobrancas
export async function statusDaCobrancaSimulada(provedorId: string): Promise<StatusCobranca> {
  const { data } = await criarClienteAdmin()
    .from("simulador_cobrancas")
    .select("status, estorno_solicitado_em")
    .eq("provedor_id", provedorId)
    .maybeSingle();
  if (!data) throw new Error("cobranca_inexistente");
  if (data.status === "paga" && data.estorno_solicitado_em) return "estorno_pendente";
  return data.status as StatusCobranca;
}

export const mock: PaymentProvider = {
  nome: "mock",
  async criarRecebedor(dados) {
    const provedorId = `mock_rec_${randomUUID()}`;
    return {
      provedorId,
      status: "em_analise",
      documento: dados.documento,
      // "página da Lytex" simulada, onde dá para aprovar/recusar (só fora de produção)
      urlOnboarding: `/simulador-pagamentos/recebedor/${provedorId}`,
    };
  },
  async consultarRecebedor(provedorId): Promise<RecebedorNoProvedor> {
    // no simulador, a "Lytex" é o próprio banco
    const { data } = await criarClienteAdmin()
      .from("recebedores")
      .select("status_recebedor, motivo, documento")
      .eq("provedor", "mock")
      .eq("provedor_id", provedorId)
      .maybeSingle();
    if (!data) throw new Error("recebedor_inexistente");
    return { provedorId, status: data.status_recebedor as StatusRecebedor, motivo: data.motivo, documento: data.documento };
  },
  async criarCobranca(dados) {
    const soma = dados.split.reduce((s, p) => s + p.valorCentavos, 0);
    if (soma > dados.totalCentavos) throw new Error("split_maior_que_o_total");
    const provedorId = `mock_cob_${randomUUID()}`;
    const { error } = await criarClienteAdmin().from("simulador_cobrancas").insert({
      provedor_id: provedorId,
      pedido_id: dados.pedidoId,
      total_centavos: dados.totalCentavos,
      split: dados.split,
      meio: dados.meio ?? null,
    });
    if (error) throw new Error("falha_ao_criar_cobranca_simulada");
    // "checkout da Lytex" simulado; o link de volta segue junto (só caminho do nosso próprio site)
    const retorno = new URL(dados.urlRetorno);
    const volta = encodeURIComponent(`${retorno.pathname}${retorno.search}`);
    return { provedorId, status: "pendente", urlPagamento: `/simulador-pagamentos/cobranca/${provedorId}?volta=${volta}` };
  },
  async consultarCobranca(provedorId) {
    return { provedorId, status: await statusDaCobrancaSimulada(provedorId) };
  },
  // pede o estorno; o simulador só "confirma" (estornada) quando alguém aperta o botão na página dele,
  // o que dispara o webhook — igual ao que esperamos do provedor real
  async estornar(provedorId) {
    const admin = criarClienteAdmin();
    const status = await statusDaCobrancaSimulada(provedorId);
    if (status !== "paga" && status !== "estorno_pendente") throw new Error("cobranca_nao_paga");
    const { error } = await admin
      .from("simulador_cobrancas")
      .update({ estorno_solicitado_em: new Date().toISOString() })
      .eq("provedor_id", provedorId);
    if (error) throw new Error("falha_ao_estornar");
    return { provedorId, status: "estorno_pendente" };
  },
  async validarWebhook(corpo, cabecalhos): Promise<EventoPagamento> {
    const recebida = Buffer.from(cabecalhos.get(CABECALHO_ASSINATURA) ?? "");
    const esperada = Buffer.from(assinarMock(corpo));
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) throw new Error("assinatura_invalida");
    const evento = JSON.parse(corpo) as EventoPagamento;
    if (!evento?.id || !evento?.tipo) throw new Error("evento_invalido");
    if (evento.tipo === "cobranca.status" && (!statusCobrancaValido(evento.status) || !evento.provedorId)) throw new Error("evento_invalido");
    return evento;
  },
};
