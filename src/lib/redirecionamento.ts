// Depois do login, devolvemos a pessoa para a página que ela queria (?proximo=).
// Só aceitamos caminhos INTERNOS ("/painel"), nunca outro site
// ("//golpe.com", "https://golpe.com" ou truques como "/\t/golpe.com", que o
// navegador transforma em "//golpe.com"), para evitar redirecionamento malicioso.
const ORIGEM_FICTICIA = "http://staypse.interno";

export function proximoSeguro(proximo: unknown, padrao = "/painel"): string {
  if (typeof proximo !== "string" || proximo.length > 500) return padrao;
  // caracteres de controle (tab, quebra de linha...) e barra invertida: recusa
  if (/[\u0000-\u001f\u007f\\]/.test(proximo)) return padrao;
  if (!proximo.startsWith("/") || proximo.startsWith("//")) return padrao;
  try {
    const url = new URL(proximo, ORIGEM_FICTICIA);
    if (url.origin !== ORIGEM_FICTICIA) return padrao;
    return url.pathname + url.search + url.hash;
  } catch {
    return padrao;
  }
}
