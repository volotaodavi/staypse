// Convite para ser vendedor próprio de uma loja: /convite/[token]
// Quem abre o link vê a loja; entra (ou cria a conta) com o e-mail convidado
// e aceita. O token é secreto: no banco fica só o hash dele.
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { usuarioAtual } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";
import { FormAceite } from "./FormAceite";

export const metadata: Metadata = { title: "Convite de vendedor", robots: { index: false } };
export const instant = false;

export default async function Convite({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const usuario = await usuarioAtual();
  const supabase = await criarClienteServidor();
  const { data: convite } = /^[0-9a-f]{64}$/.test(token)
    ? await supabase.rpc("ver_convite", { p_token: token }).maybeSingle<{ loja_nome: string; email_mascarado: string; para_mim: boolean; status: string; expirado: boolean }>()
    : { data: null };
  const { data: vitrine } = usuario
    ? await supabase.from("storefronts").select("slug").eq("revendedor_id", usuario.id).maybeSingle()
    : { data: null };
  const voltar = encodeURIComponent(`/convite/${token}`);

  return (
    <>
      <Cabecalho logado={Boolean(usuario)} />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center bg-gelo px-4 py-12">
        <section className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-branco p-6 sm:p-8">
          {!convite || convite.status !== "convidado" ? (
            <>
              <h1 className="text-2xl">Convite indisponível</h1>
              <p className="text-petroleo/80">Este link não vale mais: já foi usado ou a loja gerou um novo. Peça outro à loja.</p>
            </>
          ) : convite.expirado ? (
            <>
              <h1 className="text-2xl">Convite expirado</h1>
              <p className="text-petroleo/80">Peça um novo link para a loja {convite.loja_nome}.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl">Vender pela loja {convite.loja_nome}</h1>
              <p className="text-petroleo/80">
                Você foi convidado(a) para ser vendedor(a) da loja, com link próprio para cada produto. A comissão segue o
                seu contrato com a loja.
              </p>
              <p className="text-sm text-petroleo/75">
                Você precisa ter 16 anos ou mais (de 16 a 17, com autorização dos responsáveis). Ao aceitar, a loja passa a ver seus links, cliques e
                vendas, conforme os{" "}
                <Link href="/termos" className="underline">
                  Termos
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="underline">
                  Política de Privacidade
                </Link>
                .
              </p>
              <p className="text-sm">
                Convite para: <strong className="font-medium">{convite.email_mascarado}</strong>
              </p>
              {!usuario ? (
                <div className="flex flex-col gap-2">
                  <Link href={`/entrar?proximo=${voltar}`} className="rounded-full bg-petroleo px-6 py-3 text-center font-medium text-branco">
                    Já tenho conta: entrar
                  </Link>
                  <Link href={`/cadastro?proximo=${voltar}`} className="rounded-full border border-petroleo px-6 py-3 text-center font-medium">
                    Criar conta com esse e-mail
                  </Link>
                </div>
              ) : !convite.para_mim ? (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                  Você entrou como {usuario.email}. Este convite é para outro e-mail: saia e entre com a conta certa.
                </p>
              ) : (
                <FormAceite token={token} arroba={vitrine?.slug ?? null} nome={usuario.nome} site={urlDoSite().replace(/^https?:\/\//, "")} />
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
