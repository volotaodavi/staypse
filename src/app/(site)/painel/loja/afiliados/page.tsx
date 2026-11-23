// Afiliados da loja: pedidos pendentes (aprovar/recusar), desempenho por
// afiliado no período e bloqueio. Por privacidade (LGPD), só o nome e o @ da
// vitrine, nunca e-mail ou telefone do afiliado.
import Link from "next/link";
import { connection } from "next/server";
import { FiltroPeriodo, LinkCsv } from "@/components/painel/FiltroPeriodo";
import { NotaPagamentos, inteiro, percentual } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { data } from "@/lib/pedidos";
import { lerPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { decidirAfiliacaoAcao } from "../../produtor/loja/acoes";
import { minhaLoja } from "../dados";
import { bloquearAfiliadoAcao, revogarConviteAfiliacao } from "./acoes";
import { FormConviteAfiliacao } from "./FormConviteAfiliacao";
import { lerAfiliadosDaLoja } from "./consulta";

export const metadata = { title: "Afiliados" };
export const instant = false;

type Convite = { id: string; item_nome: string; criado_em: string; expira_em: string; situacao: string };
type Pendente = { id: string; criado_em: string; items: { nome: string } | null; storefronts: { nome_exibicao: string | null; slug: string } | null };
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AfiliadosDaLoja({ searchParams }: PageProps<"/painel/loja/afiliados">) {
  // o período usa a data de hoje: espera a requisição antes de ler o relógio
  await connection();
  const sp = await searchParams;
  const periodo = lerPeriodo(sp);
  const { supabase, loja } = await minhaLoja();
  const [afiliados, { data: convitesBrutos }, { data: itensAprovados }, { data: pendentesBrutos }] = await Promise.all([
    lerAfiliadosDaLoja(periodo),
    supabase.rpc("meus_convites_afiliacao"),
    loja
      ? supabase.from("items").select("id, nome").eq("producer_id", loja.id).eq("status_aprovacao", "aprovado").order("nome")
      : Promise.resolve({ data: [] }),
    loja
      ? supabase
          .from("afiliacoes")
          .select("id, criado_em, items!inner(nome, producer_id), storefronts(nome_exibicao, slug)")
          .eq("items.producer_id", loja.id)
          .eq("status", "pendente")
          .order("criado_em")
      : Promise.resolve({ data: [] }),
  ]);
  const pendentes = (pendentesBrutos ?? []) as unknown as Pendente[];
  const convites = ((convitesBrutos ?? []) as Convite[]).filter((c) => c.situacao === "ativo");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Afiliados</h1>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}

      <section aria-labelledby="t-pend" className="flex flex-col gap-2">
        <h2 id="t-pend" className="text-base font-medium">
          Pedidos de afiliação ({pendentes.length})
        </h2>
        {pendentes.length === 0 ? (
          <p className="rounded-2xl bg-branco p-4 text-sm text-petroleo/80">
            Nenhum pedido aguardando. Produtos com Itens com &quot;aprovo manualmente&quot; aparecem aqui quando alguém quiser indicá-los.quot;Aprovo cada afiliadoItens com &quot;aprovo manualmente&quot; aparecem aqui quando alguém quiser indicá-los.quot; aparecem aqui quando alguém quiser indicá-los.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendentes.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 rounded-2xl bg-branco p-4 text-sm sm:flex-row sm:items-center" data-pendente>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {l.storefronts ? (
                      <Link href={`/@${l.storefronts.slug}`} className="underline">
                        {l.storefronts.nome_exibicao || `@${l.storefronts.slug}`}
                      </Link>
                    ) : (
                      "Vitrine não publicada"
                    )}
                  </p>
                  <p className="text-petroleo/75">
                    {l.items?.nome}, pediu em {data(l.criado_em)}
                  </p>
                </div>
                <form action={decidirAfiliacaoAcao} className="flex gap-2">
                  <input type="hidden" name="afiliacao_id" value={l.id} />
                  <button name="decisao" value="aprovar" className="min-h-11 rounded-full bg-petroleo px-4 font-medium text-branco">
                    Aprovar
                  </button>
                  <button name="decisao" value="recusar" className="min-h-11 rounded-full border border-petroleo px-4 font-medium">
                    Recusar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-convite" className="flex flex-col gap-2">
        <h2 id="t-convite" className="text-base font-medium">
          Convite por produto
        </h2>
        <p className="text-sm text-petroleo/80">
          Gere um link para um produto e mande a um afiliado específico. Quem abre o link, com cadastro de recebimento
          aprovado, entra já aprovado, mesmo em produtos com aprovação manual.
        </p>
        <FormConviteAfiliacao itens={(itensAprovados ?? []) as { id: string; nome: string }[]} loja={loja?.loja_nome || loja?.razao_social || "da Staypse"} />
        {convites.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Convites ativos">
            {convites.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-2xl bg-branco p-4 text-sm sm:flex-row sm:items-center" data-convite-ativo>
                <p className="min-w-0 flex-1">
                  <span className="font-medium">{c.item_nome}</span>
                  <span className="block text-petroleo/75">
                    Criado em {data(c.criado_em)}, vale até {data(c.expira_em)}
                  </span>
                </p>
                <form action={revogarConviteAfiliacao}>
                  <input type="hidden" name="convite_id" value={c.id} />
                  <button className="min-h-11 rounded-full px-4 text-sm font-medium text-red-800 underline">Revogar convite</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-desemp" className="flex flex-col gap-3">
        <h2 id="t-desemp" className="text-base font-medium">
          Desempenho por afiliado
        </h2>
        <FiltroPeriodo periodo={periodo} caminho="/painel/loja/afiliados" />
        <div className="flex justify-end">
          <LinkCsv caminho="/painel/loja/afiliados/csv" periodo={periodo}>
            Exportar CSV
          </LinkCsv>
        </div>
        <TabelaDados
          legenda="Desempenho por afiliado"
          colunas={[
            { titulo: "Afiliado", principal: true },
            { titulo: "Produtos", numero: true },
            { titulo: "Cliques", numero: true },
            { titulo: "Vendas", numero: true },
            { titulo: "Conversão", numero: true },
            { titulo: "Comissão", numero: true },
            { titulo: "Ação" },
          ]}
          linhas={afiliados.map((a) => ({
            chave: a.afiliado_id,
            celulas: [
              <span key="n" data-afiliado={a.vitrine_slug ?? ""}>
                {a.vitrine_slug ? (
                  <Link href={`/@${a.vitrine_slug}`} className="font-medium underline">
                    {a.vitrine_nome || `@${a.vitrine_slug}`}
                  </Link>
                ) : (
                  "Vitrine não publicada"
                )}
                {a.bloqueado && <span className="block text-red-800">Bloqueado</span>}
              </span>,
              `${inteiro(Number(a.itens_aprovados))}${Number(a.itens_pendentes) ? ` (+${a.itens_pendentes} pend.)` : ""}`,
              inteiro(Number(a.cliques)),
              inteiro(Number(a.vendas)),
              percentual(Number(a.vendas), Number(a.cliques)),
              formatarPreco(Number(a.comissao_centavos)),
              <form key="b" action={bloquearAfiliadoAcao}>
                <input type="hidden" name="afiliado" value={a.afiliado_id} />
                <input type="hidden" name="bloquear" value={a.bloqueado ? "nao" : "sim"} />
                <button className={`min-h-11 rounded-full px-4 text-sm font-medium ${a.bloqueado ? "border border-petroleo" : "text-red-800 underline"}`}>
                  {a.bloqueado ? "Desbloquear" : "Bloquear"}
                </button>
              </form>,
            ],
          }))}
          vazio={{
            texto: "Ninguém se afiliou ainda. Afiliados encontram seus produtos aprovados no catálogo.",
            acao: { href: "/painel/loja/produtos", rotulo: "Ver meus produtos" },
          }}
        />
        <p className="text-sm text-petroleo/75">
          Bloquear: os links do afiliado param de atribuir vendas novas na hora e ele não consegue se afiliar de novo. Vendas já
          feitas continuam com a comissão combinada.
        </p>
        <NotaPagamentos />
      </section>
    </div>
  );
}
