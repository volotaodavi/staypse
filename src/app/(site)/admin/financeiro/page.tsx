// Admin: finanças da Staypse. Receita da plataforma, taxas da Lytex e o que cada loja,
// afiliado e vendedor movimentou: tudo INFORMATIVO (a Staypse nunca recebe nem repassa
// dinheiro de terceiros; o split é feito na Lytex). Só a conta própria da Staypse
// (a taxa) pode ter saque, pelo endpoint da carteira da Lytex.
import Link from "next/link";
import { FiltroPeriodo } from "@/components/painel/FiltroPeriodo";
import { GraficoBarras } from "@/components/painel/GraficoBarras";
import { Numeros, inteiro } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { exigirPapel } from "@/lib/papeis";
import { lerPeriodo, parametrosPeriodo } from "@/lib/periodo";
import { MODALIDADES, ROTULO_MODALIDADE, type Modalidade } from "@/lib/pagamentos/taxas";
import { formatarPreco } from "@/lib/produtor";
import { um } from "../comuns";
import { POR_PAGINA, Paginacao, lerPagina } from "../paginacao";
import { sacarAcao } from "./acoes";
import { contaStaypse, painelLytexUrl, porModalidade, ranking, resumoFinanceiro, serieDiaria, type TipoRanking } from "./dados";
import { reaisParaCentavos, validarSaque } from "./saque";

export const metadata = { title: "Financeiro da Staypse" };
export const instant = false;

const ABAS: { tipo: TipoRanking; chave: string; rotulo: string; coluna: string; vazio: string }[] = [
  { tipo: "loja", chave: "lojas", rotulo: "Por loja", coluna: "Líquido da loja", vazio: "Nenhuma loja vendeu neste período." },
  { tipo: "afiliado", chave: "afiliados", rotulo: "Por afiliado", coluna: "Comissão", vazio: "Nenhum afiliado vendeu neste período." },
  { tipo: "vendedor", chave: "vendedores", rotulo: "Por vendedor", coluna: "Comissão", vazio: "Nenhum vendedor vendeu neste período." },
];
const estiloCampo = "min-h-11 w-full rounded-xl border border-petroleo/60 bg-branco px-3 text-base";
const botaoPrimario = "inline-flex min-h-11 items-center justify-center rounded-full bg-petroleo px-6 font-medium text-branco";
const botaoSecundario = "inline-flex min-h-11 items-center justify-center rounded-full border border-petroleo/60 px-6 font-medium text-petroleo";

