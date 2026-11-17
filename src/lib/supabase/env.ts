// Lê as variáveis de ambiente do Supabase e avisa com clareza se faltarem.
// As chaves NUNCA ficam no código: vêm do arquivo .env.local (ver .env.example)
// ou das variáveis de ambiente da Vercel.

function exigir(valor: string | undefined, nome: string): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não configurada. Copie .env.example para .env.local e preencha.`,
    );
  }
  return valor;
}

// Obs.: o Next só consegue embutir variáveis NEXT_PUBLIC_ quando escritas
// por extenso (process.env.NOME), por isso uma função para cada uma.
export function supabaseUrl() {
  return exigir(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseChavePublica() {
  return exigir(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

// Endereço público do site, usado nos links enviados por e-mail, no link de
// indicação e nas prévias de compartilhamento. Ordem:
//  1. NEXT_PUBLIC_SITE_URL, se definido (o domínio próprio, quando houver);
//  2. na Vercel, o endereço de produção que ela fornece (ex.: staypse.vercel.app);
//  3. no computador, http://localhost:3000.
export function urlDoSite() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url =
    process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "") || "http://localhost:3000";
  return url.replace(/\/$/, "");
}
