"use server";
// Saque do dinheiro PRÓPRIO da Staypse (taxa) para a conta bancária da Staypse na Lytex.
// Endpoint do spec: POST /v2/wallet/withdraw. Confirmação em duas etapas (a tela de revisão
// e este botão), valor revalidado contra o saldo ao vivo, registro no log ANTES e DEPOIS.
import { redirect } from "next/navigation";
import { contaLytex } from "@/lib/pagamentos/lytex";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { lytexConfigurada } from "./dados";
import { validarSaque } from "./saque";

const volta = (msg: string, ok = false) => redirect(`/admin/financeiro?${ok ? "ok" : "erro"}=${encodeURIComponent(msg)}`);

export async function sacarAcao(f: FormData) {
  await exigirPapel("admin");
  const valor = Number(f.get("valor_centavos"));
  const contaId = String(f.get("conta") ?? "");
  if (!lytexConfigurada() || !Number.isInteger(valor) || !contaId) return volta("Pedido de saque inválido.");

  let carteira;
  let contas;
  try {
    [carteira, contas] = await Promise.all([contaLytex.carteira(), contaLytex.contasBancarias()]);
  } catch {
    return volta("Não foi possível consultar a Lytex agora. Nada foi sacado.");
  }
  const v = validarSaque(valor, carteira.saldoCentavos, carteira.saqueMinimoCentavos);
  if (!v.ok) return volta(v.motivo);
  // só contas bancárias que a própria Lytex lista como ativas da conta da Staypse
  if (!contas.some((c) => c.id === contaId)) return volta("Conta bancária não encontrada na Lytex.");

  const supabase = await criarClienteServidor();
  // 1) registro ANTES de chamar a Lytex (se o log falhar, o saque nem começa)
  const antes = await supabase.rpc("admin_registrar_saque", { p_fase: "antes", p_valor_centavos: valor });
  if (antes.error) return volta("Não foi possível registrar o pedido. Nada foi sacado.");

  let ok = false;
  let resultado = "";
  try {
    const s = await contaLytex.solicitarSaque(valor, contaId);
    ok = true;
    resultado = `status ${s.status}`;
  } catch (e) {
    resultado = e instanceof Error ? e.message.slice(0, 150) : "erro";
  }
  // 2) registro DEPOIS + aviso aos admins
  await supabase.rpc("admin_registrar_saque", { p_fase: "depois", p_valor_centavos: valor, p_ok: ok, p_resultado: resultado });
  return ok
    ? volta("Saque solicitado à Lytex. Acompanhe a aprovação no painel da Lytex.", true)
    : volta("A Lytex não aceitou o saque. Nada foi sacado.");
}
