// LGPD art. 18 (acesso e portabilidade): baixa os dados da pessoa logada em JSON.
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function GET(request: NextRequest) {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.redirect(new URL("/entrar?proximo=/painel/meus-dados", request.url));
  const { data, error } = await supabase.rpc("meus_dados");
  if (error) return new NextResponse("Não foi possível gerar o arquivo agora. Tente de novo.", { status: 500 });
  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-staypse-${hoje}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
