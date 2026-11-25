// Consulta o CNPJ na BrasilAPI (dados públicos da Receita) para pré-preencher o formulário.
// Só para quem está logado; cache curto; se a BrasilAPI falhar, devolve 204 e o formulário segue manual.
import { mapearCnpj } from "@/lib/cnpj-brasilapi";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function GET(_: Request, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params;
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14) return new Response(null, { status: 400 });
  const { data } = await (await criarClienteServidor()).auth.getUser();
  if (!data.user) return new Response(null, { status: 401 });
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${n}`, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    if (!r.ok) return new Response(null, { status: 204 });
    return Response.json(mapearCnpj(await r.json()), { headers: { "cache-control": "private, max-age=600" } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
