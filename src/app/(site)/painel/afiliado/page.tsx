// Painel do afiliado: cards do período, cliques × vendas por dia, produtos
// afiliados (com link curto), minhas vendas, vitrine e catálogo.
import Link from "next/link";
import { FiltroPeriodo } from "@/components/painel/FiltroPeriodo";
import { GraficoBarras } from "@/components/painel/GraficoBarras";
import { CodigoIndicacao } from "@/components/painel/CodigoIndicacao";
import { NotaPagamentos, Numeros, inteiro, percentual } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { TabelaVendas } from "@/components/painel/TabelaVendas";
import { meuRecebedor, recebedorOk } from "@/components/painel/Recebimento";
import { ROTULO_STATUS_RECEBEDOR } from "@/lib/pagamentos/recebedores";
import { BotaoWhatsapp } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { exigirPapel } from "@/lib/papeis";
import { diaCurto, formatarDia, lerPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { urlDoSite } from "@/lib/supabase/env";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { cancelarAfiliacao } from "../revendedor/acoes";
import { lerComissoes, lerIndicadores } from "./consulta";

export const metadata = { title: "Painel do afiliado" };
export const instant = false;

type Produto = {
  afiliacao_id: string;
  item_id: string;
  nome: string;
  produto_slug: string;
  loja: string;
  loja_slug: string | null;
  preco_centavos: number;
  comissao_percentual: number;
  status: string;
  cliques: number;
  vendas: number;
  vitrine_slug: string;
};

const STATUS_AFILIACAO: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada", bloqueada: "Bloqueada pela loja" };

export default async function PainelAfiliado({ searchParams }: PageProps<"/painel/afiliado">) {
  const usuario = await exigirPapel("revendedor");
  const periodo = lerPeriodo(await searchParams);
  const supabase = await criarClienteServidor();
  const [{ data: vitrine }, ind, vendas, { data: produtosBrutos }, recebedor] = await Promise.all([
    supabase.from("storefronts").select("slug, nome_exibicao, publicada").eq("revendedor_id", usuario.id).maybeSingle(),
    lerIndicadores("afiliado", periodo),
    lerComissoes("afiliado", periodo),
    supabase.rpc("meus_produtos_afiliado", { p_inicio: periodo.inicio, p_fim: periodo.fim }),
    meuRecebedor("afiliado"),
  ]);
  const produtos = (produtosBrutos ?? []) as Produto[];
  const site = urlDoSite();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-petroleo/75">Afiliado</p>
          <h1 className="text-3xl">Resumo</h1>
        </div>
        <Link href="/painel/revendedor/catalogo" className="inline-flex min-h-11 items-center rounded-full bg-ciano px-5 text-sm font-medium text-petroleo">
          Encontrar produtos
        </Link>
      </div>

      {!recebedorOk(recebedor) && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-pendencia-recebedor>
          Cadastro de recebimento: {ROTULO_STATUS_RECEBEDOR[recebedor?.status_recebedor ?? "nao_iniciado"]}
          {recebedor?.motivo ? `, ${recebedor.motivo}` : ""}. Você pode ver o catálogo, mas só se afilia e recebe comissões com
          ele aprovado na Lytex.{" "}
          <Link href="/painel/afiliado/recebimentos" className="font-medium underline">
            Completar cadastro de recebimento
          </Link>
        </p>
      )}
      {!vitrine ? (
        <section className="flex flex-col items-start gap-3 rounded-2xl bg-branco p-5">
          <p>Para indicar produtos, crie sua vitrine: nome, @, nicho e visual. Sem taxa de adesão.</p>
          <Link href="/painel/revendedor/vitrine" className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-5 font-medium text-branco">
            Criar minha vitrine
          </Link>
        </section>
      ) : (
        <>
          <FiltroPeriodo periodo={periodo} caminho="/painel/afiliado" />
          <Numeros
            itens={[
              { rotulo: "Vendas", valor: inteiro(ind.vendas), destaque: true },
              { rotulo: "Comissões pendentes", valor: formatarPreco(ind.a_receber_centavos), nota: "Liberadas após o prazo de 7 dias" },
              { rotulo: "Repassado pelo split", valor: formatarPreco(ind.repassada_centavos) },
              { rotulo: "Cliques nos seus links", valor: inteiro(ind.cliques) },
              { rotulo: "Conversão", valor: percentual(ind.vendas, ind.cliques), nota: "Vendas ÷ cliques" },
              ...(ind.estornada_centavos > 0 ? [{ rotulo: "Estornado (desistências)", valor: formatarPreco(ind.estornada_centavos) }] : []),
            ]}
          />
          <NotaPagamentos />

          {/* cliques e vendas têm escalas diferentes: dois gráficos lado a lado, mesmo eixo de dias */}
          <div className="grid gap-3 md:grid-cols-2">
            <GraficoBarras
              titulo="Cliques por dia"
              formatar={inteiro}
              vazio="Sem cliques no período."
              pontos={ind.serie.map((d) => ({ rotulo: diaCurto(d.dia), valor: d.cliques, detalhe: `${formatarDia(d.dia)}: ${d.cliques} cliques` }))}
            />
            <GraficoBarras
              titulo="Vendas por dia"
              formatar={inteiro}
              pontos={ind.serie.map((d) => ({ rotulo: diaCurto(d.dia), valor: d.vendas, detalhe: `${formatarDia(d.dia)}: ${d.vendas} vendas` }))}
            />
          </div>

          <section aria-labelledby="t-produtos" className="flex flex-col gap-3">
            <h2 id="t-produtos" className="text-base font-medium">
              Meus produtos
            </h2>
            <TabelaDados
              legenda="Produtos que você indica"
              colunas={[
                { titulo: "Produto", principal: true },
                { titulo: "Comissão", numero: true },
                { titulo: "Situação" },
                { titulo: "Cliques", numero: true },
                { titulo: "Vendas", numero: true },
                { titulo: "Link" },
              ]}
              linhas={produtos.map((p) => {
                const link = `${site}/@${p.vitrine_slug}/${p.produto_slug}`;
                const comissao = Math.floor((p.preco_centavos * Number(p.comissao_percentual)) / 100);
                return {
                  chave: p.afiliacao_id,
                  celulas: [
                    <span key="n" data-meu-produto={p.nome}>
                      {p.nome}
                      <span className="block font-normal text-petroleo/75">{p.loja}</span>
                    </span>,
                    `${String(Number(p.comissao_percentual)).replace(".", ",")}%, ${formatarPreco(comissao)}`,
                    <span key="s" className={p.status === "bloqueada" || p.status === "recusada" ? "text-red-800" : ""}>
                      {STATUS_AFILIACAO[p.status] ?? p.status}
                    </span>,
                    inteiro(Number(p.cliques)),
                    inteiro(Number(p.vendas)),
                    p.status === "aprovada" ? (
                      <div key="l" className="flex flex-wrap items-center gap-2">
                        {/* link curto visível: a pessoa confere o que vai compartilhar */}
                        <span className="w-full break-all text-xs text-petroleo/75">{`/@${p.vitrine_slug}/${p.produto_slug}`}</span>
                        <CopiarLink url={link} rotulo="Copiar link da página" className="min-h-11 rounded-full border border-petroleo/40 px-3 text-sm font-medium" />
                        {/* segunda modalidade: leva direto ao checkout da loja (bom para anúncio e WhatsApp) */}
                        <CopiarLink url={`${link}/comprar`} rotulo="Copiar link do checkout" className="min-h-11 rounded-full border border-petroleo/40 px-3 text-sm font-medium" />
                        <BotaoWhatsapp
                          texto={`${p.nome}\n${link}`}
                          rotulo="WhatsApp"
                          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-petroleo px-3 text-sm font-medium text-branco"
                        />
                        <form action={cancelarAfiliacao}>
                          <input type="hidden" name="afiliacao_id" value={p.afiliacao_id} />
                          <button className="min-h-11 px-1 text-sm text-petroleo/75 underline">Sair</button>
                        </form>
                      </div>
                    ) : (
                      <span key="l" className="text-petroleo/75">Sem link</span>
                    ),
                  ],
                };
              })}
              vazio={{ texto: "Você ainda não se afiliou a nenhum produto.", acao: { href: "/painel/revendedor/catalogo", rotulo: "Ver catálogo" } }}
            />
          </section>

          <CodigoIndicacao slug={vitrine.slug} />

          <TabelaVendas
            vendas={vendas}
            periodo={periodo}
            papel="afiliado"
            vazio={{ texto: "Nenhuma venda pelos seus links no período.", acao: { href: "/painel/revendedor/catalogo", rotulo: "Encontrar produtos" } }}
          />

          <section aria-labelledby="t-vitrine" className="flex flex-col gap-3 rounded-2xl bg-branco p-5">
            <h2 id="t-vitrine" className="text-base font-medium">
              Minha vitrine
            </h2>
            <p className="break-all text-sm">
              {site}/@{vitrine.slug}
              {!vitrine.publicada && <span className="block text-petroleo/75">Ainda não publicada.</span>}
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href={`/@${vitrine.slug}`} className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-4 font-medium text-branco">
                Abrir vitrine
              </Link>
              <CopiarLink url={`${site}/@${vitrine.slug}`} className="min-h-11 rounded-full border border-petroleo/40 px-4 font-medium" />
              <Link href="/painel/revendedor/vitrine" className="inline-flex min-h-11 items-center px-2 font-medium underline">
                Editar vitrine
              </Link>
              <Link href="/painel/revendedor/links" className="inline-flex min-h-11 items-center px-2 font-medium underline">
                Links externos
              </Link>
              <Link href="/painel/afiliado/recebimentos" className="inline-flex min-h-11 items-center px-2 font-medium underline">
                Recebimentos
              </Link>
            </div>
            <p className="text-sm text-petroleo/80">
              Cliques nos seus links externos (Shopee, Mercado Livre, TikTok Shop) no período:{" "}
              <strong className="font-medium">{inteiro(ind.cliques_externos)}</strong>. A Staypse registra só os cliques; as vendas
              acontecem no outro site.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
