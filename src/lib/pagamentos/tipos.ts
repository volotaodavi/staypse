// Contrato que todo provedor de pagamento cumpre (simulador ou Lytex).
// A Staypse não recebe dinheiro: o provedor cria a cobrança JÁ com o split e
// paga cada recebedor direto. Aqui só trafegam ids, status e valores.

export type StatusRecebedor = "nao_iniciado" | "em_analise" | "aprovado" | "recusado" | "suspenso";
export type PapelRecebedor = "produtor" | "afiliado" | "vendedor";

export type DadosRecebedor = {
  userId: string;
  papel: PapelRecebedor;
  documento: string; // CPF ou CNPJ, igual ao do cadastro na Staypse
  nome: string;
  email: string;
};

export type RecebedorNoProvedor = {
  provedorId: string;
  status: StatusRecebedor;
  motivo?: string | null;
  documento?: string | null; // CPF/CNPJ que o provedor confirmou (para conferir com o cadastro)
  urlOnboarding?: string | null; // onde a pessoa completa o cadastro (se o provedor tiver página própria)
};

export type ParteSplit = { recebedorProvedorId: string; valorCentavos: number };

export type DadosCobranca = {
  pedidoId: string;
  totalCentavos: number;
  // quando omitidos, quem paga escolhe o meio (e as parcelas) na página do provedor
  meio?: "pix" | "cartao" | "boleto";
  parcelas?: number;
  // quem paga (a fatura da Lytex exige o cliente: InvoicesController_createInvoice_v2, campo client)
  comprador?: { nome: string; documento: string; email?: string };
  split: ParteSplit[];
  descricao: string;
  // para onde a página do provedor devolve o comprador (o link do pedido)
  urlRetorno: string;
};

// Status da cobrança, no vocabulário da Staypse (cada provedor traduz o seu para estes):
//  pendente → aguardando pagamento · paga · recusada · expirada · estornada (reembolso confirmado)
//  estorno_pendente → estorno pedido, o provedor ainda não confirmou · chargeback → contestação do titular do cartão
export type StatusCobranca = "pendente" | "paga" | "recusada" | "expirada" | "estornada" | "estorno_pendente" | "chargeback";

// O que o comprador precisa para pagar Pix ou boleto na página do pedido (campos da fatura Lytex:
// paymentMethods.pix.qrcode, paymentMethods.boleto.digitableLine e linkBoleto). Nada de cartão aqui.
export type DadosPagamento = {
  pixCopiaECola?: string | null;
  boletoLinhaDigitavel?: string | null;
  boletoUrl?: string | null;
  venceEm?: string | null; // data AAAA-MM-DD
};

export type Cobranca = {
  provedorId: string;
  status: StatusCobranca;
  urlPagamento?: string | null; // checkout do provedor (nenhum dado de cartão passa pela Staypse)
  pagamento?: DadosPagamento | null; // Pix/boleto já gerados (só quando o meio foi escolhido antes)
  // O que o provedor diz que a cobrança vale/recebeu (centavos) e a moeda. Conferidos ANTES de confirmar o pagamento
  // (cobrancas.ts): valor diferente do esperado ou moeda fora de BRL nunca confirma o pedido.
  valorCentavos?: number | null;
  moeda?: string | null;
};

// evento de webhook já validado e traduzido para o formato da Staypse
export type EventoPagamento =
  | { id: string; tipo: "recebedor.status"; provedorId: string; status: StatusRecebedor; motivo?: string | null; documento?: string | null }
  | { id: string; tipo: "cobranca.status"; provedorId: string; pedidoId: string; status: StatusCobranca };

export interface PaymentProvider {
  readonly nome: "mock" | "lytex";
  criarRecebedor(dados: DadosRecebedor): Promise<RecebedorNoProvedor>;
  consultarRecebedor(provedorId: string): Promise<RecebedorNoProvedor>;
  criarCobranca(dados: DadosCobranca): Promise<Cobranca>;
  consultarCobranca(provedorId: string): Promise<Cobranca>;
  estornar(provedorId: string, valorCentavos?: number): Promise<Cobranca>; // sem valor = total
  // cancela a cobrança ainda não paga (pedido cancelado ou expirado): depois disso o comprador não consegue mais pagá-la
  cancelarCobranca(provedorId: string): Promise<Cobranca>;
  // confere a assinatura e traduz o corpo; lança erro se a origem não for o provedor
  validarWebhook(corpo: string, cabecalhos: Headers): Promise<EventoPagamento>;
}

// erro claro para o que depende da documentação oficial da Lytex
export class IntegracaoPendente extends Error {
  constructor(metodo: string) {
    super(
      `Lytex: "${metodo}" ainda não implementado. Aguardando a documentação oficial em docs/lytex/ ` +
        "(nenhum endpoint, campo ou formato é inventado). Use PAYMENTS_PROVIDER=mock para testar.",
    );
    this.name = "IntegracaoPendente";
  }
}
