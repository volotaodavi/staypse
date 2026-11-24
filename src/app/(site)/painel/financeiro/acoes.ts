"use server";
// Pedido de saque da subconta Lytex de quem recebe. O servidor revalida TUDO (papel, dono, valor, conta,
// saque pendente); a tela só mostra. Registro em audit_log e aviso (notificação) a cada pedido.
import { redirect } from "next/navigation";
import { nomeDoProvedor } from "@/lib/pagamentos";
import { subcontaLytex } from "@/lib/pagamentos/lytex";
import { CUSTO_SAQUE_CENTAVOS, PedidoSaque, mensagemDeErroDoSaque, statusDoSaque } from "@/lib/pagamentos/saque-usuario";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { PAPEL_FIN, contasBancarias, integracaoPendente, meusSaques, saldoDisponivel, type PapelFin } from "./dados";

export async function pedirSaque(f: FormData) {
  const papelFin = String(f.get("papel") ?? "") as PapelFin;
  if (!Object.hasOwn(PAPEL_FIN, papelFin)) redirect("/painel");
  const cfg = PAPEL_FIN[papelFin];
  const usuario = await exigirPapel(cfg.papel);
  const volta = (msg: string, ok = false): never =>
    redirect(`/painel/financeiro?${new URLSearchParams({ papel: papelFin, [ok ? "ok" : "erro"]: msg })}`);

  const pedido = PedidoSaque.safeParse({ valorCentavos: Number(f.get("valor_centavos")), contaId: String(f.get("conta") ?? ""), chave: String(f.get("chave") ?? "") });
  if (!pedido.success) return volta("Pedido de saque inválido. Confira o valor e tente de novo.");
  const { valorCentavos, contaId, chave } = pedido.data;
  if (valorCentavos <= CUSTO_SAQUE_CENTAVOS) return volta("O valor precisa ser maior que o custo do saque.");
  if (integracaoPendente()) return volta("Integração com a Lytex pendente. O saque abre quando ela for concluída.");

  const supabase = await criarClienteServidor();
  // o dono: o recebedor APROVADO é o da própria sessão (RLS) e é dele o provedor_id usado no saque
  const { data: rec } = await supabase
    .from("recebedores")
    .select("provedor, provedor_id, status_recebedor, documento, documento_provedor")
    .eq("papel", cfg.recebedor)
    .maybeSingle();
  if (!rec || rec.status_recebedor !== "aprovado" || !rec.provedor_id || (rec.documento_provedor && rec.documento_provedor !== rec.documento)) {
    return volta("Complete o cadastro de recebimento antes de sacar.");
  }
  const provedor = nomeDoProvedor();
  if (rec.provedor !== provedor) return volta("O cadastro de recebimento é de outro ambiente de pagamentos.");

  const contas = await contasBancarias(rec.provedor_id);
  if (!contas.some((c) => c.id === contaId)) return volta("Conta bancária não encontrada na sua conta Lytex.");

  const saques = await meusSaques();
  const saldo = await saldoDisponivel(papelFin, saques);
  if (saldo !== null && valorCentavos > saldo) return volta("O valor é maior que o disponível na sua conta Lytex.");

  const admin = criarClienteAdmin();
  const { data: novo, error } = await admin
    .from("saques")
    .insert({ user_id: usuario.id, papel: cfg.recebedor, valor_centavos: valorCentavos, custo_centavos: CUSTO_SAQUE_CENTAVOS, provedor, chave_idempotencia: chave })
    .select("id")
    .single();
  if (error || !novo) {
    // 23505: o mesmo envio de novo (idempotência) ou já existe um saque pendente
    if (error?.code === "23505") {
      if (error.message.includes("chave_idempotencia") || error.message.includes("user_id_chave")) return volta("Este pedido de saque já foi enviado.", true);
      return volta("Você já tem um saque pendente. Aguarde a conclusão para pedir outro.");
    }
    return volta("Não foi possível registrar o saque agora. Nada foi sacado.");
  }

  let status: "pendente" | "concluido" | "falhou" = "falhou";
  let provedorId: string | null = null;
  let erro: string | null = null;
  try {
    if (provedor === "mock") {
      status = "concluido";
      provedorId = `mock_saque_${novo.id}`;
    } else {
      const s = await subcontaLytex.solicitarSaque(rec.provedor_id, valorCentavos, contaId);
      status = statusDoSaque(s.status);
      provedorId = s.id || null;
    }
  } catch (e) {
    erro = mensagemDeErroDoSaque(e);
  }
  await admin.from("saques").update({ status, provedor_id: provedorId, erro }).eq("id", novo.id);
  await admin.from("audit_log").insert({
    ator_id: usuario.id,
    acao: "saque_usuario",
    entidade: "usuario",
    entidade_id: usuario.id,
    detalhes: { saque_id: novo.id, papel: cfg.recebedor, valor_centavos: valorCentavos, status, provedor },
  });
  await admin.rpc("notificar", {
    p_user: usuario.id,
    p_tipo: "saque_usuario",
    p_titulo: status === "falhou" ? "Saque não concluído" : "Saque solicitado na sua conta Lytex",
    p_texto: status === "falhou" ? (erro ?? "A Lytex não aceitou o saque.") : "Acompanhe o andamento do saque no histórico da Área financeira.",
    p_link: "/painel/financeiro",
    p_chave: `saque:${novo.id}`,
  });
  return status === "falhou" ? volta(erro ?? "A Lytex não aceitou o saque.") : volta("Saque solicitado pela Lytex.", true);
}
