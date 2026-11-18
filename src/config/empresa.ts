// =========================================================================
// DADOS DA EMPRESA — único lugar para trocar nome, CNPJ, endereço e contatos.
// Aparecem no rodapé de TODAS as páginas (regra de conformidade 3).
// Troque os textos entre colchetes pelos dados do cartão CNPJ.
// =========================================================================

export const EMPRESA = {
  // Como aparece no cartão CNPJ (MEI)
  nomeEmpresarial: "Staypse Plataforma Digital",
  cnpj: "54.623.584/0001-80",
  // Falta completar com rua, número e CEP do cartão CNPJ (o comércio
  // eletrônico exige o endereço completo do fornecedor no site).
  endereco: "Maricá, RJ",

  // Contatos
  email: "[e-mail]",
  whatsapp: "[WhatsApp]",

  // Canal de privacidade (LGPD): para onde vão os pedidos dos titulares
  // (acesso, correção, exclusão de dados). Por enquanto, o mesmo e-mail.
  emailPrivacidade: "[e-mail]",
} as const;

// =========================================================================
// VERSÃO DOS TERMOS — regra de conformidade 7.
// Sempre que mudar o texto dos Termos de Uso ou da Política de Privacidade,
// troque esta versão (use a data da mudança). Cada novo aceite fica gravado
// no banco com a versão vigente.
// =========================================================================
export const TERMOS_VERSAO = "2026-11-18";

// Versão do Contrato do Produtor (página /contrato-produtor). Ao mudar o texto,
// troque a versão: o produtor precisará aceitar de novo.
// (versão "2026-11-18.2": texto completo com vendedores da loja, taxa e LGPD)
export const CONTRATO_PRODUTOR_VERSAO = "2026-11-18.2";
