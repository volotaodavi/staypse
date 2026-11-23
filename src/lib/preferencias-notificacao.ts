// Configurações da conta (/painel/configuracoes): validação do contato e das
// preferências de e-mail. Só dados e regras, sem React: o servidor valida com
// isto e o banco valida de novo (checks da tabela profiles e booleanos NOT NULL).
// LGPD (minimização): só mexemos em campos que JÁ existem em profiles (nome, telefone).
import { z } from "zod";
import type { Papel } from "@/lib/papeis";

// ---------- preferências de e-mail ----------

export type CampoEmail = "email_venda" | "email_recebedor" | "email_estorno";

export const CAMPOS_EMAIL: { campo: CampoEmail; rotulo: string; descricao: string; papeis: Papel[] }[] = [
  {
    campo: "email_venda",
    rotulo: "Venda nova",
    descricao: "Um e-mail quando um pedido da sua loja for pago.",
    papeis: ["produtor"],
  },
  {
    campo: "email_estorno",
    rotulo: "Comissão estornada",
    descricao: "Um e-mail quando uma compra indicada por você for desfeita (desistência, reembolso ou contestação).",
    papeis: ["revendedor", "vendedor_proprio"],
  },
  {
    campo: "email_recebedor",
    rotulo: "Cadastro de recebimento recusado ou suspenso",
    descricao: "Um e-mail com o motivo, para você corrigir o cadastro.",
    papeis: ["produtor", "revendedor", "vendedor_proprio"],
  },
];

// os campos que fazem sentido para os papéis da pessoa (admin só recebe avisos no app)
export function camposDoPapel(papeis: Papel[]) {
  return CAMPOS_EMAIL.filter((c) => c.papeis.some((p) => papeis.includes(p)));
}

export const preferenciasSchema = z
  .object({ email_venda: z.boolean(), email_recebedor: z.boolean(), email_estorno: z.boolean() })
  .strict();
export type Preferencias = z.infer<typeof preferenciasSchema>;

export const PREFERENCIAS_PADRAO: Preferencias = { email_venda: true, email_recebedor: true, email_estorno: true };

// ---------- contato (campos que já existem em profiles) ----------

// telefone: só dígitos com DDD (10 ou 11), sem 0 inicial; aceita "+55", espaços, parênteses e traço.
// Mesma regra do banco: ^[1-9]{2}9?[0-9]{8}$
export function normalizarTelefone(bruto: string): string {
  let d = bruto.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d;
}

export const contatoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome (pelo menos 2 letras).")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
  // vazio = sem telefone
  telefone: z
    .string()
    .transform(normalizarTelefone)
    .refine((t) => t === "" || /^[1-9]{2}9?[0-9]{8}$/.test(t), "Telefone inválido. Use o DDD e o número, por exemplo (11) 91234-5678."),
});

export type ConfiguracoesConta = { nome: string; telefone: string | null; preferencias: Partial<Preferencias> };

export type EntradaConta = { nome: unknown; telefone: unknown; preferencias: Record<string, unknown> };

// Valida tudo de uma vez. "preferencias" só leva os campos exibidos para a pessoa;
// os outros ficam como estão (a ação mescla com o que já está salvo).
export function validarConfiguracoesConta(entrada: EntradaConta): { erro: string } | { valores: ConfiguracoesConta } {
  const contato = contatoSchema.safeParse({ nome: entrada.nome ?? "", telefone: entrada.telefone ?? "" });
  if (!contato.success) return { erro: contato.error.issues[0]?.message ?? "Confira os dados." };
  const prefs = preferenciasSchema.partial().safeParse(entrada.preferencias);
  if (!prefs.success) return { erro: "Preferências inválidas. Recarregue a página e tente de novo." };
  return {
    valores: { nome: contato.data.nome, telefone: contato.data.telefone || null, preferencias: prefs.data },
  };
}
