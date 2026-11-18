// Regras e textos comuns de pedidos (checkout, painel da loja, comprador, admin).
// O cálculo de preço, frete e comissão é SEMPRE do banco (cotar_pedido /
// criar_pedido); aqui ficam só rótulos, formatos e o interruptor de compras.

// Compras só abrem quando a Etapa 6 (pagamento pela Lytex) estiver pronta.
// Variável de ambiente COMPRAS_ABERTAS=1 liga o checkout (no computador e nos testes).
export function comprasAbertas(): boolean {
  return process.env.COMPRAS_ABERTAS === "1";
}

// Pagamento simulado: SÓ para testes locais (nunca ligar na Vercel).
// Substitui o aviso da Lytex até a Etapa 6.
export function pagamentoSimulado(): boolean {
  return process.env.PAGAMENTO_SIMULADO === "1" && process.env.VERCEL !== "1";
}

export type ModoEntrega = "envio" | "retirada" | "digital";

export const ROTULO_ENTREGA: Record<ModoEntrega, string> = {
  envio: "Entrega pelo correio ou transportadora",
  retirada: "Retirada no local (combinada com a loja)",
  digital: "Acesso digital liberado após o pagamento",
};

export const STATUS_PEDIDO: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  em_reembolso: "Desistência em andamento (reembolso)",
  reembolsado: "Reembolsado",
};

export const STATUS_ENTREGA: Record<string, string> = {
  aguardando: "Aguardando envio",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  devolvido: "Devolvido",
};

export const ASSUNTOS_ATENDIMENTO: Record<string, string> = {
  pedido: "Dúvida ou problema com um pedido",
  arrependimento: "Desistência da compra (arrependimento)",
  lgpd_acesso: "Meus dados pessoais: saber quais dados vocês têm",
  lgpd_correcao: "Meus dados pessoais: corrigir dados",
  lgpd_exclusao: "Meus dados pessoais: excluir dados ou conta",
  lgpd_outros: "Meus dados pessoais: outro pedido (LGPD)",
  denuncia: "Denunciar produto, loja ou vitrine",
  outro: "Outro assunto",
};

// Erros do banco (raise exception) → mensagem para a pessoa
export const ERROS_PEDIDO: Record<string, string> = {
  quantidade_invalida: "Escolha uma quantidade entre 1 e 99.",
  item_indisponivel: "Este produto não está disponível agora.",
  sem_estoque: "Não há estoque suficiente para essa quantidade.",
  entrega_invalida: "Escolha uma forma de entrega disponível para este produto.",
  frete_nao_configurado: "A loja ainda não configurou o frete. Escolha retirada no local ou fale com a loja.",
  nome_invalido: "Informe seu nome completo.",
  email_invalido: "Informe um e-mail válido.",
  cpf_invalido: "CPF inválido. Confira os números.",
  telefone_invalido: "Telefone inválido. Use DDD + número.",
  endereco_invalido: "Endereço incompleto. Confira CEP, rua, número, bairro, cidade e UF.",
  pedido_indisponivel: "Não encontramos este pedido. Use o link que você recebeu.",
  prazo_encerrado: "O prazo de 7 dias para desistir terminou. Se o produto tem defeito, abra um atendimento.",
  nada_enviado: "A loja ainda não registrou o envio deste pedido.",
};

export function mensagemDeErro(erro: { message?: string } | null | undefined, padrao: string): string {
  const chave = Object.keys(ERROS_PEDIDO).find((k) => erro?.message?.includes(k));
  return chave ? ERROS_PEDIDO[chave] : padrao;
}

// "52998224725" → "529.982.247-25"
export function formatarCpf(cpf: string | null | undefined): string {
  if (!cpf || cpf.length !== 11) return cpf ?? "";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

// "24900000" → "24900-000"
export function formatarCep(cep: string | null | undefined): string {
  if (!cep || cep.length !== 8) return cep ?? "";
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export function data(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export function enderecoEmLinha(e: Endereco | null | undefined): string {
  if (!e) return "";
  return [
    `${e.logradouro}, ${e.numero}${e.complemento ? ` — ${e.complemento}` : ""}`,
    e.bairro,
    `${e.cidade}/${e.uf}`,
    `CEP ${formatarCep(e.cep)}`,
  ].join(" · ");
}

// Pedido como o comprador vê (função pedido_do_comprador)
export type PedidoComprador = {
  id: string;
  codigo: string;
  status: string;
  criado_em: string;
  pago_em: string | null;
  entregue_em: string | null;
  arrependimento_ate: string | null;
  arrependimento_solicitado_em: string | null;
  cancelado_em: string | null;
  reembolsado_em: string | null;
  comprador_nome: string;
  comprador_email: string;
  entrega_modo: ModoEntrega;
  prazo_entrega_dias: number | null;
  endereco: Endereco | null;
  subtotal_centavos: number;
  frete_centavos: number;
  total_centavos: number;
  indicado: boolean;
  loja: { slug: string; nome: string; razao_social: string; cnpj: string; email: string | null; whatsapp: string | null };
  pode_desistir: boolean;
  pode_confirmar_recebimento: boolean;
  itens: {
    id: string;
    nome: string;
    tipo: string;
    quantidade: number;
    preco_unitario_centavos: number;
    status_entrega: string;
    codigo_rastreio: string | null;
    nota_fiscal_numero: string | null;
    nota_fiscal_chave: string | null;
    nota_fiscal_url: string | null;
    acesso: { link: string | null; instrucoes: string | null; arquivo_path: string | null } | null;
  }[];
};
