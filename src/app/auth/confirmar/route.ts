// Para onde apontam os links enviados por e-mail (confirmação de cadastro e
// link mágico). Troca o código do link por uma sessão e manda para o painel.
//
// Aceita os dois formatos que o Supabase pode usar:
//  - ?code=...                      (padrão: o link passa pelo Supabase antes)
//  - ?token_hash=...&type=email     (template de e-mail personalizado; funciona
//                                    mesmo se o link for aberto em outro navegador)
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { registrarAcesso } from "@/lib/acesso";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { proximoSeguro } from "@/lib/redirecionamento";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const proximo = proximoSeguro(params.get("proximo"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await criarClienteServidor();
  let erro = true;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    erro = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    erro = Boolean(error);
  }

  if (!erro) {
    const { data } = await supabase.auth.getUser();
    await registrarAcesso("link_email", data.user?.id);
  }
  const destino = erro ? "/entrar?erro=link" : proximo;
  return NextResponse.redirect(new URL(destino, request.nextUrl.origin));
}
