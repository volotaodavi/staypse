// Vendedores próprios: ranking do período e comissões. A gestão (convites,
// percentuais, desativar) e o relatório mensal ficam em /painel/produtor/vendedores.
import Link from "next/link";
import { FiltroPeriodo, LinkCsv } from "@/components/painel/FiltroPeriodo";
import { NotaPagamentos, inteiro } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { hojeBrasil, lerPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { AbasLoja } from "../AbasLoja";
import { FORMA_VENDEDOR, lerVendedoresDaLoja } from "./consulta";

export const metadata = { title: "Vendedores próprios" };
export const instant = false;

export default async function VendedoresDaLoja({ searchParams }: PageProps<"/painel/loja/vendedores">) {
  const periodo = lerPeriodo(await searchParams);
  const vendedores = await lerVendedoresDaLoja(periodo);
  const mes = hojeBrasil().slice(0, 7);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">Vendedores próprios</h1>
        <Link href="/painel/produtor/vendedores" className="inline-flex min-h-11 items-center rounded-full bg-ciano px-5 text-sm font-medium text-petroleo">
          Convidar e gerenciar
        </Link>
      </div>
      <AbasLoja />
      <FiltroPeriodo periodo={periodo} caminho="/painel/loja/vendedores" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-petroleo/75">Ranking por comissão no período</p>
        <LinkCsv caminho="/painel/loja/vendedores/csv" periodo={periodo}>
          Exportar CSV
        </LinkCsv>
      </div>
      <TabelaDados
        legenda="Ranking de vendedores próprios"
        colunas={[
          { titulo: "Vendedor", principal: true },
          { titulo: "Forma" },
          { titulo: "Comissão (%)", numero: true },
          { titulo: "Cliques", numero: true },
          { titulo: "Vendas", numero: true },
          { titulo: "Vendido", numero: true },
          { titulo: "Comissão", numero: true },
        ]}
        linhas={vendedores.map((v, i) => ({
          chave: v.vendedor_id,
          celulas: [
            <span key="n" data-vendedor={v.nome ?? ""}>
              <span className="text-petroleo/75">{i + 1}º </span>
              {v.nome ?? "—"}
              {v.arroba ? <span className="text-petroleo/75"> @{v.arroba}</span> : null}
              {v.status !== "ativo" && <span className="block text-petroleo/75">Desativado</span>}
            </span>,
            FORMA_VENDEDOR[v.forma_pagamento] ?? v.forma_pagamento,
            String(Number(v.comissao_percentual)).replace(".", ","),
            inteiro(Number(v.cliques)),
            inteiro(Number(v.vendas)),
            formatarPreco(Number(v.faturamento_centavos)),
            formatarPreco(Number(v.comissao_centavos)),
          ],
        }))}
        vazio={{ texto: "Você ainda não tem vendedores próprios.", acao: { href: "/painel/produtor/vendedores", rotulo: "Convidar vendedor" } }}
      />
      <section aria-labelledby="t-rel" className="flex flex-col gap-2 rounded-2xl bg-branco p-5 text-sm">
        <h2 id="t-rel" className="text-base font-medium">
          Relatório mensal para a folha
        </h2>
        <p className="text-petroleo/80">
          Para quem recebe &quot;na folha&quot;, a loja paga a comissão junto com o salário. O relatório traz vendas e comissões de
          cada vendedor no mês, com os percentuais que valiam na época.
        </p>
        <div className="flex flex-wrap gap-4">
          <a href={`/painel/produtor/vendedores/relatorio?mes=${mes}`} download className="inline-flex min-h-11 items-center font-medium underline">
            Baixar CSV do mês
          </a>
          <Link href={`/painel/produtor/vendedores/relatorio/imprimir?mes=${mes}`} className="inline-flex min-h-11 items-center font-medium underline">
            Versão para imprimir ou salvar em PDF
          </Link>
        </div>
      </section>
      <NotaPagamentos />
    </div>
  );
}
