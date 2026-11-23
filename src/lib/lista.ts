// Dados e funções da lista de espera usados no navegador E no servidor.

// Os 4 perfis da lista de espera. O "valor" é o que vai para o banco
// (waitlist.interesse); o "rotulo" é o texto exato mostrado às pessoas.
// Perfis antigos do banco: revendedor → afiliado, produtor → loja (migração
// 20261202000001_lista_perfis.sql).
export const PERFIS = [
  { valor: "loja", rotulo: "Tenho loja/fábrica" },
  { valor: "vendedor", rotulo: "Trabalho em loja" },
  { valor: "afiliado", rotulo: "Quero ser afiliado" },
  { valor: "comprador", rotulo: "Quero comprar" },
] as const;

export type Perfil = (typeof PERFIS)[number]["valor"];

export const ROTULO_PERFIL: Record<string, string> = Object.fromEntries(
  PERFIS.map((p) => [p.valor, p.rotulo]),
);

// Rótulo curto da fila na página de confirmação ("fila de lojas").
export const FILA_DO_PERFIL: Record<Perfil, string> = {
  loja: "lojas e fábricas",
  vendedor: "quem trabalha em loja",
  afiliado: "afiliados",
  comprador: "compradores",
};

// Nichos do revendedor. O "valor" é o que vai para o banco (lista fechada lá
// também — ao incluir um nicho aqui, inclua na migração).
export const NICHOS = [
  { valor: "beleza", rotulo: "Beleza" },
  { valor: "moda", rotulo: "Moda" },
  { valor: "casa", rotulo: "Casa" },
  { valor: "saude_fitness", rotulo: "Saúde e fitness" },
  { valor: "infantil", rotulo: "Infantil" },
  { valor: "pets", rotulo: "Pets" },
  { valor: "tecnologia", rotulo: "Tecnologia" },
  { valor: "alimentos", rotulo: "Alimentos" },
  { valor: "cursos_digitais", rotulo: "Cursos e digitais" },
  { valor: "outros", rotulo: "Outros" },
] as const;

export const ROTULO_NICHO: Record<string, string> = Object.fromEntries(
  NICHOS.map((n) => [n.valor, n.rotulo]),
);

export const TIPOS_PRODUTO = [
  { valor: "fisico", rotulo: "Físico" },
  { valor: "digital", rotulo: "Digital" },
  { valor: "ambos", rotulo: "Os dois" },
] as const;

export const STATUS_CONTATO = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "contatado", rotulo: "Contatado" },
  { valor: "interessado", rotulo: "Interessado" },
  { valor: "aprovado", rotulo: "Aprovado" },
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

// "(81) 99876-5432" ou "+55 81 99876-5432" → "81998765432".
// Devolve null se não for um celular/fixo brasileiro válido (DDD + número).
export function normalizarWhatsapp(texto: string): string | null {
  let numeros = texto.replace(/\D/g, "");
  if ((numeros.length === 12 || numeros.length === 13) && numeros.startsWith("55")) {
    numeros = numeros.slice(2);
  }
  return /^[1-9]{2}(9\d{8}|\d{8})$/.test(numeros) ? numeros : null;
}

// "12.ABC.345/01DE-35" → "12ABC34501DE35" (o banco confere os dígitos).
export function normalizarCnpj(texto: string): string {
  return texto.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

// Link de indicação de cada inscrito.
export function linkDeIndicacao(siteUrl: string, codigo: string) {
  return `${siteUrl}/?ref=${codigo}`;
}

// Códigos são 8 caracteres hexadecimais (gerados no banco).
export function codigoValido(codigo: unknown): codigo is string {
  return typeof codigo === "string" && /^[0-9a-f]{8}$/.test(codigo);
}
