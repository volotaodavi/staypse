// Depois do login, devolvemos a pessoa para a página que ela queria (?proximo=).
// Só aceitamos caminhos INTERNOS ("/painel"), nunca outro site
// ("//golpe.com" ou "https://golpe.com"), para evitar redirecionamento malicioso.
export function proximoSeguro(proximo: unknown, padrao = "/painel"): string {
  if (typeof proximo !== "string") return padrao;
  if (!proximo.startsWith("/") || proximo.startsWith("//") || proximo.startsWith("/\\")) {
    return padrao;
  }
  return proximo;
}
