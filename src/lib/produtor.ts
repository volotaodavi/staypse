// Regras e rótulos da área do produtor, usados no navegador E no servidor.
// As regras de verdade estão no banco; aqui é para mostrar à pessoa, em
// português, o que falta ANTES de ela tentar enviar.

export const STATUS_PRODUTOR: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  suspenso: "Suspenso",
};

export const STATUS_ITEM: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  aprovado: "Aprovado (visível para revendedores)",
  recusado: "Recusado",
  pausado: "Pausado",
};

export const TIPOS_DIGITAIS = [
  { valor: "curso", rotulo: "Curso" },
  { valor: "ebook", rotulo: "E-book" },
  { valor: "mentoria", rotulo: "Mentoria" },
  { valor: "planilha", rotulo: "Planilha" },
  { valor: "servico_agendavel", rotulo: "Serviço agendável" },
] as const;

export const COMISSAO_MINIMA = 10;
export const COMISSAO_MAXIMA = 70;
export const MAX_FOTOS = 6;

// ---------- produtor ----------
export type DadosProdutor = {
  razao_social?: string | null;
  cnpj?: string | null;
  whatsapp?: string | null;
  email_contato?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  documento_path?: string | null;
  documento_responsavel_path?: string | null;
};

// O que falta no cadastro do produtor para enviar para análise.
export function pendenciasProdutor(p: DadosProdutor | null, contratoAceito: boolean): string[] {
  const falta: string[] = [];
  if (!p?.razao_social || !p?.cnpj) falta.push("Razão social e CNPJ");
  if (!p?.whatsapp || !p?.email_contato) falta.push("WhatsApp e e-mail de contato");
  if (!p?.cep || !p?.logradouro || !p?.numero || !p?.bairro || !p?.cidade || !p?.uf) falta.push("Endereço de envio");
  if (!p?.documento_path) falta.push("Contrato social ou cartão CNPJ");
  if (!p?.documento_responsavel_path) falta.push("Documento com foto do responsável");
  if (!contratoAceito) falta.push("Aceite do Contrato do Produtor");
  return falta;
}

// ---------- item ----------
export type DadosItem = {
  nome?: string | null;
  descricao?: string | null;
  fotos?: string[] | null;
  preco_centavos?: number | null;
  comissao_percentual?: number | null;
  categoria?: string | null;
  tipo?: string | null;
  estoque?: number | null;
  peso_gramas?: number | null;
  altura_cm?: number | null;
  largura_cm?: number | null;
  comprimento_cm?: number | null;
  prazo_postagem_dias?: number | null;
  tipo_digital?: string | null;
  arquivo_path?: string | null;
  link_acesso?: string | null;
  instrucoes_pos_compra?: string | null;
  declaracao_nf?: boolean | null;
};

const vazio = (v: unknown) => v === null || v === undefined || v === "";

// O que falta no item para enviar para análise.
export function pendenciasItem(i: DadosItem): string[] {
  const falta: string[] = [];
  if (vazio(i.nome)) falta.push("Nome");
  if (!i.descricao || i.descricao.trim().length < 10) falta.push("Descrição (pelo menos 10 caracteres)");
  if (!i.fotos?.length) falta.push("Pelo menos 1 foto");
  if (vazio(i.preco_centavos)) falta.push("Preço");
  const c = Number(i.comissao_percentual);
  if (vazio(i.comissao_percentual) || c < COMISSAO_MINIMA || c > COMISSAO_MAXIMA)
    falta.push(`Comissão entre ${COMISSAO_MINIMA}% e ${COMISSAO_MAXIMA}%`);
  if (vazio(i.categoria)) falta.push("Categoria");
  if (i.tipo === "fisico") {
    if (vazio(i.estoque)) falta.push("Estoque");
    if (vazio(i.peso_gramas) || vazio(i.altura_cm) || vazio(i.largura_cm) || vazio(i.comprimento_cm))
      falta.push("Peso e dimensões (para o frete)");
    if (vazio(i.prazo_postagem_dias)) falta.push("Prazo de postagem");
  }
  if (i.tipo === "digital") {
    if (vazio(i.tipo_digital)) falta.push("Tipo de produto digital");
    if (vazio(i.arquivo_path) && vazio(i.link_acesso)) falta.push("Arquivo ou link de acesso");
    if (!i.instrucoes_pos_compra || i.instrucoes_pos_compra.trim().length < 5) falta.push("Instruções enviadas após a compra");
  }
  if (!i.declaracao_nf) falta.push('Declaração "emito nota fiscal de todas as vendas"');
  return falta;
}

// ---------- formatos ----------
export function formatarPreco(centavos: number | null | undefined): string {
  if (centavos == null) return "—";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "89,90" / "R$ 1.299,00" / "89.9" → centavos (8990). null se inválido.
export function lerPreco(texto: string): number | null {
  let t = texto.replace(/[R$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const valor = Number(t);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor * 100);
}

export function formatarCnpj(cnpj: string | null | undefined): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? "";
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

// Endereço público das fotos (bucket público "fotos-itens").
export function urlFoto(supabaseUrl: string, caminho: string): string {
  return `${supabaseUrl}/storage/v1/object/public/fotos-itens/${caminho}`;
}
