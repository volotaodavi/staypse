"use server";
// Denúncia pública (sem login). O servidor calcula o hash do IP e chama a
// função denunciar() do banco com a chave secreta: o banco limita 5 por hora
// por IP e ninguém escolhe o hash por conta própria.
import type { EstadoFormulario } from "@/components/formulario";
import { ALVOS_DENUNCIA, MOTIVOS_DENUNCIA, UUID } from "@/lib/denuncias";
import { hashDoIp } from "@/lib/ip";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();

export async function enviarDenuncia(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const valores = { motivo: texto(f, "motivo"), descricao: texto(f, "descricao"), email: texto(f, "email").toLowerCase() };
  const volta = (erro: string) => ({ erro, valores });
  if (texto(f, "site")) return { sucesso: "Recebido." }; // robô: descarta

  const tipo = texto(f, "tipo");
  const id = texto(f, "id");
  if (!Object.hasOwn(ALVOS_DENUNCIA, tipo) || !UUID.test(id)) return volta("Não encontramos o que você quer denunciar.");
  if (!Object.hasOwn(MOTIVOS_DENUNCIA, valores.motivo)) return volta("Escolha o motivo.");
  if (valores.descricao.length < 10) return volta("Conte um pouco mais (mínimo de 10 letras).");
  if (valores.descricao.length > 1000) return volta("Descrição longa demais (máximo de 1000 letras).");
  if (valores.email && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email) || valores.email.length > 200)) {
    return volta("Esse e-mail não parece válido. Pode deixar em branco.");
  }

  const { error } = await criarClienteAdmin().rpc("denunciar", {
    p_alvo_tipo: tipo,
    p_alvo_id: id,
    p_motivo: valores.motivo,
    p_descricao: valores.descricao,
    p_email: valores.email,
    p_ip_hash: await hashDoIp(),
  });
  if (error?.message.includes("limite_denuncias")) return volta("Você enviou várias denúncias seguidas. Tente de novo mais tarde.");
  if (error?.message.includes("alvo_inexistente")) return volta("Não encontramos o que você quer denunciar.");
  if (error) return volta("Não foi possível enviar agora. Tente de novo em instantes.");
  return { sucesso: "Denúncia recebida. Obrigado: a equipe da Staypse vai analisar." };
}
