// Leitura dos dados do produtor logado (com a sessão dele: a RLS só devolve
// o que é dele). Usado pelo painel e pelo cadastro em passos.
import { CONTRATO_PRODUTOR_VERSAO } from "@/config/empresa";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Produtor = {
  id: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual: string | null;
  whatsapp: string | null;
  email_contato: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  status_verificacao: string;
  motivo_rejeicao: string | null;
};

export async function meuProdutor(userId: string) {
  const supabase = await criarClienteServidor();
  const [{ data: produtor }, { data: aceite }] = await Promise.all([
    supabase
      .from("producers")
      .select(
        "id, razao_social, cnpj, inscricao_estadual, whatsapp, email_contato, cep, logradouro, numero, complemento, bairro, cidade, uf, status_verificacao, motivo_rejeicao",
      )
      .eq("user_id", userId)
      .maybeSingle<Produtor>(),
    // o contrato precisa ter sido aceito NA VERSÃO ATUAL
    supabase
      .from("terms_acceptances")
      .select("aceito_em")
      .eq("user_id", userId)
      .eq("documento", "termos_produtor")
      .eq("versao", CONTRATO_PRODUTOR_VERSAO)
      .limit(1)
      .maybeSingle(),
  ]);
  return { produtor, contratoAceito: Boolean(aceite) };
}

// Pode editar o cadastro? Só em rascunho ou depois de recusado.
export const cadastroEditavel = (status?: string) => !status || status === "rascunho" || status === "recusado";
