// Produtos da loja com situação da análise e desempenho no período.
import Link from "next/link";
import { connection } from "next/server";
import { FiltroPeriodo, LinkCsv } from "@/components/painel/FiltroPeriodo";
import { inteiro, percentual } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { lerPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { lerProdutosDaLoja } from "./consulta";

export const metadata = { title: "Produtos da loja" };
export const instant = false;

const SITUACAO: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  pausado: "Pausado",
};

export default async function ProdutosDaLoja({ searchParams }: PageProps<"/painel/loja/produtos">) {
  // o período usa a data de hoje: espera a requisição antes de ler o relógio
  await connection();
  const periodo = lerPeriodo(await searchParams);
  const produtos = await lerProdutosDaLoja(periodo);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">Produtos</h1>
        <Link href="/painel/produtor/itens/novo" className="inline-flex min-h-11 items-center rounded-full bg-ciano px-5 text-sm font-medium text-petroleo">
          Novo produto
        </Link>
      </div>
      <FiltroPeriodo periodo={periodo} caminho="/painel/loja/produtos" />
      <div className="flex justify-end">
        <LinkCsv caminho="/painel/loja/produtos/csv" periodo={periodo}>
          Exportar CSV
        </LinkCsv>
      </div>
      <TabelaDados
        legenda="Desempenho dos produtos"
        colunas={[
          { titulo: "Produto", principal: true },
          { titulo: "Situação" },
          { titulo: "Preço", numero: true },
          { titulo: "Cliques", numero: true },
          { titulo: "Vendas", numero: true },
          { titulo: "Conversão", numero: true },
          { titulo: "Faturamento", numero: true },
        ]}
        linhas={produtos.map((p) => ({
          chave: p.item_id,
          celulas: [
            <Link key="n" href={`/painel/produtor/itens/${p.item_id}`} className="inline-flex min-h-11 items-center font-medium underline" data-produto={p.nome}>
              {p.nome}
            </Link>,
            <span key="s" className={p.status_aprovacao === "recusado" ? "text-red-800" : ""}>
              {SITUACAO[p.status_aprovacao] ?? p.status_aprovacao}
            </span>,
            formatarPreco(p.preco_centavos),
            inteiro(Number(p.cliques)),
            inteiro(Number(p.vendas)),
            percentual(Number(p.vendas), Number(p.cliques)),
            formatarPreco(Number(p.faturamento_centavos)),
          ],
        }))}
        vazio={{ texto: "Você ainda não cadastrou produtos.", acao: { href: "/painel/produtor/itens/novo", rotulo: "Cadastrar produto" } }}
      />
      <p className="text-sm text-petroleo/75">
        Para editar, pausar ou ver o motivo de uma recusa, abra o produto. Mudanças de preço, comissão ou descrição voltam para
        análise.
      </p>
    </div>
  );
}
