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
  meio: "pix" | "cartao" | "boleto";
  parcelas: number;
  split: ParteSplit[];
  descricao: string;
};

export type Cobranca = {
  provedorId: string;
  status: "pendente" | "paga" | "recusada" | "estornada" | "chargeback";
  urlPagamento?: string | null; // checkout do provedor (nenhum dado de cartão passa pela Staypse)
};

// evento de webhook já validado e traduzido para o formato da Staypse
export type EventoPagamento =
  | { id: string; tipo: "recebedor.status"; provedorId: string; status: StatusRecebedor; motivo?: string | null; documento?: string | null }
  | { id: string; tipo: "cobranca.status"; provedorId: string; pedidoId: string; status: Cobranca["status"] };

export interface PaymentProvider {
  readonly nome: "mock" | "lytex";
  criarRecebedor(dados: DadosRecebedor): Promise<RecebedorNoProvedor>;
  consultarRecebedor(provedorId: string): Promise<RecebedorNoProvedor>;
  criarCobranca(dados: DadosCobranca): Promise<Cobranca>;
  consultarCobranca(provedorId: string): Promise<Cobranca>;
  estornar(provedorId: string, valorCentavos?: number): Promise<Cobranca>; // sem valor = total
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
