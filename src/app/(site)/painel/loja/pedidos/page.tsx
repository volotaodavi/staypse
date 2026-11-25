// Pedidos da loja: lista por período e situação, CSV e atendimentos abertos.
// O detalhe (itens, endereço, quem indicou, nota fiscal e rastreio) fica em
// /painel/loja/pedidos/[código]. Dados do comprador só no detalhe de pedido pago.
import Link from "next/link";
import { connection } from "next/server";
import { FiltroPeriodo, LinkCsv } from "@/components/painel/FiltroPeriodo";
import { NotaPagamentos } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { ASSUNTOS_ATENDIMENTO, data, dataHora } from "@/lib/pedidos";
import { parametrosPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { STATUS_EXIBICAO, minhaLoja, statusExibicao } from "../dados";
import { Paginacao, POR_PAGINA, lerPagina } from "../../../admin/paginacao";
import { responderAtendimento } from "./acoes";
import { lerPedidosDaLoja, origemDaVenda } from "./consulta";

export const metadata = { title: "Pedidos da loja" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const campo = "w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base font-normal";

export default async function PedidosDaLoja({ searchParams }: PageProps<"/painel/loja/pedidos">) {
  // o período usa a data de hoje: espera a requisição antes de ler o relógio
  await connection();
  const sp = await searchParams;
  const { periodo, filtro, pedidos } = await lerPedidosDaLoja(sp);
  const { supabase } = await minhaLoja();
  const { data: atendimentosBrutos } = await supabase
    .from("atendimentos")
    .select("id, protocolo, assunto, mensagem, status, resposta, prazo_ate, nome")
    .in("assunto", ["pedido", "arrependimento"])
    .neq("status", "encerrado")
    .order("prazo_ate");
  const atendimentos = atendimentosBrutos ?? [];
  const extras: Record<string, string> = filtro ? { status: filtro } : {};
  const pagina = lerPagina(sp.pagina);
  const visiveis = pedidos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Pedidos</h1>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}
      {um(sp.erro) && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {um(sp.erro)}
        </p>
      )}
      <FiltroPeriodo periodo={periodo} caminho="/painel/loja/pedidos" extras={extras} />
      <nav aria-label="Filtrar por situação" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-2 text-sm">
          {[["", "Todos"], ...Object.entries(STATUS_EXIBICAO)].map(([valor, rotulo]) => {
            const q = new URLSearchParams({ ...(valor ? { status: valor } : {}), ...parametrosPeriodo(periodo) });
            return (
              <li key={valor}>
                <Link
                  href={`/painel/loja/pedidos?${q.toString()}`}
                  aria-current={filtro === valor ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 whitespace-nowrap ${filtro === valor ? "bg-petroleo text-branco" : "bg-branco"}`}
                >
                  {rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-petroleo/75">
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
        </p>
        <LinkCsv caminho="/painel/loja/pedidos/csv" periodo={periodo} extras={extras}>
          Exportar CSV
        </LinkCsv>
      </div>
      <TabelaDados
        legenda="Pedidos da loja"
        colunas={[
          { titulo: "Pedido", principal: true },
          { titulo: "Data" },
          { titulo: "Itens" },
          { titulo: "Origem" },
          { titulo: "Situação" },
          { titulo: "Total", numero: true },
          { titulo: "Taxa da plataforma", numero: true },
          { titulo: "Você recebe", numero: true },
        ]}
        linhas={visiveis.map((p) => {
          const st = statusExibicao(p.status, p.order_items);
          const semNota = p.status === "pago" && p.order_items.some((i) => !i.nota_fiscal_numero);
          return {
            chave: p.id,
            celulas: [
              <Link key="c" href={`/painel/loja/pedidos/${p.codigo}`} className="inline-flex min-h-11 items-center font-medium underline" data-pedido={p.codigo}>
                {p.codigo}
              </Link>,
              dataHora(p.criado_em),
              p.order_items.map((i) => `${i.nome_item} × ${i.quantidade}`).join(", "),
              origemDaVenda(p),
              <span key="s">
                {STATUS_EXIBICAO[st] ?? st}
                {semNota && <span className="block text-red-800">Sem nota fiscal</span>}
              </span>,
              formatarPreco(p.total_centavos),
              p.taxa_centavos == null ? "Sem cobrança" : formatarPreco(p.taxa_centavos),
              p.recebe_centavos == null ? "Sem cobrança" : formatarPreco(p.recebe_centavos),
            ],
          };
        })}
        vazio={{
          texto: filtro ? "Nenhum pedido nesta situação no período." : "Nenhum pedido no período. Divulgue seus produtos e convide afiliados.",
          acao: { href: "/painel/loja/produtos", rotulo: "Ver meus produtos" },
        }}
      />
      {pedidos.length > POR_PAGINA && (
        <Paginacao caminho="/painel/loja/pedidos" pagina={pagina} total={pedidos.length} filtros={{ ...extras, ...parametrosPeriodo(periodo) }} />
      )}
      <NotaPagamentos />
      <p className="max-w-prose text-sm text-petroleo/75">
        A taxa da plataforma é descontada de cada venda.{" "}
        <Link href="/taxas" className="font-medium underline">
          Ver taxas para lojas
        </Link>
      </p>

      {atendimentos.length > 0 && (
        <section aria-labelledby="t-atend" className="flex flex-col gap-3">
          <h2 id="t-atend" className="text-base font-medium">
            Atendimentos sobre pedidos ({atendimentos.length})
          </h2>
          {atendimentos.map((a) => (
            <article key={a.id} className="flex flex-col gap-2 rounded-2xl bg-branco p-4 text-sm">
              <p className="text-petroleo/75">
                Protocolo {a.protocolo}, {ASSUNTOS_ATENDIMENTO[a.assunto]}, responder até {data(a.prazo_ate)}
              </p>
              <p className="font-medium">{a.nome}</p>
              <p className="whitespace-pre-line">{a.mensagem}</p>
              {a.resposta && <p className="rounded-xl bg-gelo px-3 py-2">Sua resposta: {a.resposta}</p>}
              <form action={responderAtendimento} className="flex flex-col gap-2">
                <input type="hidden" name="atendimento" value={a.id} />
                <label className="flex flex-col gap-1 font-medium">
                  Resposta
                  <textarea name="resposta" required maxLength={4000} rows={3} className={campo} />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="encerrar" value="sim" className="h-5 w-5 accent-petroleo" /> Resolvido (encerrar)
                </label>
                <button className="inline-flex min-h-11 w-fit items-center rounded-full bg-petroleo px-4 font-medium text-branco">
                  Enviar resposta
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
