// "Minhas vendas" de quem indica (afiliado ou vendedor): data, produto, loja,
// comissão e situação. Do comprador, só o nome e o valor pago (LGPD: nunca contato, CPF ou endereço).
import { LinkCsv } from "@/components/painel/FiltroPeriodo";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { SITUACAO_COMISSAO, type Comissao } from "@/app/(site)/painel/afiliado/consulta";
import { ROTULO_ORIGEM_ATRIBUICAO, data, dataHora } from "@/lib/pedidos";
import type { Periodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";

export function TabelaVendas({
  vendas,
  periodo,
  papel,
  vazio,
}: {
  vendas: Comissao[];
  periodo: Periodo;
  papel: "afiliado" | "vendedor";
  vazio: { texto: string; acao?: { href: string; rotulo: string } };
}) {
  return (
    <section aria-labelledby="t-vendas" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="t-vendas" className="text-base font-medium">
          Minhas vendas
        </h2>
        <LinkCsv caminho={`/painel/${papel}/vendas/csv`} periodo={periodo} extras={{ papel }}>
          Exportar CSV
        </LinkCsv>
      </div>
      <TabelaDados
        legenda="Minhas vendas"
        colunas={[
          { titulo: "Produto", principal: true },
          { titulo: "Data" },
          { titulo: "Loja" },
          { titulo: "Origem" },
          { titulo: "Comprador" },
          { titulo: "Valor pago", numero: true },
          { titulo: "Venda", numero: true },
          { titulo: "Comissão", numero: true },
          ...(papel === "afiliado" ? [{ titulo: "Taxa da plataforma", numero: true }, { titulo: "Você recebe", numero: true }] : []),
          { titulo: "Situação" },
        ]}
        linhas={vendas.map((v, i) => ({
          chave: `${v.pedido_id}-${i}`,
          celulas: [
            <span key="p" data-venda={v.produto}>
              {v.produto} × {v.quantidade}
            </span>,
            dataHora(v.data),
            v.loja,
            <span key="o" data-origem={v.origem_atribuicao ?? ""}>{ROTULO_ORIGEM_ATRIBUICAO[v.origem_atribuicao ?? ""] ?? "Aguardando pagamento"}</span>,
            v.comprador_nome,
            v.valor_pago_centavos == null ? "Aguardando pagamento" : formatarPreco(Number(v.valor_pago_centavos)),
            formatarPreco(Number(v.valor_centavos)),
            formatarPreco(Number(v.comissao_centavos)),
            ...(papel === "afiliado"
              ? [
                  v.taxa_centavos == null ? "Sem cobrança" : formatarPreco(v.taxa_centavos),
                  v.recebe_centavos == null ? "Sem cobrança" : formatarPreco(v.recebe_centavos),
                ]
              : []),
            <span key="s" data-situacao={v.situacao}>
              {SITUACAO_COMISSAO[v.situacao] ?? v.situacao}
              {v.situacao === "a_receber" && v.previsao && <span className="block text-petroleo/75">previsão: após {data(v.previsao)}</span>}
            </span>,
          ],
        }))}
        vazio={vazio}
      />
      <p className="text-sm text-petroleo/75">
        &quot;Pendente&quot;: venda paga, ainda no prazo de 7 dias em que o comprador pode desistir. Depois disso, a comissão é
        liberada e repassada pelo split, já sem a taxa da plataforma sobre a sua comissão. Se o comprador desistir, pedir reembolso ou contestar o pagamento (chargeback), a comissão é estornada.
      </p>
    </section>
  );
}
