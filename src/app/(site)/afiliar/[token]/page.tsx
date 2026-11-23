// Convite de afiliação por produto: /afiliar/[token]
// A loja manda este link para um afiliado específico. Quem abre vê o produto e,
// se tiver conta de afiliado com cadastro de recebimento aprovado, entra já
// aprovado. O código é secreto: no banco fica só o hash dele.
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { usuarioAtual } from "@/lib/papeis";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { estimativaComissao } from "@/lib/vitrine";
import { FormAceiteAfiliacao } from "./FormAceiteAfiliacao";

export const metadata: Metadata = { title: "Convite de afiliação", robots: { index: false } };
export const instant = false;

type Convite = { loja_nome: string; item_nome: string; preco_centavos: number; comissao_percentual: number; situacao: string };

const INDISPONIVEL: Record<string, string> = {
  revogado: "A loja cancelou este convite. Peça um novo link.",
  usado: "Este convite já foi usado. Peça um novo link à loja.",
  expirado: "Este convite expirou. Peça um novo link à loja.",
  indisponivel: "Este produto não está disponível no momento. Fale com a loja.",
};

export default async function ConviteAfiliacao({ params }: PageProps<"/afiliar/[token]">) {
  const { token } = await params;
  const usuario = await usuarioAtual();
  const supabase = await criarClienteServidor();
  const { data: convite } = /^[0-9a-f]{64}$/.test(token)
    ? await supabase.rpc("ver_convite_afiliacao", { p_token: token }).maybeSingle<Convite>()
    : { data: null };
  const voltar = encodeURIComponent(`/afiliar/${token}`);
  const pct = convite ? Number(convite.comissao_percentual) : 0;

  return (
    <>
      <Cabecalho logado={Boolean(usuario)} />
      <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center bg-gelo px-4 py-12">
        <section className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-branco p-6 sm:p-8">
          {!convite ? (
            <>
              <h1 className="text-2xl">Convite indisponível</h1>
              <p className="text-petroleo/80">Este link não existe ou foi trocado por outro. Peça um novo link à loja.</p>
            </>
          ) : convite.situacao !== "ativo" ? (
            <>
              <h1 className="text-2xl">Convite indisponível</h1>
              <p className="text-petroleo/80">{INDISPONIVEL[convite.situacao] ?? INDISPONIVEL.indisponivel}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl">Convite para divulgar {convite.item_nome}</h1>
              <p className="text-petroleo/80">
                A loja {convite.loja_nome} convidou você para ser afiliado(a) deste produto. Quem entra por este convite já
                fica aprovado, sem esperar a análise da loja.
              </p>
              <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-gelo p-4 text-sm">
                <div>
                  <dt className="text-petroleo/70">Preço</dt>
                  <dd className="text-lg font-semibold">{formatarPreco(convite.preco_centavos)}</dd>
                </div>
                <div>
                  <dt className="text-petroleo/70">Comissão</dt>
                  <dd className="text-lg font-semibold">
                    {formatarPreco(estimativaComissao(convite.preco_centavos, pct))} <span className="text-sm font-medium">({pct}%)</span>
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-petroleo/70">
                Estimativa por venda. A comissão é paga no split automático, só nas vendas feitas pelo seu link.
              </p>
              {!usuario ? (
                <div className="flex flex-col gap-2">
                  <Link href={`/entrar?proximo=${voltar}`} className="flex min-h-11 items-center justify-center rounded-full bg-petroleo px-6 py-3 text-center font-medium text-branco">
                    Já tenho conta: entrar
                  </Link>
                  <Link href={`/cadastro?proximo=${voltar}`} className="flex min-h-11 items-center justify-center rounded-full border border-petroleo px-6 py-3 text-center font-medium">
                    Criar conta de afiliado
                  </Link>
                </div>
              ) : !usuario.papeis.includes("revendedor") ? (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                  Você entrou como {usuario.email}, que não é uma conta de afiliado. Saia e entre (ou crie uma conta) como afiliado.
                </p>
              ) : (
                <FormAceiteAfiliacao token={token} />
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
