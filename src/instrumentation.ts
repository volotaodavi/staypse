// Monitoramento gratuito: todo erro do servidor (página, rota, ação) vira uma
// linha na tabela erros_app, vista pelo admin em /admin/erros.
// LGPD: nada de dados pessoais — o caminho vai SEM a parte "?..." (que pode ter
// o token do pedido) e a mensagem passa por um filtro de e-mails, CPFs e tokens.
import type { Instrumentation } from "next";

function limpar(texto: string): string {
  return texto
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[e-mail]")
    .replace(/\b[0-9a-f]{32,}\b/gi, "[token]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
    .slice(0, 1000);
}

export const onRequestError: Instrumentation.onRequestError = async (erro, request, contexto) => {
  // só no servidor Node (o cliente com a chave secreta não roda no Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SUPABASE_SECRET_KEY) return;
  try {
    const { criarClienteAdmin } = await import("@/lib/supabase/admin");
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const digest = typeof erro === "object" && erro !== null && "digest" in erro ? String(erro.digest) : null;
    await criarClienteAdmin()
      .from("erros_app")
      .insert({
        mensagem: limpar(mensagem || "(sem mensagem)"),
        digest: digest?.slice(0, 100) ?? null,
        caminho: request.path.split("?")[0].slice(0, 300),
        metodo: request.method.slice(0, 10),
        rota: contexto.routePath.slice(0, 200),
        tipo: contexto.routeType,
      });
  } catch {
    // o monitor nunca pode derrubar o site: se falhar, o erro original já está no log da Vercel
  }
};
