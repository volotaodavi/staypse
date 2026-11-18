// Situação do cadastro de recebimento (Lytex): só o STATUS e o motivo. Os
// documentos e os dados bancários são informados direto na Lytex.
import { completarRecebimento } from "@/app/(site)/painel/recebimento/acoes";
import { dataHora } from "@/lib/pedidos";
import { ROTULO_STATUS_RECEBEDOR, type MeuRecebedor } from "@/lib/pagamentos/recebedores";
import type { PapelRecebedor } from "@/lib/pagamentos/tipos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const EXPLICA: Record<PapelRecebedor, string> = {
  produtor: "Para publicar produtos e receber as vendas, a loja precisa de um cadastro de recebimento aprovado na Lytex.",
  afiliado: "Para se afiliar a produtos e receber comissões, você precisa de um cadastro de recebimento aprovado na Lytex.",
  vendedor: "Vendedores com comissão em \"split direto\" recebem pela Lytex e precisam de cadastro de recebimento aprovado.",
};

export async function meuRecebedor(papel: PapelRecebedor): Promise<MeuRecebedor | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("recebedores")
    .select("papel, status_recebedor, motivo, documento, documento_provedor, provedor, provedor_id, atualizado_em")
    .eq("papel", papel)
    .maybeSingle();
  return (data as MeuRecebedor | null) ?? null;
}

export function recebedorOk(r: MeuRecebedor | null) {
  return r?.status_recebedor === "aprovado" && (!r.documento_provedor || r.documento_provedor === r.documento);
}

export async function Recebimento({ papel, documentoSugerido, aviso }: { papel: PapelRecebedor; documentoSugerido?: string | null; aviso?: string }) {
  const r = await meuRecebedor(papel);
  const status = r?.status_recebedor ?? "nao_iniciado";
  const divergente = Boolean(r?.documento_provedor && r.documento_provedor !== r.documento);
  const cor =
    status === "aprovado" && !divergente
      ? "bg-ciano/25"
      : status === "recusado" || status === "suspenso" || divergente
        ? "bg-red-50 text-red-800"
        : "bg-amber-50 text-amber-900";

  return (
    <section aria-labelledby="t-receb" className="flex flex-col gap-3 rounded-2xl bg-branco p-5" data-recebimento={status}>
      <h2 id="t-receb" className="text-base font-medium">
        Cadastro de recebimento
      </h2>
      <p className="text-sm text-petroleo/80">{aviso ?? EXPLICA[papel]}</p>
      <p className={`rounded-xl px-4 py-3 text-sm ${cor}`} data-status-recebedor={status}>
        Situação: <strong className="font-medium">{ROTULO_STATUS_RECEBEDOR[status]}</strong>
        {r?.motivo && <span className="block">Motivo informado pela Lytex: {r.motivo}</span>}
        {divergente && <span className="block">O CPF/CNPJ do recebedor na Lytex é diferente do cadastro na Staypse. Corrija para liberar.</span>}
        {r && <span className="block text-xs opacity-80">Atualizado em {dataHora(r.atualizado_em)}</span>}
      </p>
      {(status !== "aprovado" || divergente) && status !== "em_analise" && (
        <form action={completarRecebimento} className="flex flex-col gap-2 text-sm">
          <input type="hidden" name="papel" value={papel} />
          {papel !== "produtor" && (
            <label className="flex flex-col gap-1 font-medium">
              CPF ou CNPJ de quem recebe
              <input
                name="documento"
                inputMode="numeric"
                required
                maxLength={18}
                defaultValue={documentoSugerido ?? r?.documento ?? ""}
                className="min-h-11 rounded-xl border border-petroleo/60 bg-branco px-3 text-base font-normal"
              />
            </label>
          )}
          <button className="inline-flex min-h-11 w-fit items-center rounded-full bg-petroleo px-5 font-medium text-branco">
            {status === "nao_iniciado" ? "Completar cadastro de recebimento" : "Refazer cadastro de recebimento"}
          </button>
        </form>
      )}
      {status === "em_analise" && (
        <p className="text-sm text-petroleo/80">A Lytex está analisando. Você recebe o resultado aqui, sem precisar fazer nada.</p>
      )}
      <p className="text-xs text-petroleo/75">
        A Staypse não pede nem guarda documentos de identidade ou dados bancários: tudo isso é informado direto na Lytex.
        Pagamentos processados pela Lytex.
      </p>
    </section>
  );
}