export default async function AdminFinanceiro({ searchParams }: PageProps<"/admin/financeiro">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const periodo = lerPeriodo(sp, "30d");
  const aba = ABAS.find((a) => a.chave === um(sp.aba)) ?? ABAS[0];
  const busca = (um(sp.q) ?? "").trim().slice(0, 80);
  const pagina = lerPagina(sp.pagina);

  const [r, serie, linhas, conta, modalidades] = await Promise.all([
    resumoFinanceiro(periodo),
    serieDiaria(periodo),
    ranking(aba.tipo, periodo, busca, POR_PAGINA, (pagina - 1) * POR_PAGINA),
    contaStaypse(),
    porModalidade(periodo),
  ]);
  const total = linhas[0]?.total_linhas ?? 0;
  const semMovimento = r.pedidos === 0 && r.reembolsos_qtd === 0 && r.chargebacks_qtd === 0;
  const painel = painelLytexUrl();
  const filtros: Record<string, string> = { aba: aba.chave, ...(busca ? { q: busca } : {}) };
  const periodoParams = parametrosPeriodo(periodo);
  const csv = `/admin/financeiro/csv?${new URLSearchParams({ tipo: aba.tipo, ...(busca ? { q: busca } : {}), ...periodoParams })}`;

  // revisão do saque (1ª etapa): valida o valor contra o disponível antes de pedir a confirmação
  const revisar = um(sp.revisar) === "1" && conta.conectada;
  const valorPedido = reaisParaCentavos(um(sp.valor) ?? "");
  const contaEscolhida = conta.conectada ? conta.contas.find((c) => c.id === um(sp.conta)) : undefined;
  const validacao = conta.conectada ? validarSaque(valorPedido, conta.carteira.saldoCentavos, conta.carteira.saqueMinimoCentavos) : null;
  const erroRevisao = revisar ? (!validacao?.ok ? validacao?.motivo : !contaEscolhida ? "Escolha a conta bancária." : null) : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl">Financeiro da Staypse</h1>
        <p className="max-w-prose text-sm text-petroleo/80">
          Receita da plataforma e movimento das lojas, afiliados e vendedores. Os valores de terceiros são só informativos: o dinheiro cai direto na conta
          Lytex de cada um, pelo split, sem passar pela Staypse.
        </p>
      </div>

      {um(sp.ok) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.ok)}
        </p>
      )}
      {um(sp.erro) && (
        <p role="alert" className="rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-sm">
          {um(sp.erro)}
        </p>
      )}

      <FiltroPeriodo periodo={periodo} caminho="/admin/financeiro" extras={filtros} />

      {semMovimento && <p className="rounded-xl bg-branco px-4 py-3 text-sm">Nenhum pedido pago, reembolso ou chargeback neste período.</p>}
      <Numeros
        itens={[
          { rotulo: "Total vendido (GMV)", valor: formatarPreco(r.gmv_centavos), nota: `${inteiro(r.pedidos)} ${r.pedidos === 1 ? "pedido pago" : "pedidos pagos"}`, destaque: true },
          { rotulo: "Taxa total cobrada das lojas", valor: formatarPreco(r.taxa_total_centavos), nota: "Única taxa que as lojas veem" },
          { rotulo: "Receita da Staypse", valor: formatarPreco(r.staypse_centavos), nota: "Taxa total menos custo Lytex" },
          {
            rotulo: "Custo Lytex (estimado)",
            valor: r.taxa_meio_informada_pedidos > 0 ? formatarPreco(r.taxa_meio_centavos) : "Sem pedidos com taxa",
            nota: "Meio de pagamento e repasses, retidos pela Lytex",
          },
          { rotulo: "Comissões de afiliados", valor: formatarPreco(r.comissao_afiliados_centavos), nota: "Pagas direto pelo split" },
          { rotulo: "Comissões de vendedores", valor: formatarPreco(r.comissao_vendedores_centavos), nota: "Split ou folha da loja" },
          { rotulo: "Valor líquido das lojas", valor: formatarPreco(r.liquido_lojas_centavos), nota: "Depois das taxas e comissões" },
          { rotulo: "Reembolsos", valor: formatarPreco(r.reembolsos_centavos), nota: `${inteiro(r.reembolsos_qtd)} no período` },
          { rotulo: "Chargebacks", valor: formatarPreco(r.chargebacks_centavos), nota: `${inteiro(r.chargebacks_qtd)} no período` },
        ]}
      />
      {r.sem_split > 0 && (
        <p className="max-w-prose text-sm text-petroleo/80">
          {inteiro(r.sem_split)} {r.sem_split === 1 ? "pedido pago ainda não tem" : "pedidos pagos ainda não têm"} o split registrado e {r.sem_split === 1 ? "fica" : "ficam"} fora da
          receita, das taxas e das comissões.
        </p>
      )}

      <section aria-labelledby="titulo-modalidades" className="flex flex-col gap-3">
        <h2 id="titulo-modalidades" className="text-xl">
          Taxas por modalidade (interno)
        </h2>
        <p className="max-w-prose text-sm text-petroleo/80">Só o admin vê esta separação. Lojas, afiliados e vendedores veem apenas a taxa total; o comprador não vê taxa.</p>
        <TabelaDados
          legenda="Taxa total, custo Lytex e receita da Staypse por modalidade de pagamento"
          colunas={[
            { titulo: "Modalidade", principal: true },
            { titulo: "Pedidos", numero: true },
            { titulo: "Vendido", numero: true },
            { titulo: "Taxa total", numero: true },
            { titulo: "Custo Lytex", numero: true },
            { titulo: "Receita Staypse", numero: true },
          ]}
          linhas={[...modalidades]
            .sort((a, b) => MODALIDADES.indexOf(a.modalidade as Modalidade) - MODALIDADES.indexOf(b.modalidade as Modalidade))
            .map((m) => ({
              chave: m.modalidade,
              celulas: [
                ROTULO_MODALIDADE[m.modalidade as Modalidade] ?? "Sem modalidade (pedido antigo)",
                inteiro(m.pedidos),
                formatarPreco(m.gmv_centavos),
                formatarPreco(m.taxa_total_centavos),
                formatarPreco(m.custo_lytex_centavos),
                formatarPreco(m.receita_staypse_centavos),
              ],
            }))}
          vazio={{ texto: "Nenhum pedido pago neste período." }}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoBarras
          titulo="Receita da Staypse por dia"
          formatar={formatarPreco}
          vazio="Sem receita no período."
          pontos={serie.map((d) => ({ rotulo: d.rotulo, valor: d.staypse_centavos, detalhe: `${d.texto}: ${formatarPreco(d.staypse_centavos)}` }))}
        />
        <GraficoBarras
          titulo="Total vendido (GMV) por dia"
          formatar={formatarPreco}
          vazio="Sem vendas no período."
          pontos={serie.map((d) => ({ rotulo: d.rotulo, valor: d.gmv_centavos, detalhe: `${d.texto}: ${formatarPreco(d.gmv_centavos)} em ${d.pedidos} ${d.pedidos === 1 ? "pedido" : "pedidos"}` }))}
        />
      </div>

      <section aria-labelledby="titulo-conta" className="flex flex-col gap-4 rounded-2xl border border-petroleo/10 bg-branco p-4 lg:p-5">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-conta" className="text-xl">
            Conta Staypse na Lytex
          </h2>
          <p className="max-w-prose text-sm text-petroleo/80">Dinheiro próprio da Staypse (taxa da plataforma). O saque e a transferência só movem esta conta, nunca valores de lojas, afiliados ou vendedores.</p>
        </div>

        {!conta.conectada ? (
          <div className="flex flex-col items-start gap-3">
            <p className="rounded-xl bg-gelo px-4 py-3 text-sm">
              <strong>Lytex não conectada.</strong>{" "}
              {conta.motivo === "sem_credenciais" ? "Configure as credenciais da Lytex no servidor para ver o saldo e sacar aqui." : "Não foi possível falar com a Lytex agora. Tente de novo em instantes."}
            </p>
            {painel && (
              <a href={painel} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
                Abrir painel da Lytex
              </a>
            )}
          </div>
        ) : (
          <>
            <Numeros
              itens={[
                { rotulo: "Disponível para saque", valor: formatarPreco(conta.carteira.saldoCentavos), destaque: true },
                { rotulo: "A liberar", valor: formatarPreco(conta.carteira.saldoFuturoCentavos), nota: "Saldo futuro informado pela Lytex" },
                { rotulo: "Saque mínimo", valor: formatarPreco(conta.carteira.saqueMinimoCentavos) },
                ...(conta.resumo
                  ? [
                      { rotulo: "Entradas na conta", valor: formatarPreco(conta.resumo.entradasCentavos) },
                      { rotulo: "Saídas da conta", valor: formatarPreco(conta.resumo.saidasCentavos) },
                      { rotulo: "Taxas da conta", valor: formatarPreco(conta.resumo.taxasCentavos) },
                    ]
                  : []),
              ]}
            />
            <p className="text-sm text-petroleo/80">O extrato detalhado da conta fica no painel da Lytex.</p>

            {conta.contas.length === 0 ? (
              <p className="rounded-xl bg-gelo px-4 py-3 text-sm">Nenhuma conta bancária ativa na Lytex. Cadastre uma no painel da Lytex para poder sacar.</p>
            ) : revisar && !erroRevisao && contaEscolhida && valorPedido ? (
              <form action={sacarAcao} className="flex flex-col gap-3 rounded-xl border border-petroleo/60 p-4">
                <h3 className="text-lg">Confirmar saque</h3>
                <p className="text-sm">
                  Você vai sacar <strong>{formatarPreco(valorPedido)}</strong> da conta Staypse para {contaEscolhida.banco}, ag. {contaEscolhida.agencia}, conta {contaEscolhida.conta} (titular{" "}
                  {contaEscolhida.titular}). A Lytex pode cobrar tarifa e precisa aprovar o pedido.
                </p>
                <input type="hidden" name="valor_centavos" value={valorPedido} />
                <input type="hidden" name="conta" value={contaEscolhida.id} />
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className={botaoPrimario}>
                    Confirmar saque
                  </button>
                  <Link href={`/admin/financeiro?${new URLSearchParams({ ...filtros, ...periodoParams })}`} className={botaoSecundario}>
                    Cancelar
                  </Link>
                </div>
              </form>
            ) : (
              <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                {Object.entries({ ...filtros, ...periodoParams }).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <input type="hidden" name="revisar" value="1" />
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Valor do saque (R$)
                  <input name="valor" inputMode="decimal" autoComplete="off" placeholder="0,00" defaultValue={um(sp.valor) ?? ""} className={estiloCampo} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Conta bancária
                  <select name="conta" defaultValue={um(sp.conta) ?? conta.contas[0].id} className={estiloCampo}>
                    {conta.contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.banco}, ag. {c.agencia}, conta {c.conta}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={botaoPrimario}>Solicitar saque</button>
                {erroRevisao && (
                  <p role="alert" className="text-sm sm:col-span-3">
                    {erroRevisao}
                  </p>
                )}
              </form>
            )}
            {painel && (
              <a href={painel} target="_blank" rel="noopener noreferrer" className={`${botaoSecundario} w-fit`}>
                Abrir painel da Lytex
              </a>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="titulo-receitas" className="flex flex-col gap-4">
        <h2 id="titulo-receitas" className="text-xl">
          Receitas por loja, afiliado e vendedor
        </h2>
        <nav aria-label="Receitas por" className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1 rounded-xl border border-petroleo/10 bg-branco p-1">
            {ABAS.map((a) => (
              <li key={a.chave}>
                <Link
                  href={`/admin/financeiro?${new URLSearchParams({ aba: a.chave, ...periodoParams })}`}
                  aria-current={a.chave === aba.chave ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap ${
                    a.chave === aba.chave ? "bg-petroleo text-branco" : "text-petroleo/80 hover:bg-gelo hover:text-petroleo"
                  }`}
                >
                  {a.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form method="get" role="search" className="flex flex-wrap items-end gap-3">
          {Object.entries({ aba: aba.chave, ...periodoParams }).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium sm:max-w-sm">
            Buscar pelo nome
            <input type="search" name="q" defaultValue={busca} maxLength={80} className={estiloCampo} />
          </label>
          <button className={botaoPrimario}>Buscar</button>
          <a href={csv} className={botaoSecundario}>
            Baixar CSV
          </a>
        </form>
        <TabelaDados
          legenda={`Receitas ${aba.rotulo.toLowerCase()} no período`}
          colunas={[{ titulo: "Nome", principal: true }, { titulo: "Pedidos", numero: true }, { titulo: "Vendido", numero: true }, { titulo: aba.coluna, numero: true }]}
          linhas={linhas.map((l, i) => ({
            chave: `${i}-${l.nome}`,
            celulas: [l.nome, inteiro(l.pedidos), formatarPreco(l.vendido_centavos), formatarPreco(l.valor_centavos)],
          }))}
          vazio={{ texto: busca ? "Nenhum resultado para essa busca." : aba.vazio }}
        />
        <Paginacao caminho="/admin/financeiro" pagina={pagina} total={total} filtros={{ ...filtros, ...periodoParams }} />
      </section>
    </div>
  );
}
