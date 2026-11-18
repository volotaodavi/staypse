// Filtro de período dos painéis: hoje, 7 dias, 30 dias, mês atual ou personalizado.
// Os dias são os de Brasília (America/Sao_Paulo, UTC-3 o ano todo desde 2019,
// quando o horário de verão acabou). O banco recebe [início, fim) em timestamptz.

export type ChavePeriodo = "hoje" | "7d" | "30d" | "mes" | "personalizado";

export type Periodo = {
  chave: ChavePeriodo;
  de: string; // AAAA-MM-DD (primeiro dia, incluído)
  ate: string; // AAAA-MM-DD (último dia, incluído)
  inicio: string; // ISO, para o banco
  fim: string; // ISO, exclusivo
  rotulo: string;
};

export const OPCOES_PERIODO: [ChavePeriodo, string][] = [
  ["hoje", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["mes", "Mês atual"],
  ["personalizado", "Personalizado"],
];

const MAX_DIAS = 366;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

// "hoje" em Brasília, como AAAA-MM-DD
export function hojeBrasil(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const inicioDoDia = (dia: string) => new Date(`${dia}T00:00:00-03:00`).toISOString();
const valido = (dia: string | undefined) => Boolean(dia && DIA.test(dia) && !Number.isNaN(Date.parse(`${dia}T00:00:00Z`)));
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function formatarDia(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

// Lê ?periodo=7d (ou ?periodo=personalizado&de=...&ate=...). Padrão: 30 dias.
export function lerPeriodo(
  sp: Record<string, string | string[] | undefined>,
  padrao: ChavePeriodo = "30d",
  agora = new Date(),
): Periodo {
  const hoje = hojeBrasil(agora);
  const pedido = um(sp.periodo) as ChavePeriodo | undefined;
  const chave: ChavePeriodo = OPCOES_PERIODO.some(([k]) => k === pedido) ? pedido! : padrao;
  let de = hoje;
  let ate = hoje;
  if (chave === "7d") de = somarDias(hoje, -6);
  if (chave === "30d") de = somarDias(hoje, -29);
  if (chave === "mes") de = `${hoje.slice(0, 7)}-01`;
  if (chave === "personalizado") {
    const d = um(sp.de);
    const a = um(sp.ate);
    if (valido(d) && valido(a) && d! <= a!) {
      de = d!;
      // no máximo um ano por consulta (o painel continua rápido)
      ate = a! > somarDias(d!, MAX_DIAS - 1) ? somarDias(d!, MAX_DIAS - 1) : a!;
    } else {
      de = somarDias(hoje, -29);
    }
  }
  const nome = OPCOES_PERIODO.find(([k]) => k === chave)![1];
  const rotulo =
    chave === "hoje"
      ? `Hoje (${formatarDia(hoje)})`
      : chave === "personalizado"
        ? `${formatarDia(de)} a ${formatarDia(ate)}`
        : `${nome}: ${formatarDia(de)} a ${formatarDia(ate)}`;
  return { chave, de, ate, inicio: inicioDoDia(de), fim: inicioDoDia(somarDias(ate, 1)), rotulo };
}

// Mesma consulta, outro período (para os links do filtro e do CSV)
export function parametrosPeriodo(p: Periodo): Record<string, string> {
  return p.chave === "personalizado" ? { periodo: p.chave, de: p.de, ate: p.ate } : { periodo: p.chave };
}

// "18/11" para o eixo do gráfico
export function diaCurto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}
