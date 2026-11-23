// Notificações: rótulos dos tipos e envio dos e-mails importantes.
// O banco cria a notificação (gatilhos) e só MARCA "e-mail pendente" quando o tipo é
// importante e a pessoa não desligou; aqui o servidor envia (Resend) e marca como enviado.
// Sem RESEND_API_KEY/RESEND_FROM nada é enviado e nada quebra (a fila só espera).
import "server-only";
import { emailDaNotificacao } from "@/lib/email-conteudo";
import { emailAtivo, enviarEmail } from "@/lib/email";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/supabase/env";

// aviso com mais de 3 dias na fila já não vale mais um e-mail
const VALIDADE_FILA_MS = 3 * 24 * 60 * 60 * 1000;

// Envia os e-mails pendentes (no máximo 25 por chamada). Chamado depois de webhooks,
// da conciliação diária e da tela de notificações. Nunca lança erro: falha de e-mail não derruba nada.
export async function despacharEmailsNotificacoes(): Promise<{ enviados: number; falhas: number }> {
  const resumo = { enviados: 0, falhas: 0 };
  if (!emailAtivo()) return resumo;
  try {
    const admin = criarClienteAdmin();
    await admin
      .from("notificacoes")
      .update({ email_pendente: false })
      .eq("email_pendente", true)
      .lt("criado_em", new Date(Date.now() - VALIDADE_FILA_MS).toISOString());
    const { data: fila } = await admin
      .from("notificacoes")
      .select("id, user_id, titulo, texto, link")
      .eq("email_pendente", true)
      .order("criado_em")
      .limit(25);
    for (const n of fila ?? []) {
      // "reserva" o aviso antes de enviar: duas chamadas ao mesmo tempo não mandam o e-mail duas vezes
      const { data: reservado } = await admin
        .from("notificacoes")
        .update({ email_pendente: false })
        .eq("id", n.id)
        .eq("email_pendente", true)
        .select("id");
      if (!reservado?.length) continue;
      const { data: usuario } = await admin.auth.admin.getUserById(n.user_id);
      const para = usuario?.user?.email;
      if (!para) continue;
      const email = emailDaNotificacao({ titulo: n.titulo, texto: n.texto, link: n.link, siteUrl: urlDoSite() });
      const r = await enviarEmail({ para, ...email });
      if (r === "enviado") {
        resumo.enviados++;
        await admin.from("notificacoes").update({ email_enviado_em: new Date().toISOString() }).eq("id", n.id);
      } else {
        resumo.falhas++;
        // volta para a fila (tenta de novo na próxima rodada)
        await admin.from("notificacoes").update({ email_pendente: true }).eq("id", n.id);
      }
    }
  } catch (e) {
    console.error("Notificações: falha ao despachar e-mails", e instanceof Error ? e.name : "erro");
  }
  return resumo;
}
