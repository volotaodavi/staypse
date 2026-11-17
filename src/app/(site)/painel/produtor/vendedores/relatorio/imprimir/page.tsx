// Versão para imprimir (ou "Salvar como PDF" no navegador) do relatório mensal.
import { exigirPapel } from "@/lib/papeis";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FORMA_RELATORIO, lerRelatorio, mesDoParametro } from "../dados";
import { BotaoImprimir } from "./BotaoImprimir";

export const metadata = { title: "Relatório de comissões" };
export const instant = false;

export default async function Imprimir({ searchParams }: PageProps<"/painel/produtor/vendedores/relatorio/imprimir">) {
  const usuario = await exigirPapel("produtor");
  const mes = mesDoParametro((await searchParams).mes);
  const supabase = await criarClienteServidor();
  const [{ data: produtor }, linhas] = await Promise.all([
    supabase.from("producers").select("razao_social, cnpj").eq("user_id", usuario.id).maybeSingle(),
    lerRelatorio(mes),
  ]);
  const [ano, m] = mes.split("-");
  const total = linhas.reduce((s, l) => s + Number(l.comissao_centavos), 0);

  return (
    <div className="flex flex-col gap-4 bg-white p-6 text-neutral-900 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            Comissões de vendedores — {m}/{ano}
          </h1>
          <p className="text-sm">
            {produtor?.razao_social} · CNPJ {produtor?.cnpj}
          </p>
          <p className="text-sm text-neutral-600">
            Gerado em {new Date().toLocaleString("pt-BR")} pela Staypse (registro; a Staypse não paga comissões de folha).
          </p>
        </div>
        <BotaoImprimir />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-400 text-left">
            <th className="py-2 pr-2">Vendedor</th>
            <th className="py-2 pr-2">Forma</th>
            <th className="py-2 pr-2 text-right">Comissão</th>
            <th className="py-2 pr-2 text-right">Cliques</th>
            <th className="py-2 pr-2 text-right">Pedidos pagos</th>
            <th className="py-2 pr-2 text-right">Vendido</th>
            <th className="py-2 text-right">Comissão (R$)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-neutral-600">
                Nenhum vendedor ativo neste mês.
              </td>
            </tr>
          )}
          {linhas.map((l) => (
            <tr key={l.email} className="border-b border-neutral-200">
              <td className="py-2 pr-2">
                {l.nome ?? l.email}
                <span className="block text-xs text-neutral-600">{l.email}</span>
              </td>
              <td className="py-2 pr-2">{FORMA_RELATORIO[l.forma_pagamento]}</td>
              <td className="py-2 pr-2 text-right">{String(Number(l.comissao_percentual)).replace(".", ",")}%</td>
              <td className="py-2 pr-2 text-right tabular-nums">{l.cliques}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{l.pedidos}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatarPreco(Number(l.vendido_centavos))}</td>
              <td className="py-2 text-right tabular-nums">{formatarPreco(Number(l.comissao_centavos))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="py-2 pr-2 text-right font-semibold">
              Total de comissões
            </td>
            <td className="py-2 text-right font-semibold tabular-nums">{formatarPreco(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-neutral-600">
        Comissão “conforme contrato” de cada vendedor. As vendas começam a ser registradas quando o pagamento for aberto.
      </p>
    </div>
  );
}
