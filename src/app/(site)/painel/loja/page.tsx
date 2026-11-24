// Painel da loja: resumo do período (cards), vendas por dia e atalhos.
import Link from "next/link";
import { connection } from "next/server";
import { FiltroPeriodo } from "@/components/painel/FiltroPeriodo";
import { AvisoTaxas } from "@/components/painel/AvisoTaxas";
import { GraficoBarras } from "@/components/painel/GraficoBarras";
import { NotaPagamentos, Numeros, inteiro, percentual } from "@/components/painel/Numeros";
import { meuRecebedor, recebedorOk } from "@/components/painel/Recebimento";
import { ROTULO_STATUS_RECEBEDOR } from "@/lib/pagamentos/recebedores";
import { diaCurto, formatarDia, lerPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { minhaLoja } from "./dados";

export const metadata = { title: "Painel da loja" };
export const instant = false;

type Resumo = {
  vendas: number;
  faturamento_centavos: number;
  comissoes_centavos: number;
  cliques: number;
  aguardando_envio: number;
  desistencias: number;
  serie: { dia: string; vendas: number; faturamento_centavos: number }[];
};

export default async function PainelLoja({ searchParams }: PageProps<"/painel/loja">) {
  // o período usa a data de hoje: espera a requisição antes de ler o relógio
  await connection();
  const periodo = lerPeriodo(await searchParams);
  const { supabase, loja } = await minhaLoja();

  if (!loja || loja.status_verificacao !== "aprovado") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl">Resumo</h1>
        <section className="flex flex-col items-start gap-3 rounded-2xl bg-branco p-5">
          <p>
            {!loja
              ? "Para vender, cadastre sua empresa: CNPJ ativo e endereço de envio."
              : loja.status_verificacao === "em_analise"
                ? "Seu cadastro está em análise. O painel de vendas abre quando a loja for aprovada."
                : "Seu cadastro ainda não foi aprovado. Confira o que falta."}
          </p>
          <Link href="/painel/produtor" className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-5 font-medium text-branco">
            {!loja ? "Cadastrar minha empresa" : "Ver meu cadastro"}
          </Link>
        </section>
      </div>
    );
  }

  const [{ data, error }, { count: semNota }, { data: recusados }, recebedor, { data: taxasBruto }] = await Promise.all([
    supabase.rpc("painel_loja_resumo", { p_inicio: periodo.inicio, p_fim: periodo.fim }),
    // pedidos pagos com item ainda sem nota fiscal (regra 2)
    supabase
      .from("orders")
      .select("id, order_items!inner(id)", { count: "exact", head: true })
      .eq("producer_id", loja.id)
      .eq("status", "pago")
      .is("order_items.nota_fiscal_numero", null),
    // itens recusados na análise, com o motivo (coluna privada: itens_privados)
    supabase.rpc("itens_privados").select("id, nome, motivo_rejeicao").eq("producer_id", loja.id).eq("status_aprovacao", "recusado"),
    meuRecebedor("produtor"),
    // só "Taxa da plataforma" e "Você recebe" (nunca a divisão interna)
    supabase.rpc("painel_loja_taxas", { p_inicio: periodo.inicio, p_fim: periodo.fim }),
  ]);
  const valoresLoja = (taxasBruto ?? { taxa_centavos: 0, recebe_centavos: 0 }) as { taxa_centavos: number; recebe_centavos: number };
  const recebe = recebedorOk(recebedor);
  if (error) throw new Error(`Resumo indisponível: ${error.message}`);
  const itensRecusados = (recusados ?? []) as unknown as { id: string; nome: string; motivo_rejeicao: string | null }[];
  const r = data as Resumo;
  const ticket = r.vendas > 0 ? Math.round(r.faturamento_centavos / r.vendas) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-petroleo/75">Loja</p>
          <h1 className="text-3xl">{loja.loja_nome || loja.razao_social}</h1>
        </div>
        {loja.loja_slug && (
          <Link href={`/loja/${loja.loja_slug}`} className="inline-flex min-h-11 items-center text-sm font-medium underline">
            Ver minha loja
          </Link>
        )}
      </div>
      <FiltroPeriodo periodo={periodo} caminho="/painel/loja" />
      <AvisoTaxas />

      {(!recebe || (semNota ?? 0) > 0 || itensRecusados.length > 0 || r.aguardando_envio > 0 || r.desistencias > 0 || loja.frete_fixo_centavos == null) && (
        <ul className="flex flex-col gap-2 text-sm" aria-label="Pendências" data-pendencias>
          {!recebe && (
            <li className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-900" data-pendencia-recebedor>
              Cadastro de recebimento: {ROTULO_STATUS_RECEBEDOR[recebedor?.status_recebedor ?? "nao_iniciado"]}
              {recebedor?.motivo ? `, ${recebedor.motivo}` : ""}. Sem ele aprovado na Lytex, a loja não publica produtos nem
              recebe pedidos.{" "}
              <Link href="/painel/loja/recebimentos" className="font-medium underline">
                Completar cadastro de recebimento
              </Link>
            </li>
          )}
          {(semNota ?? 0) > 0 && (
            <li className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
              <Link href="/painel/loja/pedidos?status=a_enviar" className="font-medium underline">
                {semNota} {semNota === 1 ? "pedido pago sem nota fiscal" : "pedidos pagos sem nota fiscal"}
              </Link>
              . Emita a nota antes de enviar (obrigatório em toda venda).
            </li>
          )}
          {itensRecusados.map((i) => (
            <li key={i.id} className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
              Produto recusado: <strong className="font-medium">{i.nome}</strong>
              {i.motivo_rejeicao ? `, ${i.motivo_rejeicao}` : ""}.{" "}
              <Link href={`/painel/produtor/itens/${i.id}`} className="font-medium underline">
                Corrigir
              </Link>
            </li>
          ))}
          {r.aguardando_envio > 0 && (
            <li className="rounded-2xl bg-ciano/25 px-4 py-3">
              <Link href="/painel/loja/pedidos?status=a_enviar" className="font-medium underline">
                {r.aguardando_envio} {r.aguardando_envio === 1 ? "pedido pago aguardando envio" : "pedidos pagos aguardando envio"}
              </Link>
            </li>
          )}
          {r.desistencias > 0 && (
            <li className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">
              <Link href="/painel/loja/pedidos?status=em_reembolso" className="font-medium underline">
                {r.desistencias} {r.desistencias === 1 ? "desistência para combinar a devolução" : "desistências para combinar a devolução"}
              </Link>
            </li>
          )}
          {loja.frete_fixo_centavos == null && (
            <li className="rounded-2xl bg-branco px-4 py-3">
              Envio pelo correio desligado.{" "}
              <Link href="/painel/produtor/frete" className="font-medium underline">
                Configurar frete
              </Link>
            </li>
          )}
        </ul>
      )}

      <Numeros
        itens={[
          { rotulo: "Vendas", valor: inteiro(r.vendas), destaque: true },
          { rotulo: "Faturamento bruto", valor: formatarPreco(r.faturamento_centavos) },
          { rotulo: "Comissões a afiliados e vendedores", valor: formatarPreco(r.comissoes_centavos), nota: "Repassadas pelo split" },
          { rotulo: "Taxa da plataforma", valor: formatarPreco(Number(valoresLoja.taxa_centavos)), nota: "Descontada de cada venda" },
          { rotulo: "Você recebe", valor: formatarPreco(Number(valoresLoja.recebe_centavos)), nota: "Depois da comissão e da taxa" },
          { rotulo: "Ticket médio", valor: r.vendas > 0 ? formatarPreco(ticket) : "Sem vendas" },
          { rotulo: "Cliques nos links", valor: inteiro(r.cliques) },
          { rotulo: "Conversão", valor: percentual(r.vendas, r.cliques), nota: "Vendas ÷ cliques" },
        ]}
      />
      <NotaPagamentos />
      <p className="max-w-prose text-sm text-petroleo/75">
        <Link href="/taxas" className="font-medium underline">
          Ver taxas para lojas
        </Link>
      </p>

      <GraficoBarras
        titulo="Vendas por dia"
        formatar={inteiro}
        pontos={r.serie.map((d) => ({
          rotulo: diaCurto(d.dia),
          valor: d.vendas,
          detalhe: `${formatarDia(d.dia)}: ${d.vendas} ${d.vendas === 1 ? "venda" : "vendas"}, ${formatarPreco(d.faturamento_centavos)}`,
        }))}
      />

    </div>
  );
}
