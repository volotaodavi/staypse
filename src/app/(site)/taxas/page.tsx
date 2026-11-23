// Taxas para lojas: tabela da taxa TOTAL por modalidade, lida das configurações (nunca fixa no código).
// Só a taxa total: o custo da Lytex e a divisão interna não aparecem aqui. Não linkar no checkout nem em
// páginas do comprador; fora do sitemap e sem indexação.
import type { Metadata } from "next";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { TERMOS_VERSAO } from "@/config/empresa";
import {
  MODALIDADES,
  ROTULO_MODALIDADE,
  taxaTotalCentavos,
  type Modalidade,
} from "@/lib/pagamentos/taxas";
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
const EXEMPLO_CENTAVOS = 10_000;

export default async function Taxas() {
  const { data } = await criarClienteAdmin()
    .from("configuracoes")
    .select("chave, valor")
    .like("chave", "taxa_total_%");
  const taxas = new Map<string, { percentual: number; fixoCentavos: number }>();
  for (const c of data ?? []) {
    const v = c.valor as { percentual?: number; fixo_centavos?: number };
    if (typeof v.percentual === "number" && typeof v.fixo_centavos === "number")
      taxas.set(c.chave, {
        percentual: v.percentual,
        fixoCentavos: v.fixo_centavos,
      });
  }
  const linha = (m: Modalidade) => taxas.get(`taxa_total_${m}`);
  const pct = (n: number) =>
    `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

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
        {
          id: "tabela",
          titulo: "Taxa por meio de pagamento",
          conteudo: (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Taxa da plataforma por meio de pagamento
                  </caption>
                  <thead>
                    <tr className="text-left text-petroleo/75">
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Meio de pagamento
                      </th>
                      <th
                        scope="col"
                        className="py-2 pr-3 text-right font-medium"
                      >
                        Taxa
                      </th>
                      <th
                        scope="col"
                        className="py-2 text-right font-medium whitespace-nowrap"
                      >
                        Em uma venda de {formatarPreco(EXEMPLO_CENTAVOS)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODALIDADES.map((m) => {
                      const t = linha(m);
                      return (
                        <tr key={m} className="border-t border-petroleo/10">
                          <th
                            scope="row"
                            className="py-2 pr-3 text-left font-normal"
                          >
                            {ROTULO_MODALIDADE[m]}
                          </th>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {t
                              ? `${pct(t.percentual)} + ${formatarPreco(t.fixoCentavos)}`
                              : "Consulte o atendimento"}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {t
                              ? formatarPreco(
                                  taxaTotalCentavos(EXEMPLO_CENTAVOS, t),
                                )
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-petroleo/80">
                O percentual incide sobre o total pago, frete incluído. O cartão
                em 2x a 6x e em 7x a 12x tem faixa própria. As parcelas são sem
                juros para o comprador. Valores sujeitos a alteração, com aviso
                prévio no painel.
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
                No painel, cada um vê dois números: &quot;Taxa da
                plataforma&quot; e &quot;Você recebe&quot;.
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
