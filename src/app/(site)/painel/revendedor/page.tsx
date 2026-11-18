// Painel do revendedor (afiliado): vitrine, afiliações com links prontos e cliques.
import Link from "next/link";
import { BotaoWhatsapp } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { urlDoSite } from "@/lib/supabase/env";
import { cancelarAfiliacao } from "./acoes";

export const metadata = { title: "Painel do revendedor" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

const STATUS: Record<string, { rotulo: string; cor: string }> = {
  aprovada: { rotulo: "Aprovada", cor: "bg-ciano text-petroleo" },
  pendente: { rotulo: "Aguardando o produtor", cor: "bg-gelo text-petroleo" },
  recusada: { rotulo: "Recusada", cor: "bg-red-50 text-red-800" },
};

type Afiliacao = {
  id: string;
  status: string;
  origem: string;
  items: { nome: string; slug: string } | null;
  loja_vendedores: { status: string } | null;
};

export default async function PainelRevendedor({ searchParams }: PageProps<"/painel/revendedor">) {
  const usuario = await exigirPapel("revendedor");
  const { vitrine: aviso } = await searchParams;
  const supabase = await criarClienteServidor();
  const site = urlDoSite();

  // RLS: cada um vê só a própria vitrine e as próprias afiliações
  const [{ data: vitrine }, { data: afiliacoes }, { data: cliques }] = await Promise.all([
    supabase.from("storefronts").select("slug, nome_exibicao, publicada").eq("revendedor_id", usuario.id).maybeSingle(),
    supabase
      .from("afiliacoes")
      .select("id, status, origem, items(nome, slug), loja_vendedores(status)")
      .eq("afiliado_id", usuario.id)
      .order("criado_em", { ascending: false })
      .returns<Afiliacao[]>(),
    supabase.rpc("meus_cliques"),
  ]);

  const urlVitrine = vitrine ? `${site}/@${vitrine.slug}` : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-petroleo/70">Revendedor</p>
        <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>
      </div>

      {aviso === "salva" && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          Vitrine salva e publicada.
        </p>
      )}

      {/* vitrine */}
      <section className="rounded-3xl bg-petroleo p-6 text-gelo">
        <h2 className="text-xl text-branco">Sua vitrine</h2>
        {vitrine ? (
          <>
            <p className="mt-1 text-gelo/80">{vitrine.nome_exibicao}</p>
            <p className="mt-3 break-all rounded-xl bg-branco/10 px-3 py-2 text-sm">{urlVitrine}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/@${vitrine.slug}`} className="rounded-full bg-ciano px-4 py-2 text-sm font-medium text-petroleo">
                Abrir vitrine
              </Link>
              <CopiarLink url={urlVitrine} className="rounded-full bg-branco px-4 py-2 text-sm font-medium text-petroleo" />
              <BotaoWhatsapp
                texto={`Olha a minha vitrine na Staypse: ${vitrine.nome_exibicao}\n${urlVitrine}`}
                rotulo="WhatsApp"
                className="inline-flex items-center gap-2 rounded-full bg-branco px-4 py-2 text-sm font-medium text-petroleo"
              />
              <Link href="/painel/revendedor/vitrine" className="rounded-full border border-gelo/40 px-4 py-2 text-sm font-medium">
                Editar
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-gelo/85">
              Escolha o nome, o nicho e o visual da sua vitrine. Você ganha apenas sobre as suas próprias vendas — sem taxa
              de adesão.
            </p>
            <Link href="/painel/revendedor/vitrine" className="mt-4 inline-block rounded-full bg-ciano px-5 py-3 font-medium text-petroleo">
              Criar minha vitrine
            </Link>
          </>
        )}
      </section>

      {vitrine && (
        <nav className="grid grid-cols-2 gap-3" aria-label="Atalhos">
          <Link href="/painel/revendedor/catalogo" className="rounded-3xl bg-branco p-5 hover:ring-2 hover:ring-petroleo/20">
            <span className="block text-lg font-extrabold">Catálogo</span>
            <span className="text-sm text-petroleo/75">Escolha produtos para indicar</span>
          </Link>
          <Link href="/painel/revendedor/links" className="rounded-3xl bg-branco p-5 hover:ring-2 hover:ring-petroleo/20">
            <span className="block text-lg font-extrabold">Minhas indicações</span>
            <span className="text-sm text-petroleo/75">Links da Shopee, Mercado Livre e TikTok Shop</span>
          </Link>
        </nav>
      )}

      {/* afiliações */}
      {vitrine && (
        <section className="rounded-3xl bg-branco p-5">
          <h2 className="text-xl">Minhas afiliações</h2>
          {!afiliacoes?.length ? (
            <p className="mt-2 text-petroleo/70">
              Nenhuma ainda.{" "}
              <Link href="/painel/revendedor/catalogo" className="underline">
                Ver o catálogo
              </Link>
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-petroleo/10">
              {afiliacoes.map((a) => {
                // link curto: /@afiliado/produto (a compra acontece no site da loja)
                const link = a.items && vitrine ? `${site}/@${vitrine.slug}/${a.items.slug}` : "";
                const status = STATUS[a.status];
                return (
                  <li key={a.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{a.items?.nome ?? "Item indisponível no momento"}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cor}`}>{status.rotulo}</span>
                    </div>
                    {a.status === "aprovada" && a.items && a.origem !== "catalogo" && a.loja_vendedores?.status !== "ativo" && (
                      <p className="text-sm text-petroleo/75">A loja desativou seu vínculo de vendedor: este link não registra novas indicações.</p>
                    )}
                    {a.status === "aprovada" && a.items && (a.origem === "catalogo" || a.loja_vendedores?.status === "ativo") && (
                      <>
                        <p className="break-all rounded-lg bg-gelo px-3 py-2 text-xs">{link}</p>
                        <div className="flex flex-wrap gap-2">
                          <CopiarLink url={link} />
                          <BotaoWhatsapp
                            texto={`${a.items.nome}\n${link}`}
                            rotulo="WhatsApp"
                            className="inline-flex items-center gap-2 rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco"
                          />
                        </div>
                      </>
                    )}
                    {a.origem === "catalogo" ? (
                      <form action={cancelarAfiliacao}>
                        <input type="hidden" name="afiliacao_id" value={a.id} />
                        <button className="min-h-11 py-2 text-sm text-petroleo/75 underline">
                          {a.status === "pendente" ? "Cancelar pedido" : "Sair da afiliação"}
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-petroleo/70">Vendedor da loja (comissão conforme contrato)</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* cliques */}
      {vitrine && (
        <section className="rounded-3xl bg-branco p-5">
          <h2 className="text-xl">Cliques</h2>
          <p className="text-sm text-petroleo/70">Pessoas que abriram seus produtos. Repetições da mesma pessoa em 10 minutos contam uma vez.</p>
          {!cliques?.length ? (
            <p className="mt-3 text-petroleo/70">Nenhum clique ainda. Compartilhe sua vitrine!</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-petroleo/70">
                  <th scope="col" className="py-2 font-medium">Item</th>
                  <th scope="col" className="whitespace-nowrap py-2 pl-3 text-right font-medium">7 dias</th>
                  <th scope="col" className="whitespace-nowrap py-2 pl-3 text-right font-medium">30 dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-petroleo/10">
                {(cliques as { titulo: string; tipo: string; cliques_7d: number; cliques_30d: number }[]).map((c, i) => (
                  <tr key={`${c.titulo}-${i}`}>
                    <td className="py-2 pr-2">
                      {c.titulo}
                      {c.tipo === "externo" && <span className="ml-1 text-xs text-petroleo/75">(indicação externa)</span>}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">{c.cliques_7d}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{c.cliques_30d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
