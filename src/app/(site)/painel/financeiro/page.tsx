// Área financeira de quem recebe: loja, afiliado e vendedor (conforme a forma que a loja definiu).
// O dinheiro de cada um fica na SUBCONTA LYTEX dele (split direto); a Staypse nunca recebe nem guarda.
// Aqui: resumo do período, saldo e conta na Lytex, pedido de saque (2 etapas), histórico e extrato.
import Link from "next/link";
import { connection } from "next/server";
import { randomUUID } from "node:crypto";
import { FiltroPeriodo } from "@/components/painel/FiltroPeriodo";
import { NotaPagamentos, Numeros } from "@/components/painel/Numeros";
import { Recebimento, meuRecebedor, recebedorOk } from "@/components/painel/Recebimento";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { TabelaVendas } from "@/components/painel/TabelaVendas";
import { CUSTO_SAQUE_CENTAVOS, reaisParaCentavos } from "@/lib/pagamentos/saque-usuario";
import { exigirAlgumPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { lerPeriodo, parametrosPeriodo } from "@/lib/periodo";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { lerComissoes } from "../afiliado/consulta";
import { pedirSaque } from "./acoes";
import { PAPEL_FIN, contasBancarias, extrato, integracaoPendente, meusSaques, resumir, saldoDisponivel, type PapelFin } from "./dados";

export const metadata = { title: "Financeiro" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const estiloCampo = "min-h-11 w-full rounded-xl border border-petroleo/60 bg-branco px-3 text-base";
const botaoPrimario = "inline-flex min-h-11 items-center justify-center rounded-full bg-petroleo px-6 font-medium text-branco";
const botaoSecundario = "inline-flex min-h-11 items-center justify-center rounded-full border border-petroleo/60 px-6 font-medium text-petroleo";
const ROTULO_SAQUE: Record<string, string> = { pendente: "Pendente", concluido: "Concluído", falhou: "Falhou" };
const SITUACAO: Record<string, string> = { a_receber: "A receber (prazo de 7 dias)", repassada: "Repassada pelo split", estornada: "Estornada" };

export default async function Financeiro({ searchParams }: PageProps<"/painel/financeiro">) {
  await connection();
  const sp = await searchParams;
  const usuario = await exigirAlgumPapel(["produtor", "revendedor", "vendedor_proprio"]);
  const meus = (Object.keys(PAPEL_FIN) as PapelFin[]).filter((k) => usuario.papeis.includes(PAPEL_FIN[k].papel));
  const pedido = um(sp.papel) as PapelFin | undefined;
  const papel = pedido && meus.includes(pedido) ? pedido : meus[0];
  const cfg = PAPEL_FIN[papel];
  const periodo = lerPeriodo(sp, "30d");
  const supabase = await criarClienteServidor();

  // vendedor: a forma de cada loja manda (folha = a loja paga com o salário; split_direto = recebe como o afiliado)
  let temSplit = papel !== "vendedor";
  let temFolha = false;
  if (papel === "vendedor") {
    const { data } = await supabase.rpc("meus_vinculos_de_vendedor");
    const ativos = ((data ?? []) as { forma_pagamento: string; status: string }[]).filter((v) => v.status === "ativo");
    temSplit = ativos.some((v) => v.forma_pagamento === "split_direto");
    temFolha = ativos.some((v) => v.forma_pagamento === "folha");
  }

  const abas = meus.length > 1 && (
    <nav aria-label="Área financeira de" className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-xl border border-petroleo/10 bg-branco p-1">
        {meus.map((k) => (
          <li key={k}>
            <Link
              href={`/painel/financeiro?${new URLSearchParams({ papel: k, ...parametrosPeriodo(periodo) })}`}
              aria-current={k === papel ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap ${k === papel ? "bg-petroleo text-branco" : "text-petroleo/80 hover:bg-gelo"}`}
            >
              {PAPEL_FIN[k].rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  const cabecalho = (
    <>
      <h1 className="text-3xl">Financeiro</h1>
      {abas}
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
    </>
  );

  // vendedor na folha, sem split: só a mensagem e o relatório das comissões (sem saque)
  if (!temSplit) {
    const vendas = temFolha ? await lerComissoes("vendedor", periodo) : [];
    return (
      <div className="flex flex-col gap-5">
        {cabecalho}
        <p className="rounded-2xl bg-branco p-5" data-financeiro="folha">
          {temFolha ? "Sua comissão é paga pela loja junto com o salário." : "Você ainda não tem vínculo ativo com uma loja."}
        </p>
        {temFolha && (
          <>
            <FiltroPeriodo periodo={periodo} caminho="/painel/financeiro" extras={{ papel }} />
            <TabelaVendas vendas={vendas} periodo={periodo} papel="vendedor" vazio={{ texto: "Nenhuma comissão neste período." }} />
          </>
        )}
      </div>
    );
  }

  const [linhas, recebedor, saques] = await Promise.all([extrato(papel, periodo), meuRecebedor(cfg.recebedor), meusSaques()]);
  const r = resumir(linhas);
  const aprovado = recebedorOk(recebedor);
  const pendente = integracaoPendente();
  const [saldo, contas] = aprovado && !pendente && recebedor?.provedor_id ? await Promise.all([saldoDisponivel(papel, saques), contasBancarias(recebedor.provedor_id)]) : [null, []];
  const temPendente = saques.some((s) => s.status === "pendente");
  const extras = { papel, ...parametrosPeriodo(periodo) };
  const csv = `/painel/financeiro/csv?${new URLSearchParams(extras)}`;

  // 1ª etapa do saque: revisão (valor e conta); a 2ª é o botão de confirmar
  const revisar = um(sp.revisar) === "1";
  const valor = reaisParaCentavos(um(sp.valor) ?? "");
  const conta = contas.find((c) => c.id === um(sp.conta));
  const erroRevisao = !revisar
    ? null
    : !valor
      ? "Informe um valor em reais, por exemplo 150,00."
      : valor <= CUSTO_SAQUE_CENTAVOS
        ? "O valor precisa ser maior que o custo do saque."
        : saldo !== null && valor > saldo
          ? "O valor é maior que o disponível na sua conta Lytex."
          : !conta
            ? "Escolha a conta bancária."
            : null;
  const chave = revisar && !erroRevisao ? randomUUID() : "";

  return (
    <div className="flex flex-col gap-5">
      {cabecalho}
      <p className="max-w-prose text-sm text-petroleo/80">
        {cfg.ganho} caem direto na sua conta Lytex pelo split, sem passar pela Staypse. Aqui você acompanha e solicita o saque pela Lytex.
      </p>

      {pendente && (
        <p className="rounded-xl bg-gelo px-4 py-3 text-sm" data-financeiro="integracao-pendente">
          <strong>Integração com a Lytex pendente.</strong> Assim que ela for concluída, o saldo e o saque aparecem aqui.
        </p>
      )}

      <FiltroPeriodo periodo={periodo} caminho="/painel/financeiro" extras={{ papel }} />
      <Numeros
        itens={[
          { rotulo: papel === "loja" ? "Vendas no período" : "Comissões no período", valor: formatarPreco(papel === "loja" ? r.vendido : r.recebe + r.taxa), nota: `${r.vendas} ${r.vendas === 1 ? "pedido" : "pedidos"}`, destaque: true },
          { rotulo: "Taxa da plataforma", valor: formatarPreco(r.taxa) },
          { rotulo: "Você recebe", valor: formatarPreco(r.recebe) },
          { rotulo: "A receber", valor: formatarPreco(r.aReceber), nota: "Liberado após o prazo de 7 dias" },
          { rotulo: "Repassado pelo split", valor: formatarPreco(r.repassado) },
          { rotulo: "Estornado", valor: formatarPreco(r.estornado), nota: "Desistências, reembolsos e chargebacks" },
        ]}
      />
      <NotaPagamentos />

      {!aprovado ? (
        <Recebimento papel={cfg.recebedor} aviso="Complete o cadastro de recebimento para ter a conta Lytex que recebe o split e permite sacar." />
      ) : (
        <section aria-labelledby="t-conta" className="flex flex-col gap-4 rounded-2xl border border-petroleo/10 bg-branco p-4 lg:p-5">
          <h2 id="t-conta" className="text-xl">
            Sua conta Lytex
          </h2>
          <Numeros
            itens={[
              saldo !== null
                ? { rotulo: "Saldo disponível na sua conta Lytex", valor: formatarPreco(saldo), destaque: true }
                : { rotulo: "Saldo disponível na sua conta Lytex", valor: "Consulte no painel da Lytex", destaque: true },
            ]}
          />
          {contas.length === 0 ? (
            <p className="rounded-xl bg-gelo px-4 py-3 text-sm">
              {pendente ? "Conta bancária indisponível até a integração com a Lytex." : "Nenhuma conta bancária ativa na sua conta Lytex. Cadastre uma no painel da Lytex para sacar."}
            </p>
          ) : (
            <>
              <p className="text-sm" data-conta-mascarada>
                Conta bancária na Lytex: {contas.map((c) => `${c.banco}, ag. final ${c.agenciaFinal}, conta final ${c.contaFinal}`).join(" | ")}
              </p>
              {temPendente ? (
                <p className="rounded-xl bg-gelo px-4 py-3 text-sm">Você tem um saque pendente. Aguarde a conclusão para pedir outro.</p>
              ) : revisar && !erroRevisao && valor && conta ? (
                <form action={pedirSaque} className="flex flex-col gap-3 rounded-xl border border-petroleo/60 p-4">
                  <h3 className="text-lg">Confirmar saque</h3>
                  <p className="text-sm">
                    Você vai sacar <strong>{formatarPreco(valor)}</strong> da sua conta Lytex para {conta.banco} (ag. final {conta.agenciaFinal}, conta final {conta.contaFinal}). Custo do
                    saque: <strong>{formatarPreco(CUSTO_SAQUE_CENTAVOS)}</strong>, repassado a você. A Lytex pode precisar aprovar o pedido.
                  </p>
                  <input type="hidden" name="papel" value={papel} />
                  <input type="hidden" name="valor_centavos" value={valor} />
                  <input type="hidden" name="conta" value={conta.id} />
                  <input type="hidden" name="chave" value={chave} />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className={botaoPrimario}>
                      Confirmar saque
                    </button>
                    <Link href={`/painel/financeiro?${new URLSearchParams(extras)}`} className={botaoSecundario}>
                      Cancelar
                    </Link>
                  </div>
                </form>
              ) : (
                <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  {Object.entries(extras).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                  <input type="hidden" name="revisar" value="1" />
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Valor do saque (R$)
                    <input name="valor" inputMode="decimal" autoComplete="off" placeholder="0,00" defaultValue={um(sp.valor) ?? ""} className={estiloCampo} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Conta bancária
                    <select name="conta" defaultValue={um(sp.conta) ?? contas[0].id} className={estiloCampo}>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.banco}, ag. final {c.agenciaFinal}, conta final {c.contaFinal}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className={botaoPrimario}>Solicitar saque pela Lytex</button>
                  <p className="text-sm text-petroleo/80 sm:col-span-3">Custo do saque: {formatarPreco(CUSTO_SAQUE_CENTAVOS)} (cobrado pela Lytex e repassado a você).</p>
                  {erroRevisao && (
                    <p role="alert" className="text-sm sm:col-span-3">
                      {erroRevisao}
                    </p>
                  )}
                </form>
              )}
            </>
          )}
        </section>
      )}

      <section aria-labelledby="t-saques" className="flex flex-col gap-3">
        <h2 id="t-saques" className="text-xl">
          Histórico de saques
        </h2>
        <TabelaDados
          legenda="Saques solicitados pela Lytex"
          colunas={[{ titulo: "Data", principal: true }, { titulo: "Valor", numero: true }, { titulo: "Custo", numero: true }, { titulo: "Situação" }, { titulo: "Código na Lytex" }]}
          linhas={saques.map((s) => ({
            chave: s.id,
            celulas: [dataHora(s.criado_em), formatarPreco(s.valor_centavos), formatarPreco(s.custo_centavos), ROTULO_SAQUE[s.status] ?? s.status, s.provedor_id ?? "-"],
          }))}
          vazio={{ texto: "Nenhum saque solicitado ainda." }}
        />
      </section>

      <section aria-labelledby="t-extrato" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="t-extrato" className="text-xl">
            Extrato do período
          </h2>
          <a href={csv} className={botaoSecundario}>
            Baixar CSV
          </a>
        </div>
        <TabelaDados
          legenda="Pedidos do período com taxa e valor recebido"
          colunas={[{ titulo: "Pedido", principal: true }, { titulo: "Situação" }, { titulo: "Vendido", numero: true }, { titulo: "Taxa", numero: true }, { titulo: "Você recebe", numero: true }]}
          linhas={linhas.map((l) => ({
            chave: l.pedido_id,
            celulas: [l.codigo, SITUACAO[l.situacao] ?? l.situacao, formatarPreco(l.vendido_centavos), formatarPreco(l.taxa_centavos), formatarPreco(l.recebe_centavos)],
          }))}
          vazio={{ texto: "Nenhuma venda neste período." }}
        />
      </section>
    </div>
  );
}
