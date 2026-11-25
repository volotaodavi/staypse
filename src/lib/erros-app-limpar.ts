// Filtro LGPD das mensagens que vão para erros_app: sem e-mails, CPF/CNPJ, telefones nem tokens.
export function limparMensagemErro(texto: string): string {
  return texto
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[e-mail]")
    .replace(/\b[0-9a-f]{32,}\b/gi, "[token]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[cnpj]")
    .replace(/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "[telefone]")
    .replace(/Key \([^)]*\)=\([^)]*\)/g, "Key [dado]")
    .slice(0, 1000);
}
