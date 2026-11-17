// "Sua loja": configurações do site da loja (/loja/[endereço]) — dados,
// logo e identidade visual com prévia ao vivo.
import Link from "next/link";
import { classesFontesLoja } from "@/lib/fontes-loja";
import { exigirPapel } from "@/lib/papeis";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { supabaseUrl, urlDoSite } from "@/lib/supabase/env";
import { FormLoja } from "./FormLoja";

export const metadata = { title: "Sua loja" };
export const instant = false;

export default async function PaginaLoja() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: produtor } = await supabase
    .from("producers")
    .select(
      "id, razao_social, status_verificacao, loja_slug, loja_nome, loja_descricao, loja_foto_path, loja_cor_principal, loja_cor_destaque, loja_fonte, loja_layout",
    )
    .eq("user_id", usuario.id)
    .maybeSingle();
  // produtos reais na prévia (até 4)
  const { data: itens } = produtor
    ? await supabase.from("items").select("nome, preco_centavos, fotos").eq("producer_id", produtor.id).order("criado_em").limit(4)
    : { data: [] };
  const base = supabaseUrl();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/painel/produtor" className="text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="text-3xl">Sua loja</h1>
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
            <Link href={`/loja/${produtor.loja_slug}`} className="self-start rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco">
              Ver loja pública
            </Link>
          )}
          <div className="rounded-3xl bg-branco p-5">
            <FormLoja
              inicial={produtor}
              nomeEmpresa={produtor.razao_social}
              uid={usuario.id}
              site={urlDoSite().replace(/^https?:\/\//, "")}
              logoUrl={produtor.loja_foto_path ? urlFoto(base, produtor.loja_foto_path) : null}
              classesFontes={classesFontesLoja}
              itens={(itens ?? []).map((i) => ({
                nome: i.nome,
                preco: formatarPreco(i.preco_centavos),
                foto: i.fotos?.[0] ? urlFoto(base, i.fotos[0]) : null,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
