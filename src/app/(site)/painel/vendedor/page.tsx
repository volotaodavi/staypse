// Painel do vendedor próprio da loja: só as PRÓPRIAS vendas e comissões, o vínculo
// com a loja e os links dos produtos. Nunca mostra totais da loja, outros
// vendedores nem dados de compradores — o banco também não deixa (funções
// filtradas por auth.uid()). Mesmo padrão do painel do afiliado.
import Link from "next/link";
import { FiltroPeriodo } from "@/components/painel/FiltroPeriodo";
import { GraficoBarras } from "@/components/painel/GraficoBarras";
import { NotaPagamentos, Numeros, inteiro } from "@/components/painel/Numeros";
import { Recebimento } from "@/components/painel/Recebimento";
import { TabelaVendas } from "@/components/painel/TabelaVendas";
import { BotaoWhatsapp } from "@/components/publico";
import { CopiarLink } from "@/components/rastreio";
import { exigirPapel } from "@/lib/papeis";
import { diaCurto, formatarDia, lerPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { urlDoSite } from "@/lib/supabase/env";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { lerComissoes, lerIndicadores } from "../afiliado/consulta";

export const metadata = { title: "Painel do vendedor" };
export const instant = false;

type Vinculo = { loja_nome: string; loja_slug: string | null; comissao_percentual: number; forma_pagamento: string; status: string };
type Afiliacao = {
  id: string;
  status: string;
  items: { nome: string; slug: string } | null;
  // situação do vínculo com a loja deste item (desativado = link não atribui)
  loja_vendedores: { status: string } | null;
};

const FORMA: Record<string, string> = {
  folha: "Folha de pagamento",
  split_direto: "Split direto",
};

const pct = (n: number) => `${String(Number(n)).replace(".", ",")}%`;

export default async function PainelVendedor({ searchParams }: PageProps<"/painel/vendedor">) {
  const usuario = await exigirPapel("vendedor_proprio");
  const sp = await searchParams;
  const periodo = lerPeriodo(sp);
  const aviso = Array.isArray(sp.vitrine) ? sp.vitrine[0] : sp.vitrine;
  const supabase = await criarClienteServidor();
  const site = urlDoSite();

  const [{ data: dadosVinculos }, { data: vitrine }, { data: afiliacoes }, ind, vendas] = await Promise.all([
    supabase.rpc("meus_vinculos_de_vendedor"),
    supabase.from("storefronts").select("slug, publicada").eq("revendedor_id", usuario.id).maybeSingle(),
    supabase
      .from("afiliacoes")
      .select("id, status, items(nome, slug), loja_vendedores(status)")
      .eq("afiliado_id", usuario.id)
      .eq("origem", "vendedor_proprio")
      .order("criado_em")
      .returns<Afiliacao[]>(),
    lerIndicadores("vendedor", periodo),
    lerComissoes("vendedor", periodo),
  ]);
  const vinculos = (dadosVinculos ?? []) as Vinculo[];
  const ativos = vinculos.filter((v) => v.status === "ativo");
  // o cadastro de recebimento só existe para quem recebe direto no split
  const temSplit = ativos.some((v) => v.forma_pagamento === "split_direto");
  const soFolha = ativos.length > 0 && !temSplit;
  const links = (afiliacoes ?? []).filter((a) => a.items);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-petroleo/75">Vendedor da loja</p>
        <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>
      </div>
      {aviso === "salva" && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          Vitrine salva e publicada.
        </p>
      )}

      {/* a que loja pertence, link da loja e tipo de comissão */}
      {vinculos.map((v) => (
        <section key={v.loja_nome} className="rounded-2xl bg-petroleo p-5 text-gelo" data-vinculo={v.loja_nome}>
          <h2 className="text-xl text-branco">{v.loja_nome}</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gelo/80">Comissão</dt>
              <dd className="font-medium text-branco">{pct(v.comissao_percentual)} (conforme contrato)</dd>
            </div>
            <div>
              <dt className="text-gelo/80">Como você recebe</dt>
              <dd className="font-medium text-branco" data-forma={v.forma_pagamento}>
                {FORMA[v.forma_pagamento] ?? v.forma_pagamento}
              </dd>
            </div>
            <div>
              <dt className="text-gelo/80">Situação</dt>
              <dd className="font-medium text-branco">{v.status === "ativo" ? "Ativo" : "Desativado pela loja"}</dd>
            </div>
          </dl>
          {v.loja_slug && (
            <p className="mt-3 text-sm">
              <Link href={`/loja/${v.loja_slug}`} className="inline-flex min-h-11 items-center break-all font-medium text-branco underline">
                {site}/loja/{v.loja_slug}
              </Link>
            </p>
          )}
          {v.forma_pagamento === "folha" && v.status === "ativo" && (
            <p className="mt-1 rounded-xl bg-branco/10 px-4 py-3 text-sm text-branco">Sua comissão é paga pela loja junto com o salário.</p>
          )}
          {v.status !== "ativo" && (
            <p className="mt-3 text-sm text-gelo/90">Seus links desta loja não registram novas indicações. O histórico continua guardado.</p>
          )}
        </section>
      ))}
      {vinculos.length === 0 && <p className="rounded-2xl bg-branco px-4 py-3 text-sm">Você ainda não tem vínculo ativo com uma loja.</p>}

      <FiltroPeriodo periodo={periodo} caminho="/painel/vendedor" />
      <Numeros
        itens={[
          { rotulo: "Vendas", valor: inteiro(ind.vendas), destaque: true },
          { rotulo: "Total vendido por você", valor: formatarPreco(ind.vendido_centavos) },
          { rotulo: "Comissões a receber", valor: formatarPreco(ind.a_receber_centavos), nota: "Previsão de recebimento" },
          { rotulo: soFolha ? "Comissões liberadas" : "Repassado pelo split", valor: formatarPreco(ind.repassada_centavos) },
          { rotulo: "Estornado (desistências)", valor: formatarPreco(ind.estornada_centavos) },
        ]}
      />
      <NotaPagamentos />

      <GraficoBarras
        titulo="Vendas por dia"
        formatar={inteiro}
        pontos={ind.serie.map((d) => ({ rotulo: diaCurto(d.dia), valor: d.vendas, detalhe: `${formatarDia(d.dia)}: ${d.vendas} vendas` }))}
      />

      {/* links de cada produto da loja para compartilhar */}
      <section aria-labelledby="t-links" className="flex flex-col gap-3 rounded-2xl bg-branco p-5">
        <h2 id="t-links" className="text-base font-medium">
          Links dos produtos da loja
        </h2>
        {!vitrine || links.length === 0 ? (
          <p className="text-sm text-petroleo/75">Nenhum produto da loja liberado para você ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-petroleo/10">
            {links.map((a) => {
              const link = `${site}/@${vitrine.slug}/${a.items!.slug}`;
              return (
                <li key={a.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">{a.items!.nome}</p>
                  <p className="break-all rounded-lg bg-gelo px-3 py-2 text-xs">{`/@${vitrine.slug}/${a.items!.slug}`}</p>
                  {a.loja_vendedores?.status !== "ativo" ? (
                    <p className="text-sm text-petroleo/75">A loja desativou seu vínculo: este link não registra novas indicações.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <CopiarLink url={link} rotulo="Copiar link" className="min-h-11 rounded-full border border-petroleo/40 px-4 text-sm font-medium" />
                      <BotaoWhatsapp
                        texto={`${a.items!.nome}\n${link}`}
                        rotulo="WhatsApp"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-petroleo px-4 text-sm font-medium text-branco"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {vitrine && (
          <Link href="/painel/revendedor/vitrine" className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline">
            {vitrine.publicada ? "Editar minha vitrine" : "Montar minha vitrine"}
          </Link>
        )}
      </section>

      <TabelaVendas vendas={vendas} periodo={periodo} papel="vendedor" vazio={{ texto: "Nenhuma venda pelos seus links no período." }} />

      {temSplit && <Recebimento papel="vendedor" />}
    </div>
  );
}
