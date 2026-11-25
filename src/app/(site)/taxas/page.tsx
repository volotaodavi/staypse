// Taxas para lojas: tabela da taxa TOTAL por modalidade, lida das configurações (nunca fixa no código).
// Só a taxa total: o custo da Lytex e a divisão interna não aparecem aqui. Não linkar no checkout nem em
// páginas do comprador; fora do sitemap e sem indexação.
import type { Metadata } from "next";
import { connection } from "next/server";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { TERMOS_VERSAO } from "@/config/empresa";
import {
  MODALIDADES,
  type Modalidade,
} from "@/lib/pagamentos/taxas";
import { Simulador } from "./Simulador";
import { lerPar, TabelaTaxas, type Par } from "@/components/TabelaTaxas";
import { vigenciaFutura } from "@/lib/pagamentos/vigencia";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Taxas para lojas",
  description:
    "Quanto custa vender pela Staypse: taxa por meio de pagamento, quem paga e como o prazo de recebimento funciona.",
  robots: { index: false },
};
export const instant = false;

const f = "font-medium";

const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function Taxas() {
  await connection(); // a vigência depende da data de hoje
  const { data } = await criarClienteAdmin()
    .from("configuracoes")
    .select("chave, valor")
    .or("chave.like.taxa_total_%,chave.in.(taxas_vigencia_em,taxas_anteriores,taxa_minima_centavos,pedido_minimo_centavos)");
  const cfg = new Map<string, unknown>((data ?? []).map((c) => [c.chave as string, c.valor]));
  const novas = (m: Modalidade) => lerPar(cfg.get(`taxa_total_${m}`));
  const anteriores = cfg.get("taxas_anteriores") as Record<string, unknown> | undefined;
  const vigenciaIso = typeof cfg.get("taxas_vigencia_em") === "string" ? (cfg.get("taxas_vigencia_em") as string) : null;
  const futura = vigenciaIso !== null && vigenciaFutura(vigenciaIso) && anteriores !== undefined;
  const minimoNovo = Number(cfg.get("taxa_minima_centavos") ?? 0) || 0;
  const pedidoMinimo = Number(cfg.get("pedido_minimo_centavos") ?? 0) || 0;
  // o simulador usa a tabela em vigor hoje (na janela de aviso, ainda a anterior)
  const emVigor = (m: Modalidade) => (futura ? lerPar(anteriores?.[m]) : novas(m));
  const taxaTotalSim = {} as Record<Modalidade, Par>;
  for (const m of MODALIDADES) {
    const t = emVigor(m);
    if (t) taxaTotalSim[m] = t;
  }
  const simuladorPronto = MODALIDADES.every((m) => taxaTotalSim[m]);

  return (
    <DocumentoLegal
      titulo="Taxas para lojas"
      versao={TERMOS_VERSAO}
      resumo={
        <>
          <p>
            A taxa da plataforma é um percentual mais um valor fixo por venda,
            conforme o meio de pagamento. Ela é paga pela loja e pelo afiliado,
            cada um na proporção da sua parte na venda, e é descontada na
            divisão do pagamento.
          </p>
          <p>
            O comprador nunca paga taxa: ele paga o preço do anúncio, mais o
            frete quando houver.
          </p>
        </>
      }
      secoes={[
        ...(simuladorPronto
          ? [
              {
                id: "simulador",
                titulo: "Quanto sobra: simule uma venda",
                conteudo: <Simulador taxaTotal={taxaTotalSim} taxaMinimaCentavos={futura ? 0 : minimoNovo} pedidoMinimoCentavos={pedidoMinimo} />,
              },
            ]
          : []),
        {
          id: "tabela",
          titulo: "Taxa por meio de pagamento",
          conteudo: (
            <>
              {futura && vigenciaIso ? (
                <div className="flex flex-col gap-6">
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-aviso-taxas>
                    Novas taxas a partir de {dia(vigenciaIso)}. Até lá valem as taxas atuais, abaixo.
                  </p>
                  <TabelaTaxas titulo={`Taxas atuais (até ${dia(vigenciaIso)})`} linha={(m) => lerPar(anteriores?.[m])} minimo={0} />
                  <TabelaTaxas titulo={`Novas taxas (a partir de ${dia(vigenciaIso)})`} linha={novas} minimo={minimoNovo} />
                </div>
              ) : (
                <TabelaTaxas titulo="Taxa por meio de pagamento" linha={novas} minimo={minimoNovo} />
              )}
              <p className="mt-3 text-sm text-petroleo/80">
                O percentual incide sobre o total pago, frete incluído. O cartão
                em 2x a 6x e em 7x a 12x tem faixa própria.{" "}
                {minimoNovo > 0 && `A taxa nunca fica abaixo de ${formatarPreco(minimoNovo)} por pedido. `}
                {pedidoMinimo > 0 && `O pedido mínimo é de ${formatarPreco(pedidoMinimo)}. `}
                Alterações de taxa são avisadas com 30 dias de antecedência,
                pelo painel e por e-mail.
              </p>
            </>
          ),
        },
        {
          id: "quem-paga",
          titulo: "Quem paga",
          conteudo: (
            <Itens>
              <li>
                <strong className={f}>Loja e afiliado</strong> pagam a taxa,
                cada um na proporção da sua parte no valor do pedido. O afiliado
                recebe a comissão combinada menos a parte dele da taxa; a loja
                recebe o restante menos a parte dela.
              </li>
              <li>
                <strong className={f}>Vendedores próprios da loja</strong> (na
                folha ou por split direto) não pagam taxa: recebem a comissão
                cheia, e a taxa dessa parte fica com a loja.
              </li>
              <li>Sem indicação, a loja paga a taxa inteira.</li>
              <li>
                <strong className={f}>Opção da loja: assumir a taxa do afiliado.</strong>{" "}
                Em Pagamentos, a loja pode ligar &quot;Minha loja paga a taxa do afiliado&quot; (vem desligada). Aí o afiliado recebe a
                comissão cheia e a loja paga a taxa inteira. O total cobrado do comprador não muda, e os produtos dessa loja aparecem no
                catálogo do afiliado com o aviso &quot;Loja paga a taxa&quot;.
              </li>
              <li>
                No painel, cada um vê dois números: &quot;Taxa da
                plataforma&quot; e &quot;Você recebe&quot;.
              </li>
            </Itens>
          ),
        },
        {
          id: "parcelamento",
          titulo: "Parcelamento no cartão",
          conteudo: (
            <Itens>
              <li>
                <strong className={f}>A loja decide</strong> até quantas vezes
                o comprador pode parcelar (de 1 a 12) e até quantas vezes sem
                juros, no painel, em Pagamentos.
              </li>
              <li>
                Nas parcelas <strong className={f}>sem juros</strong>, a loja
                absorve a taxa da faixa do cartão.
              </li>
              <li>
                Acima desse limite, o comprador paga um acréscimo no total
                (&quot;com juros&quot;) que cobre só a diferença entre a taxa
                da faixa e a do cartão à vista. A loja recebe o mesmo que
                receberia no cartão à vista.
              </li>
              <li>
                O comprador vê apenas o valor de cada parcela, se é sem ou com
                juros e o total. Nunca vê a taxa da plataforma.
              </li>
            </Itens>
          ),
        },
        {
          id: "prazos",
          titulo: "Prazos de recebimento",
          conteudo: (
            <Itens>
              <li>
                O pagamento é processado pela Lytex, que divide o valor direto
                entre as partes. Os prazos de liberação seguem as regras da
                Lytex para cada meio de pagamento.
              </li>
              <li>
                A comissão do afiliado fica pendente durante os 7 dias em que o
                comprador pode desistir e depois é liberada.
              </li>
              <li>
                Em reembolso ou contestação do pagamento, cada parte devolve o
                que recebeu, na mesma proporção.
              </li>
            </Itens>
          ),
        },
      ]}
    />
  );
}
