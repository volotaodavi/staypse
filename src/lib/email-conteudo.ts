// Texto dos e-mails da lista de espera (sem envio: testável).
// Regras de copy: sem promessa de ganho, sem sorteio.

export type EmailMontado = { assunto: string; texto: string; html: string };

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "nome": só no primeiro envio; no reenvio não repetimos nome de ninguém.
export function emailDaLista({ nome, link, reenvio }: { nome?: string; link: string; reenvio: boolean }): EmailMontado {
  const primeiroNome = nome?.trim().split(/\s+/)[0];
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!";
  const intro = reenvio
    ? "Você pediu o link da sua posição na lista de espera da Staypse."
    : "Sua inscrição na lista de espera da Staypse está confirmada.";
  const corpo =
    "No link abaixo você vê a sua posição na fila e o seu link de indicação. " +
    "Quem indica mais pessoas entra antes no acesso antecipado. Não há sorteio nem prêmio em dinheiro.";
  const final = "Se não foi você, é só ignorar este e-mail.";

  return {
    assunto: reenvio ? "Seu link da lista de espera da Staypse" : "Você está na lista de espera da Staypse",
    texto: [saudacao, "", intro, corpo, "", link, "", final, "", "Staypse"].join("\n"),
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;color:#062C30;max-width:480px;line-height:1.5">` +
      `<p><strong>${escapar(saudacao)}</strong></p>` +
      `<p>${escapar(intro)}</p><p>${escapar(corpo)}</p>` +
      `<p><a href="${escapar(link)}" style="display:inline-block;background:#14D6C4;color:#062C30;` +
      `padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Ver minha posição</a></p>` +
      `<p style="font-size:13px">Ou copie este endereço: ${escapar(link)}</p>` +
      `<p style="font-size:13px">${escapar(final)}</p></div>`,
  };
}
