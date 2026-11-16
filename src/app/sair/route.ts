// Sair da conta. Só por POST (botão "Sair"), para que um link qualquer
// não consiga deslogar a pessoa.
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  // 303 = depois de um POST, abrir a página inicial com GET
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
