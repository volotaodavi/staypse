"use server";
// Inscrição na lista de espera (roda no servidor).
//
// Proteção contra spam (nesta ordem):
//  1. Honeypot: campo "site" escondido. Pessoas não veem e não preenchem;
//     robôs preenchem tudo. Se vier preenchido, fingimos sucesso e não gravamos.
//  2. Tempo mínimo: o formulário leva um carimbo de hora ASSINADO pelo
//     servidor (campo "t", ver lista-tempo.ts). Envio em menos de 3 s é recusado.
//  3. Validação com Zod (mesmo schema do navegador, que aqui é o que vale).
//  4. Limite por IP: no banco (função inscrever_na_lista), máx. 5 por hora.
//     O IP vira um hash com segredo antes de sair daqui (LGPD).
//
// E-mail repetido: não cria outra inscrição e NÃO mostra a posição (quem
// digitou o e-mail de outra pessoa não descobre nada). Se o envio de e-mail
// estiver ativo, o link da posição é reenviado para o próprio e-mail.
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { TERMOS_VERSAO } from "@/config/empresa";
import { emailDaLista } from "@/lib/email-conteudo";
import { emailAtivo, enviarEmail } from "@/lib/email";
import { hashDoIp, segredoDerivado } from "@/lib/ip";
import { lerFormulario, validarLista } from "@/lib/lista-schema";
import { conferirTempo } from "@/lib/lista-tempo";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlDoSite } from "@/lib/supabase/env";

export async function inscrever(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // 1. Honeypot
  if (String(formData.get("site") ?? "").trim()) {
    return { sucesso: "Inscrição recebida. Obrigado!" };
  }

  // 2. Tempo mínimo de preenchimento (hora do servidor, assinada)
  const tempo = conferirTempo(segredoDerivado("staypse:lista-tempo:v1"), formData.get("t"));
  if (tempo === "cedo") return { erro: "Quase lá! Aguarde alguns segundos e envie de novo." };
  if (tempo !== "ok") return { erro: "A página ficou aberta por muito tempo. Atualize e preencha de novo." };

  // 3. Validação (Zod)
  const bruto = lerFormulario(formData);
  const r = validarLista(bruto);
  if (!r.ok) return { erro: r.primeiro };
  const d = r.dados;

  const dados = {
    interesse: d.perfil,
    nome: d.nome,
    email: d.email,
    whatsapp: d.whatsapp ?? "",
    consentimento_versao: TERMOS_VERSAO,
    ref: d.ref,
    ...(d.perfil === "afiliado" ? { cidade: d.cidade, uf: d.uf, nichos: d.nichos } : {}),
    ...(d.perfil === "loja"
      ? { empresa: d.empresa, cnpj: d.cnpj, tipo_produto: d.tipo_produto, o_que_vende: d.o_que_vende }
      : {}),
    ...(d.perfil === "vendedor" ? { empresa: d.empresa } : {}),
  };

  // 4. Gravação (limite por IP e duplicidade ficam no banco)
  const supabase = criarClienteAdmin();
  const { data, error } = await supabase
    .rpc("inscrever_na_lista", { p: dados, p_ip_hash: await hashDoIp() })
    .single<{ codigo: string; novo: boolean; reenviar: boolean }>();

  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("limite_por_ip")) return { erro: "Muitas inscrições a partir desta conexão. Tente de novo mais tarde." };
    if (msg.includes("waitlist_cnpj_check")) return { erro: "CNPJ inválido. Confira os números ou deixe em branco." };
    if (error?.code === "23514") return { erro: "Confira os dados preenchidos." };
    return { erro: "Não foi possível concluir agora. Tente novamente em instantes." };
  }

  const link = `${urlDoSite()}/lista/${data.codigo}`;

  if (data.novo) {
    // e-mail de confirmação (só se o Resend estiver configurado; falha não derruba a inscrição)
    await enviarEmail({ para: d.email, ...emailDaLista({ nome: d.nome, link, reenvio: false }) });
    redirect(`/lista/${data.codigo}`);
  }

  // E-mail repetido: mensagem neutra, sem posição nem dados de quem já está na lista
  const ja = "Este e-mail já está na lista de espera.";
  if (!emailAtivo()) return { sucesso: `${ja} No momento não conseguimos reenviar o link da sua posição.` };
  if (!data.reenviar) return { sucesso: `${ja} Enviamos o link da sua posição há pouco: confira a caixa de entrada e o spam.` };
  const envio = await enviarEmail({ para: d.email, ...emailDaLista({ link, reenvio: true }) });
  return {
    sucesso:
      envio === "enviado"
        ? `${ja} Enviamos o link da sua posição para ele: confira a caixa de entrada e o spam.`
        : `${ja} Não conseguimos reenviar o link agora. Tente de novo em alguns minutos.`,
  };
}
