// "Minhas indicações": links de outras lojas (Shopee, Mercado Livre, TikTok Shop)
// que aparecem na vitrine marcados como publicidade. A Staypse não ganha nada
// com eles e nunca altera o endereço.
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { PLATAFORMAS } from "@/lib/vitrine";
import { removerLink } from "../acoes";
import { FormLink } from "./FormLink";

export const metadata = { title: "Minhas indicações" };
export const instant = false;

export default async function Links() {
  const usuario = await exigirPapel("revendedor");
  const supabase = await criarClienteServidor();
  const { data: vitrine } = await supabase.from("storefronts").select("id").eq("revendedor_id", usuario.id).maybeSingle();
  if (!vitrine) redirect("/painel/revendedor/vitrine");
  const { data: links } = await supabase
    .from("external_links")
    .select("id, url, titulo, preco_centavos, plataforma")
    .eq("storefront_id", vitrine.id)
    .order("ordem")
    .order("criado_em");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Link href="/painel/afiliado" className="inline-block py-2 text-sm underline">
        ← Voltar ao painel
      </Link>
      <h1 className="text-3xl">Minhas indicações</h1>
      <p className="text-petroleo/80">
        Links de produtos de outras lojas. Na sua vitrine eles aparecem com o aviso “Publicidade · a compra acontece em
        outro site”.
      </p>

      <section className="rounded-2xl bg-branco p-5">
        <h2 className="mb-3 text-xl">Adicionar link</h2>
        <FormLink />
      </section>

      <section>
        <h2 className="text-xl">Seus links ({links?.length ?? 0})</h2>
        {!links?.length ? (
          <p className="mt-2 text-petroleo/70">Nenhum link ainda.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-branco p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.titulo}</p>
                  <p className="truncate text-xs text-petroleo/70">
                    {PLATAFORMAS[l.plataforma]}
                    {l.preco_centavos ? `, ${formatarPreco(l.preco_centavos)}` : ""}, {l.url}
                  </p>
                </div>
                <form action={removerLink}>
                  <input type="hidden" name="link_id" value={l.id} />
                  <button className="rounded-full px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50">Remover</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
