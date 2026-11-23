// Validação da lista de espera com Zod — UM schema só, usado no navegador
// (mensagens na hora, antes de enviar) e no servidor (a validação que vale,
// pois o navegador pode ser burlado). Não importe nada "server-only" aqui.
import { z } from "zod";
import {
  NICHOS,
  PERFIS,
  TIPOS_PRODUTO,
  UFS,
  normalizarCnpj,
  normalizarWhatsapp,
} from "./lista";

const nichosValidos = NICHOS.map((n) => n.valor) as [string, ...string[]];
const tiposValidos = TIPOS_PRODUTO.map((t) => t.valor) as [string, ...string[]];
const ufsValidas = [...UFS] as [string, ...string[]];

// Texto com espaços das pontas removidos e limites com mensagem clara.
const texto = (min: number, max: number, vazio: string) =>
  z
    .string({ error: vazio })
    .trim()
    .min(min, vazio)
    .max(max, `Use no máximo ${max} caracteres.`);

const MSG_WHATSAPP = "Informe um WhatsApp com DDD. Ex.: (81) 99876-5432";

// WhatsApp obrigatório: devolve só os números (DDD + número).
const whatsappObrigatorio = z
  .string({ error: MSG_WHATSAPP })
  .trim()
  .refine((v) => normalizarWhatsapp(v) !== null, MSG_WHATSAPP)
  .transform((v) => normalizarWhatsapp(v) as string);

// WhatsApp opcional: vazio é aceito; se vier preenchido, precisa ser válido.
const whatsappOpcional = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || normalizarWhatsapp(v) !== null, MSG_WHATSAPP)
  .transform((v) => (v ? (normalizarWhatsapp(v) as string) : undefined));

// CNPJ opcional: vazio é aceito; preenchido precisa ter 14 caracteres (o banco
// confere os dígitos verificadores).
const cnpjOpcional = z
  .string()
  .optional()
  .transform((v) => normalizarCnpj(v ?? ""))
  .refine((v) => v === "" || v.length === 14, "CNPJ incompleto. Se ainda não tiver, deixe em branco.");

// Campos comuns a todos os perfis
const comuns = {
  nome: texto(2, 120, "Informe seu nome."),
  email: z
    .string({ error: "Informe um e-mail válido." })
    .trim()
    .toLowerCase()
    .max(254, "Informe um e-mail válido.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Informe um e-mail válido."),
  // LGPD: a pessoa precisa marcar; nunca vem marcado
  consentimento: z.literal("sim", {
    error: "Para entrar na lista, marque que concorda com a Política de Privacidade.",
  }),
  // código de quem indicou: se for inválido, é ignorado (nunca bloqueia)
  ref: z
    .string()
    .optional()
    .transform((v) => (v && /^[0-9a-f]{8}$/.test(v) ? v : "")),
};

export const schemaLista = z.discriminatedUnion("perfil", [
  z.object({
    perfil: z.literal("loja"),
    ...comuns,
    whatsapp: whatsappObrigatorio,
    empresa: texto(2, 200, "Informe o nome da loja, fábrica ou marca."),
    cnpj: cnpjOpcional,
    tipo_produto: z.enum(tiposValidos, { error: "Escolha se vende produto físico, digital ou os dois." }),
    o_que_vende: texto(2, 500, "Conte em poucas palavras o que você vende."),
  }),
  z.object({
    perfil: z.literal("vendedor"),
    ...comuns,
    whatsapp: whatsappOpcional,
    empresa: texto(2, 200, "Informe em qual loja você trabalha."),
  }),
  z.object({
    perfil: z.literal("afiliado"),
    ...comuns,
    whatsapp: whatsappObrigatorio,
    cidade: texto(2, 120, "Informe sua cidade."),
    uf: z.enum(ufsValidas, { error: "Escolha o estado (UF)." }),
    nichos: z
      .array(z.enum(nichosValidos), { error: "Escolha pelo menos um nicho de interesse." })
      .min(1, "Escolha pelo menos um nicho de interesse.")
      .max(10),
  }),
  z.object({
    perfil: z.literal("comprador"),
    ...comuns,
    whatsapp: whatsappOpcional,
  }),
]);

export type DadosLista = z.infer<typeof schemaLista>;

// Os campos do formulário, na ordem da tela (para focar o primeiro com erro).
export const CAMPOS_DA_LISTA = [
  "perfil", "nome", "empresa", "cnpj", "tipo_produto", "o_que_vende",
  "whatsapp", "email", "cidade", "uf", "nichos", "consentimento",
] as const;

// Lê um FormData (navegador ou servidor) num objeto simples para o schema.
// Só os campos conhecidos entram; qualquer outro é ignorado.
export function lerFormulario(formData: FormData): Record<string, unknown> {
  const bruto: Record<string, unknown> = {};
  for (const campo of CAMPOS_DA_LISTA) {
    if (campo === "nichos") {
      bruto.nichos = formData.getAll("nichos").map(String);
    } else {
      const v = formData.get(campo);
      if (typeof v === "string") bruto[campo] = v;
    }
  }
  const ref = formData.get("ref");
  if (typeof ref === "string") bruto.ref = ref;
  return bruto;
}

export type ResultadoValidacao =
  | { ok: true; dados: DadosLista }
  | { ok: false; erros: Record<string, string>; primeiro: string };

// Valida e devolve UMA mensagem por campo (a primeira de cada um).
export function validarLista(bruto: Record<string, unknown>): ResultadoValidacao {
  const perfilValido = PERFIS.some((p) => p.valor === bruto.perfil);
  if (!perfilValido) {
    const m = "Escolha o seu perfil.";
    return { ok: false, erros: { perfil: m }, primeiro: m };
  }
  const r = schemaLista.safeParse(bruto);
  if (r.success) return { ok: true, dados: r.data };

  const erros: Record<string, string> = {};
  for (const problema of r.error.issues) {
    const campo = String(problema.path[0] ?? "perfil");
    if (!erros[campo]) erros[campo] = problema.message;
  }
  // a primeira mensagem na ordem da tela
  const campoPrimeiro = CAMPOS_DA_LISTA.find((c) => erros[c]) ?? Object.keys(erros)[0];
  return { ok: false, erros, primeiro: erros[campoPrimeiro] };
}
