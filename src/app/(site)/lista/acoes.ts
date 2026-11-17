"use server";
// Inscrição na lista de espera (roda no servidor).
//
// Proteção contra spam:
//  1. Honeypot: campo "site" escondido. Pessoas não veem e não preenchem;
//     robôs preenchem tudo. Se vier preenchido, fingimos sucesso e não gravamos.
//  2. Limite por IP: no banco (função inscrever_na_lista), máx. 5 por hora.
//     O IP vira um hash com segredo antes de sair daqui (LGPD).
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/formulario";
import { TERMOS_VERSAO } from "@/config/empresa";
import { hashDoIp } from "@/lib/ip";
import { NICHOS, TIPOS_PRODUTO, UFS, codigoValido, normalizarCnpj, normalizarWhatsapp } from "@/lib/lista";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "").trim();

export async function inscrever(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // 1. Honeypot
  if (texto(formData, "site")) {
    return { sucesso: "Inscrição recebida. Obrigado!" };
  }

  const interesse = texto(formData, "interesse");
  const nome = texto(formData, "nome");
  const email = texto(formData, "email").toLowerCase();
  const whatsappDigitado = texto(formData, "whatsapp");
  const nichos = formData
    .getAll("nichos")
    .map(String)
    .filter((n) => NICHOS.some((x) => x.valor === n));

  // tudo o que a pessoa digitou volta para a tela em caso de erro
  const valores = {
    interesse,
    nome,
    email,
    whatsapp: whatsappDigitado,
    cidade: texto(formData, "cidade"),
    uf: texto(formData, "uf"),
    nichos: nichos.join(","),
    empresa: texto(formData, "empresa"),
    cnpj: texto(formData, "cnpj"),
    tipo_produto: texto(formData, "tipo_produto"),
    o_que_vende: texto(formData, "o_que_vende"),
  };
  const erro = (mensagem: string): EstadoFormulario => ({ erro: mensagem, valores });

  // 2. Validações com mensagens claras (o banco valida tudo de novo)
  if (interesse !== "revendedor" && interesse !== "produtor") return erro("Escolha: revender ou vender seus produtos.");
  if (nome.length < 2) return erro("Informe seu nome.");
  const whatsapp = normalizarWhatsapp(whatsappDigitado);
  if (!whatsapp) return erro("Informe um WhatsApp com DDD. Ex.: (81) 99876-5432");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro("Informe um e-mail válido.");

  let cnpj = "";
  if (interesse === "revendedor") {
    if (valores.cidade.length < 2) return erro("Informe sua cidade.");
    if (!(UFS as readonly string[]).includes(valores.uf)) return erro("Escolha o estado (UF).");
    if (nichos.length === 0) return erro("Escolha pelo menos um nicho de interesse.");
  } else {
    if (valores.empresa.length < 2) return erro("Informe o nome da empresa ou marca.");
    cnpj = normalizarCnpj(valores.cnpj);
    if (cnpj && cnpj.length !== 14) return erro("CNPJ incompleto. Se ainda não tiver, deixe em branco.");
    if (!TIPOS_PRODUTO.some((t) => t.valor === valores.tipo_produto)) return erro("Escolha se vende produto físico, digital ou os dois.");
    if (valores.o_que_vende.length < 2) return erro("Conte em poucas palavras o que você vende.");
  }

  // LGPD: consentimento não vem marcado; precisa ser marcado pela pessoa
  if (formData.get("consentimento") !== "sim") {
    return erro("Para entrar na lista, marque que concorda com a Política de Privacidade.");
  }

  const ref = texto(formData, "ref");
  const dados = {
    interesse,
    nome,
    email,
    whatsapp,
    consentimento_versao: TERMOS_VERSAO,
    ref: codigoValido(ref) ? ref : "",
    ...(interesse === "revendedor"
      ? { cidade: valores.cidade, uf: valores.uf, nichos }
      : { empresa: valores.empresa, cnpj, tipo_produto: valores.tipo_produto, o_que_vende: valores.o_que_vende }),
  };

  const supabase = criarClienteAdmin();
  const { data: codigo, error } = await supabase.rpc("inscrever_na_lista", {
    p: dados,
    p_ip_hash: await hashDoIp(),
  });

  if (error) {
    if (error.message.includes("limite_por_ip")) {
      return erro("Muitas inscrições a partir desta conexão. Tente de novo mais tarde.");
    }
    if (error.code === "23505") return erro("Este e-mail já está na lista de espera.");
    if (error.message.includes("waitlist_cnpj_check")) return erro("CNPJ inválido. Confira os números ou deixe em branco.");
    if (error.code === "23514") return erro("Confira os dados preenchidos.");
    return erro("Não foi possível concluir agora. Tente novamente em instantes.");
  }

  redirect(`/lista/${codigo}`);
}
