// Provedor Lytex. PROPOSITALMENTE vazio: só será implementado com a documentação
// oficial em docs/lytex/ (perguntas abertas em docs/lytex/PERGUNTAS.md).
// Regra do projeto: nunca inventar endpoint, campo ou formato. Sempre sandbox
// até autorização expressa para produção.
import "server-only";
import { IntegracaoPendente, type PaymentProvider } from "./tipos";

export const lytex: PaymentProvider = {
  nome: "lytex",
  // TODO(lytex): criar recebedor/subconta e devolver o link de onboarding (docs/lytex)
  async criarRecebedor() {
    throw new IntegracaoPendente("criarRecebedor");
  },
  // TODO(lytex): consultar status, motivo e documento do recebedor
  async consultarRecebedor() {
    throw new IntegracaoPendente("consultarRecebedor");
  },
  // TODO(lytex): cobrança com split (checkout hospedado ou tokenização — sem cartão no nosso servidor)
  async criarCobranca() {
    throw new IntegracaoPendente("criarCobranca");
  },
  async consultarCobranca() {
    throw new IntegracaoPendente("consultarCobranca");
  },
  // TODO(lytex): estorno total/parcial com desfazimento proporcional do split
  async estornar() {
    throw new IntegracaoPendente("estornar");
  },
  // TODO(lytex): validar assinatura do webhook (algoritmo/cabeçalho conforme a documentação)
  async validarWebhook() {
    throw new IntegracaoPendente("validarWebhook");
  },
};
