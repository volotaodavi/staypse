// Organizar a vitrine: destaques (até 4), coleções (até 6) e ordem dos produtos.
// Só entram produtos de afiliações aprovadas; o banco confere de novo ao salvar.
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirAlgumPapel } from "@/lib/papeis";
import type { ItemVitrine } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { lerOrganizacao, ordenarPorLista } from "@/lib/vitrine";
import { FormOrganizar } from "./FormOrganizar";

export const metadata = { title: "Organizar vitrine" };
export const instant = false;

export default async function PaginaOrganizar() {
  const usuario = await exigirAlgumPapel(["revendedor", "vendedor_proprio"]);
  const supabase = await criarClienteServidor();
  const { data: vitrine } = await supabase
    .from("storefronts")
    .select("slug, publicada, organizacao")
    .eq("revendedor_id", usuario.id)
    .maybeSingle();
  if (!vitrine?.publicada) redirect("/painel/revendedor/vitrine");

  // os mesmos itens que a vitrine pública mostra (aprovados e ativos)
  const { data } = await supabase.rpc("itens_da_vitrine", { p_slug: vitrine.slug });
  const itens = ((data ?? []) as ItemVitrine[]).map((i) => ({
    id: i.id,
    nome: i.nome,
    loja: i.produtor_nome,
    preco_centavos: i.preco_centavos,
  }));
  const org = lerOrganizacao(vitrine.organizacao);
  const ids = new Set(itens.map((i) => i.id));
  const voltar = usuario.papeis.includes("revendedor") ? "/painel/afiliado" : "/painel/vendedor";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link href={voltar} className="inline-flex min-h-11 items-center text-sm underline">
        ← Voltar ao painel
      </Link>
      <h1 className="text-3xl">Organizar vitrine</h1>
      <p className="text-petroleo/80">
        Fixe até 4 destaques no topo, crie até 6 coleções e escolha a ordem dos produtos. Ao tocar em um produto, quem
        visita continua indo para a loja que vende.
      </p>
      {itens.length === 0 ? (
        <p className="rounded-2xl bg-branco p-5">
          Você ainda não tem produtos aprovados na vitrine.{" "}
          <Link href="/painel/revendedor/catalogo" className="font-medium underline">
            Ver o catálogo
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-2xl bg-branco p-5">
          <FormOrganizar
            slug={vitrine.slug}
            itens={itens}
            inicial={{
              destaques: org.destaques.filter((id) => ids.has(id)),
              colecoes: org.colecoes.map((c) => ({ nome: c.nome, itens: c.itens.filter((id) => ids.has(id)) })),
              ordem: ordenarPorLista(itens, org.ordem).map((i) => i.id),
            }}
          />
        </div>
      )}
    </div>
  );
}
