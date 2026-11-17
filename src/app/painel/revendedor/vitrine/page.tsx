// Criar (onboarding em 3 passos) ou editar a vitrine do revendedor.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";
import { FormVitrine } from "./FormVitrine";

export const metadata = { title: "Sua vitrine" };
export const instant = false;

export default async function PaginaVitrine() {
  const usuario = await exigirPapel("revendedor");
  const supabase = await criarClienteServidor();
  const { data: vitrine } = await supabase
    .from("storefronts")
    .select("slug, nome_exibicao, nicho, modelo_visual, bio")
    .eq("revendedor_id", usuario.id)
    .maybeSingle();
  // mostra o endereço sem "https://" (fica mais curto no celular)
  const site = urlDoSite().replace(/^https?:\/\//, "");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link href="/painel/revendedor" className="text-sm underline">
        ← Voltar ao painel
      </Link>
      <h1 className="text-3xl">{vitrine ? "Editar vitrine" : "Crie sua vitrine"}</h1>
      {!vitrine && (
        <p className="text-petroleo/80">
          Três passos rápidos. Você pode mudar tudo depois. Não há taxa de adesão: você ganha apenas sobre as suas
          próprias vendas.
        </p>
      )}
      <div className="rounded-3xl bg-branco p-5">
        <FormVitrine
          site={site}
          inicial={
            vitrine
              ? {
                  slug: vitrine.slug,
                  nome_exibicao: vitrine.nome_exibicao ?? "",
                  nicho: vitrine.nicho ?? "",
                  modelo_visual: vitrine.modelo_visual,
                  bio: vitrine.bio ?? "",
                }
              : null
          }
        />
      </div>
    </div>
  );
}
