// Painel do vendedor próprio da loja: os PRÓPRIOS links, cliques e o vínculo
// (comissão conforme contrato). Não mostra outros vendedores nem o faturamento
// da loja — o banco também não deixa (RLS e funções só devolvem o que é dele).
import Link from "next/link";
import { BotaoWhatsapp } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";

export const metadata = { title: "Painel do vendedor" };
export const instant = false;

type Vinculo = { loja_nome: string; loja_slug: string | null; comissao_percentual: number; forma_pagamento: string; status: string };
type Afiliacao = { id: string; status: string; items: { nome: string; slug: string } | null };
type Clique = { titulo: string; tipo: string; cliques_7d: number; cliques_30d: number };

const FORMA: Record<string, string> = {
  folha: "Paga pela loja (folha de pagamento)",
  split_direto: "Recebida direto no split automático",
};

export default async function PainelVendedor({ searchParams }: PageProps<"/painel/vendedor">) {
  const usuario = await exigirPapel("vendedor_proprio");
  const { vitrine: aviso } = await searchParams;
  const supabase = await criarClienteServidor();
  const site = urlDoSite();

  const [{ data: dadosVinculos }, { data: vitrine }, { data: afiliacoes }, { data: dadosCliques }] = await Promise.all([
    supabase.rpc("meus_vinculos_de_vendedor"),
    supabase.from("storefronts").select("slug, publicada").eq("revendedor_id", usuario.id).maybeSingle(),
    supabase
      .from("afiliacoes")
      .select("id, status, items(nome, slug)")
      .eq("afiliado_id", usuario.id)
      .eq("origem", "vendedor_proprio")
      .order("criado_em")
      .returns<Afiliacao[]>(),
    supabase.rpc("meus_cliques"),
  ]);
  const vinculos = (dadosVinculos ?? []) as Vinculo[];
  const cliques = (dadosCliques ?? []) as Clique[];
  const ativo = (vinculos ?? []).some((v) => v.status === "ativo");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-petroleo/70">Vendedor da loja</p>
        <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>
      </div>
      {aviso === "salva" && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          Vitrine salva e publicada.
        </p>
      )}

      {/* vínculo com a loja */}
      {(vinculos ?? []).map((v) => (
        <section key={v.loja_nome} className="rounded-3xl bg-petroleo p-6 text-gelo">
          <h2 className="text-xl text-branco">{v.loja_nome}</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gelo/70">Comissão</dt>
              <dd className="font-medium text-branco">{Number(v.comissao_percentual)}% (conforme contrato)</dd>
            </div>
            <div>
              <dt className="text-gelo/70">Como você recebe</dt>
              <dd className="font-medium text-branco">{FORMA[v.forma_pagamento]}</dd>
            </div>
            <div>
              <dt className="text-gelo/70">Situação</dt>
              <dd className="font-medium text-branco">{v.status === "ativo" ? "Ativo" : "Desativado pela loja"}</dd>
            </div>
          </dl>
          {v.status !== "ativo" && (
            <p className="mt-3 text-sm text-gelo/85">Seus links desta loja não registram novas indicações. O histórico continua guardado.</p>
          )}
        </section>
      ))}

      {/* @ e vitrine (opcional) */}
      {vitrine && (
        <section className="rounded-3xl bg-branco p-5">
          <h2 className="text-xl">Seu @: {vitrine.slug}</h2>
          <p className="mt-1 text-sm text-petroleo/75">
            {vitrine.publicada
              ? "Sua vitrine está no ar. Ela mostra os produtos que você indica."
              : "Você pode só usar os links abaixo ou montar uma vitrine com seus produtos."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {vitrine.publicada && (
              <Link href={`/@${vitrine.slug}`} className="rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco">
                Abrir vitrine
              </Link>
            )}
            <Link href="/painel/revendedor/vitrine" className="rounded-full border border-petroleo px-4 py-2 text-sm font-medium">
              {vitrine.publicada ? "Editar vitrine" : "Montar minha vitrine"}
            </Link>
          </div>
        </section>
      )}

      {/* links de cada produto */}
      <section className="rounded-3xl bg-branco p-5">
        <h2 className="text-xl">Seus links</h2>
        {!vitrine || !afiliacoes?.length ? (
          <p className="mt-2 text-petroleo/70">Nenhum produto aprovado na loja ainda.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-petroleo/10">
            {afiliacoes
              .filter((a) => a.items)
              .map((a) => {
                const link = `${site}/@${vitrine.slug}/${a.items!.slug}`;
                return (
                  <li key={a.id} className="flex flex-col gap-2 py-3">
                    <p className="font-medium">{a.items!.nome}</p>
                    <p className="break-all rounded-lg bg-gelo px-3 py-2 text-xs">{link}</p>
                    {ativo && (
                      <div className="flex flex-wrap gap-2">
                        <CopiarLink url={link} />
                        <BotaoWhatsapp
                          texto={`${a.items!.nome}\n${link}`}
                          rotulo="WhatsApp"
                          className="inline-flex items-center gap-2 rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {/* cliques (só os dele) */}
      <section className="rounded-3xl bg-branco p-5">
        <h2 className="text-xl">Cliques</h2>
        <p className="text-sm text-petroleo/70">Pessoas que abriram seus links. Repetições da mesma pessoa em 10 minutos contam uma vez.</p>
        {!cliques?.length ? (
          <p className="mt-3 text-petroleo/70">Nenhum clique ainda.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-petroleo/70">
                <th className="py-2 font-medium">Produto</th>
                <th className="py-2 text-right font-medium">7 dias</th>
                <th className="py-2 text-right font-medium">30 dias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-petroleo/10">
              {cliques.map((c, i) => (
                <tr key={`${c.titulo}-${i}`}>
                  <td className="py-2 pr-2">{c.titulo}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{c.cliques_7d}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{c.cliques_30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
