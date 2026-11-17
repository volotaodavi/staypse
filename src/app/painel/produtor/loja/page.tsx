// "Sua loja": página pública /loja/[endereço] com os itens aprovados do produtor.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";
import { FormLoja } from "./FormLoja";

export const metadata = { title: "Sua loja" };
export const instant = false;

export default async function PaginaLoja() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: produtor } = await supabase
    .from("producers")
    .select("razao_social, status_verificacao, loja_slug, loja_nome, loja_descricao, loja_foto_path")
    .eq("user_id", usuario.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
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
            Sua loja mostra só os itens aprovados.
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
            />
          </div>
        </>
      )}
    </div>
  );
}
