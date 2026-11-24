// Entrega própria no detalhe do pedido da loja: entregador, janela e andamento.
// Dados do entregador e da entrega: só a loja e o comprador do pedido veem (LGPD).
import Link from "next/link";
import { ROTULO_STATUS_ENTREGA } from "@/lib/entrega-propria";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { atribuirEntrega, atualizarEntrega } from "../acoes";

const campo = "w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base font-normal";
const botao = "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium";

type Entrega = {
  entregador_id: string | null; entregador_nome: string; entregador_telefone: string | null; mostrar_telefone: boolean;
  janela_inicio: string | null; janela_fim: string | null; status: string; saiu_em: string | null; entregue_em: string | null;
};

// ISO -> valor de <input type="datetime-local"> em Brasília
const local = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 16) : "";

export async function EntregaPropria({ pedidoId, codigo, produtorId, zona, prazo }: { pedidoId: string; codigo: string; produtorId: string; zona: string | null; prazo: string | null }) {
  const supabase = await criarClienteServidor();
  const [{ data: e }, { data: entregadores }] = await Promise.all([
    supabase
      .from("entregas_proprias")
      .select("entregador_id, entregador_nome, entregador_telefone, mostrar_telefone, janela_inicio, janela_fim, status, saiu_em, entregue_em")
      .eq("order_id", pedidoId)
      .maybeSingle<Entrega>(),
    supabase.from("entregadores").select("id, nome").eq("producer_id", produtorId).eq("ativo", true).order("nome"),
  ]);
  const concluida = e?.status === "entregue";

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-branco p-5 text-sm" aria-labelledby="t-propria">
      <h2 id="t-propria" className="text-base font-medium">
        Entrega própria
      </h2>
      <p className="text-petroleo/80">
        Zona {zona}. {prazo}.
      </p>
      <p data-status-entrega-propria>
        Status: <strong>{ROTULO_STATUS_ENTREGA[e?.status ?? "preparando"]}</strong>
        {e?.saiu_em && ` · saiu em ${dataHora(e.saiu_em)}`}
        {e?.entregue_em && ` · entregue em ${dataHora(e.entregue_em)}`}
      </p>
      {!concluida && (
        <form action={atribuirEntrega} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="pedido" value={pedidoId} />
          <input type="hidden" name="codigo" value={codigo} />
          {(entregadores?.length ?? 0) > 0 && (
            <label className="flex flex-col gap-1 font-medium sm:col-span-2">
              Entregador cadastrado
              <select name="entregador" defaultValue={e?.entregador_id ?? ""} className={campo}>
                <option value="">Outro (preencha nome e telefone)</option>
                {entregadores?.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 font-medium">
            Nome do entregador
            <input name="nome" maxLength={80} defaultValue={e?.entregador_nome ?? ""} className={campo} />
          </label>
          <label className="flex flex-col gap-1 font-medium">
            Telefone (DDD + número)
            <input name="telefone" type="tel" inputMode="tel" maxLength={16} defaultValue={e?.entregador_telefone ?? ""} className={campo} />
          </label>
          <label className="flex flex-col gap-1 font-medium">
            Entrega estimada a partir de
            <input name="inicio" type="datetime-local" defaultValue={local(e?.janela_inicio ?? null)} className={campo} />
          </label>
          <label className="flex flex-col gap-1 font-medium">
            até
            <input name="fim" type="datetime-local" defaultValue={local(e?.janela_fim ?? null)} className={campo} />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium sm:col-span-2">
            <input type="checkbox" name="mostrar_telefone" value="sim" defaultChecked={e?.mostrar_telefone} className="h-5 w-5 accent-petroleo" />
            Mostrar o telefone do entregador ao comprador
          </label>
          <div className="sm:col-span-2">
            <button className={`${botao} bg-petroleo text-branco`}>{e ? "Atualizar entregador e horário" : "Atribuir entregador"}</button>
          </div>
        </form>
      )}
      {e && !concluida && (
        <form action={atualizarEntrega} className="flex flex-wrap gap-2">
          <input type="hidden" name="pedido" value={pedidoId} />
          <input type="hidden" name="codigo" value={codigo} />
          {e.status === "preparando" && (
            <button name="status" value="saiu" className={`${botao} bg-ciano text-petroleo`}>
              Saiu para entrega
            </button>
          )}
          {e.status === "saiu" && (
            <button name="status" value="entregue" className={`${botao} bg-ciano text-petroleo`}>
              Entregue ao comprador
            </button>
          )}
        </form>
      )}
      <p className="text-xs text-petroleo/75">
        O comprador vê o nome do entregador, o horário estimado e o status. Cadastre entregadores em{" "}
        <Link href="/painel/produtor/frete/entrega-propria" className="underline">
          Entrega própria
        </Link>
        .
      </p>
    </section>
  );
}
