// =========================================================================
// DADOS DA EMPRESA — único lugar para trocar nome, CNPJ, endereço e contatos.
// Aparecem no rodapé de TODAS as páginas (regra de conformidade 3).
// Troque os textos entre colchetes pelos dados do cartão CNPJ.
// Enquanto um contato estiver entre colchetes, o site NÃO o mostra ao público:
// em vez disso, aponta para o canal /atendimento (use CONTATO, abaixo).
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

// Contatos prontos para mostrar ao público. Valor ainda entre colchetes
// (placeholder) vira null: quem exibe usa o /atendimento no lugar. Nunca
// mostre EMPRESA.email / EMPRESA.whatsapp direto nas páginas.
const preenchido = (v: string): string | null => (v.trim() && !/[[\]]/.test(v) ? v.trim() : null);
export const CONTATO = {
  email: preenchido(EMPRESA.email),
  whatsapp: preenchido(EMPRESA.whatsapp),
  emailPrivacidade: preenchido(EMPRESA.emailPrivacidade),
} as const;

// "e-mail x · WhatsApp y" só com o que existe; vazio se não houver nada.
export const contatoEmLinha = () =>
  [CONTATO.email, CONTATO.whatsapp && `WhatsApp ${CONTATO.whatsapp}`].filter(Boolean).join(" · ");

// =========================================================================
// VERSÃO DOS TERMOS — regra de conformidade 7.
// Sempre que mudar o texto dos Termos de Uso ou da Política de Privacidade,
// troque esta versão (use a data da mudança). Cada novo aceite fica gravado
// no banco com a versão vigente.
// =========================================================================
// (versão "2026-12-02.1": lista de espera com 4 perfis e e-mail de confirmação pelo
// Resend, listados na Política de Privacidade)
// (versão "2026-12-03.1": revisão jurídica — política de reembolso, avaliações, direitos
// de imagem e aviso de infração, registros de acesso, BrasilAPI, idade mínima na compra)
export const TERMOS_VERSAO = "2026-12-03.1";

// Versão do Contrato do Produtor (página /contrato-produtor). Ao mudar o texto,
// troque a versão: o produtor precisará aceitar de novo.
// (versão "2026-11-18.2": texto completo com vendedores da loja, taxa e LGPD)
export const CONTRATO_PRODUTOR_VERSAO = "2026-11-18.3";
