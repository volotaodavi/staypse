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
  // o endereço do atendimento sai do mesmo site do link (nunca fixo no código)
  const atendimento = `${new URL(link).origin}/atendimento?assunto=lgpd_exclusao`;
  const final = `Se não foi você, é só ignorar este e-mail. Para sair da lista e parar de receber avisos, peça a exclusão dos seus dados em ${atendimento}`;

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

// E-mail de uma notificação importante (venda nova, recebedor recusado/suspenso,
// comissão estornada). O texto vem do banco e já não leva dado pessoal do comprador.
// "link" é caminho interno (começa com "/"); vira endereço completo com o site.
export function emailDaNotificacao({ titulo, texto, link, siteUrl }: { titulo: string; texto: string; link: string | null; siteUrl: string }): EmailMontado {
  const interno = link && /^\/($|[^/\\])/.test(link) ? `${siteUrl}${link}` : null;
  const ajustes = `${siteUrl}/painel/configuracoes`;
  const final = `Você pode escolher quais e-mails receber em ${ajustes}`;
  return {
    assunto: `Staypse: ${titulo}`,
    texto: [titulo, "", texto, ...(interno ? ["", `Ver no painel: ${interno}`] : []), "", final, "", "Staypse"].join("\n"),
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;color:#062C30;max-width:480px;line-height:1.5">` +
      `<p><strong>${escapar(titulo)}</strong></p><p>${escapar(texto)}</p>` +
      (interno
        ? `<p><a href="${escapar(interno)}" style="display:inline-block;background:#14D6C4;color:#062C30;` +
          `padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Ver no painel</a></p>`
        : "") +
      `<p style="font-size:13px">${escapar(final)}</p></div>`,
  };
}
