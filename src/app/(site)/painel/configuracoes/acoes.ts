"use server";
// Salva as configurações da própria conta: contato (nome e telefone, que já existem em
// profiles) e preferências de e-mail. Valida no servidor (Zod) e grava pela RLS: a
// pessoa só altera a PRÓPRIA linha. Depois de gravar, lê de volta para confirmar.
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { camposDoPapel, validarConfiguracoesConta } from "@/lib/preferencias-notificacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function salvarConfiguracoesConta(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirPapel();
  const nome = String(f.get("nome") ?? "");
  const telefone = String(f.get("telefone") ?? "");

  // só os campos de aviso que a pessoa vê (pelos papéis dela, vindos do banco) são lidos do formulário
  const preferencias: Record<string, boolean> = {};
  for (const c of camposDoPapel(usuario.papeis)) preferencias[c.campo] = f.get(c.campo) === "on";

  const r = validarConfiguracoesConta({ nome, telefone, preferencias });
  if ("erro" in r) return { erro: r.erro, valores: { nome, telefone } };

  const supabase = await criarClienteServidor();
  const { error: erroPerfil } = await supabase
    .from("profiles")
    .update({ nome: r.valores.nome, telefone: r.valores.telefone })
    .eq("id", usuario.id);
  if (erroPerfil) return { erro: "Não foi possível salvar seus dados de contato. Tente de novo.", valores: { nome, telefone } };

  if (Object.keys(r.valores.preferencias).length > 0) {
    const { error: erroPref } = await supabase
      .from("preferencias_notificacao")
      .upsert({ user_id: usuario.id, ...r.valores.preferencias }, { onConflict: "user_id" });
    if (erroPref) return { erro: "Seus dados foram salvos, mas não foi possível salvar os avisos por e-mail. Tente de novo.", valores: { nome, telefone } };
  }

  revalidatePath("/painel/configuracoes");
  return { sucesso: "Configurações salvas.", valores: { nome: r.valores.nome, telefone: r.valores.telefone ?? "" } };
}
