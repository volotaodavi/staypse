// "Minha loja": configurações do site da loja (/loja/[endereço]), dados, modelo
// pronto, logo, cores, banner, seções e destaques, com prévia ao vivo.
import Link from "next/link";
import { classesFontesLoja } from "@/lib/fontes-loja";
import { exigirPapel } from "@/lib/papeis";
import type { ItemLoja } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";
import { FormLoja } from "./FormLoja";

export const metadata = { title: "Minha loja" };
export const instant = false;

export default async function PaginaLoja() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: produtor } = await supabase
    .from("producers")
    .select(
      "id, razao_social, status_verificacao, loja_slug, loja_nome, loja_descricao, loja_foto_path, loja_cor_principal, loja_cor_destaque, loja_fonte, loja_layout, loja_tema",
    )
    .eq("user_id", usuario.id)
    .maybeSingle();
  // produtos aprovados (os que a loja pública mostra): servem para destaques e prévia
  const { data: aprovados } = produtor
    ? await supabase
        .from("items")
        .select("id, slug, nome, preco_centavos, fotos, tipo, categoria")
        .eq("producer_id", produtor.id)
        .eq("status_aprovacao", "aprovado")
        .order("aprovado_em", { ascending: false })
        .limit(60)
    : { data: [] };
  // posição nos "mais vendidos" (só a ordem), quando a loja já está no ar
  const { data: ranking } =
    produtor?.loja_slug && produtor.status_verificacao === "aprovado"
      ? await supabase.rpc("itens_da_loja", { p_loja_slug: produtor.loja_slug })
      : { data: null };
  const posicoes = new Map<string, number | null>((ranking ?? []).map((r: ItemLoja) => [r.id, r.ordem_vendidos]));
  const itens: ItemLoja[] = (aprovados ?? []).map((i) => ({
    id: i.id,
    slug: i.slug,
    nome: i.nome,
    preco_centavos: i.preco_centavos,
    fotos: i.fotos ?? [],
    tipo: i.tipo,
    categoria: i.categoria,
    ordem_vendidos: posicoes.get(i.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/painel/produtor" className="inline-flex min-h-11 items-center self-start text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="text-3xl">Minha loja</h1>
      {!produtor ? (
        <p className="rounded-2xl bg-branco p-4">
          Cadastre sua empresa primeiro.{" "}
          <Link href="/painel/produtor/cadastro" className="underline">
            Ir para o cadastro
          </Link>
        </p>
      ) : (
        <>
          <p className="text-petroleo/80">
            Sua loja mostra só os itens aprovados. Os links dos afiliados levam para dentro dela.
            {produtor.status_verificacao !== "aprovado" && " Ela fica visível depois que sua empresa for aprovada."}
          </p>
          {produtor.loja_slug && produtor.status_verificacao === "aprovado" && (
            <Link href={`/loja/${produtor.loja_slug}`} className="inline-flex min-h-11 items-center self-start rounded-full bg-petroleo px-4 text-sm font-medium text-branco">
              Ver loja pública
            </Link>
          )}
          <div className="rounded-3xl bg-branco p-5">
            <FormLoja
              inicial={produtor}
              nomeEmpresa={produtor.razao_social}
              uid={usuario.id}
              site={urlDoSite().replace(/^https?:\/\//, "")}
              classesFontes={classesFontesLoja}
              itens={itens}
            />
          </div>
        </>
      )}
    </div>
  );
}
