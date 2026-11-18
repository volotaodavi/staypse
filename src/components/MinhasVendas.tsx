// "Minhas vendas" para revendedor e vendedor próprio: data, produto, valor,
// comissão e situação. Nenhum dado do comprador (LGPD). A comissão é
// informativa: quem divide o pagamento de fato é a instituição de pagamento.
import { STATUS_PEDIDO, data } from "@/lib/pedidos";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";

type Venda = {
  pedido_id: string;
  data: string;
  produto: string;
  quantidade: number;
  valor_centavos: number;
  comissao_centavos: number;
  status: string;
};

export async function MinhasVendas() {
  const supabase = await criarClienteServidor();
  const { data: bruto } = await supabase.rpc("minhas_vendas");
  const vendas = ((bruto ?? []) as Venda[]).filter((v) => v.status !== "cancelado").slice(0, 50);
  const total = vendas.filter((v) => v.status === "pago").reduce((s, v) => s + v.comissao_centavos, 0);

  return (
    <section className="rounded-3xl bg-branco p-5" aria-labelledby="titulo-vendas">
      <h2 id="titulo-vendas" className="text-xl">
        Minhas vendas
      </h2>
      <p className="mt-1 text-sm text-petroleo/75">
        Você recebe sua parte no split automático de cada venda paga. Desistências dentro de 7 dias são devolvidas ao comprador.
      </p>
      {vendas.length === 0 ? (
        <p className="mt-3 text-sm">Ainda não há vendas pelos seus links.</p>
      ) : (
        <>
          <p className="mt-3 text-sm" data-comissao-total>
            Comissão das vendas pagas: <strong className="font-medium">{formatarPreco(total)}</strong>
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Vendas pelos seus links</caption>
              <thead>
                <tr className="text-left text-petroleo/75">
                  <th scope="col" className="py-2 pr-3 font-medium">Data</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Produto</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium whitespace-nowrap">Comissão</th>
                  <th scope="col" className="py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={`${v.pedido_id}-${v.produto}`} className="border-t border-petroleo/10">
                    <td className="py-2 pr-3 whitespace-nowrap">{data(v.data)}</td>
                    <td className="py-2 pr-3">
                      {v.produto} × {v.quantidade}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatarPreco(v.comissao_centavos)}</td>
                    <td className="py-2">{STATUS_PEDIDO[v.status] ?? v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
