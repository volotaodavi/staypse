// Simulador de pagamentos (PAYMENTS_PROVIDER=mock). Imita o que esperamos da
// Lytex — recebedor em análise → aprovado/recusado, cobrança paga/recusada,
// estorno e atraso de webhook — para testar o sistema inteiro sem dinheiro real.
// Os webhooks do simulador são ASSINADOS (HMAC), como os de verdade serão.
import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { segredoDerivado } from "@/lib/ip";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { EventoPagamento, PaymentProvider, RecebedorNoProvedor, StatusRecebedor } from "./tipos";

export const CABECALHO_ASSINATURA = "x-staypse-mock-assinatura";
const segredo = () => segredoDerivado("staypse:pagamentos-mock:v1");

export function assinarMock(corpo: string): string {
  return createHmac("sha256", segredo()).update(corpo).digest("hex");
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
    return { provedorId: `mock_cob_${randomUUID()}`, status: "pendente", urlPagamento: null };
  },
  async consultarCobranca(provedorId) {
    return { provedorId, status: "pendente" };
  },
  async estornar(provedorId) {
    return { provedorId, status: "estornada" };
  },
  async validarWebhook(corpo, cabecalhos): Promise<EventoPagamento> {
    const recebida = Buffer.from(cabecalhos.get(CABECALHO_ASSINATURA) ?? "");
    const esperada = Buffer.from(assinarMock(corpo));
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) throw new Error("assinatura_invalida");
    const evento = JSON.parse(corpo) as EventoPagamento;
    if (!evento?.id || !evento?.tipo) throw new Error("evento_invalido");
    return evento;
  },
};
