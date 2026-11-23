// Configurações da plataforma (tela /admin/configuracoes): leitura de números
// em português, normalização e validação. O banco valida de novo (função
// configuracao_valida): aqui o objetivo é dar mensagens claras.

import { MODALIDADES, type Modalidade } from "@/lib/pagamentos/taxas";

// campos de taxa em texto: percentual e fixo em reais ("1,5" e "2,00")
export type TaxaTexto = { pct: string; fixo: string };
export type TaxasTexto = {
  taxaTotal: Record<Modalidade, TaxaTexto>;
  custoLytex: Record<Modalidade, TaxaTexto>;
  split: { pct: string; min: string; max: string };
};

export type ConfiguracoesTexto = {
  taxas: TaxasTexto;
  comissaoMin: string;
  comissaoMax: string;
  prazoNf: string;
  palavras: string;
  pix: boolean;
  cartao: boolean;
  boleto: boolean;
};

export type ParTaxa = { percentual: number; fixo_centavos: number };

export type ValoresConfiguracao = {
  // chaves taxa_total_<modalidade>, custo_lytex_<modalidade> e custo_lytex_split, prontas para o banco
  taxas: Record<string, ParTaxa | { percentual: number; minimo_centavos: number; maximo_centavos: number }>;
  comissao_min_percentual: number;
  comissao_max_percentual: number;
  prazo_nf_dias: number;
  palavras_proibidas: string[];
  meios_pagamento: { pix: boolean; cartao: boolean; boleto: boolean };
};

// "7,5" e "7.5" viram 7.5; qualquer outra coisa vira NaN
export function numeroBr(texto: string): number {
  const t = texto.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// "2,50" (reais) vira 250 centavos; qualquer outra coisa vira NaN
export function reaisParaCentavos(texto: string): number {
  const n = numeroBr(texto);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

const duasCasas = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

function validarTaxas(t: TaxasTexto): { erro: string } | { taxas: ValoresConfiguracao["taxas"] } {
  const taxas: ValoresConfiguracao["taxas"] = {};
  const lerPar = (rotulo: string, x: TaxaTexto): { erro: string } | ParTaxa => {
    const percentual = numeroBr(x.pct);
    const fixo = reaisParaCentavos(x.fixo);
    if (!(percentual >= 0 && percentual <= 30) || !duasCasas(percentual)) return { erro: `${rotulo}: o percentual precisa estar entre 0 e 30, com até 2 casas.` };
    if (!(fixo >= 0 && fixo <= 2000)) return { erro: `${rotulo}: o valor fixo precisa estar entre R$ 0,00 e R$ 20,00.` };
    return { percentual, fixo_centavos: fixo };
  };
  for (const m of MODALIDADES) {
    const total = lerPar(`Taxa total (${m})`, t.taxaTotal[m]);
    if ("erro" in total) return total;
    const custo = lerPar(`Custo Lytex (${m})`, t.custoLytex[m]);
    if ("erro" in custo) return custo;
    if (total.percentual < custo.percentual || total.fixo_centavos < custo.fixo_centavos) {
      return { erro: `A taxa total de ${m} não pode ficar abaixo do custo da Lytex (percentual e fixo).` };
    }
    taxas[`taxa_total_${m}`] = total;
    taxas[`custo_lytex_${m}`] = custo;
  }
  const pct = numeroBr(t.split.pct);
  const min = reaisParaCentavos(t.split.min);
  const max = reaisParaCentavos(t.split.max);
  if (!(pct >= 0 && pct <= 10) || !duasCasas(pct)) return { erro: "Custo de repasse (split): o percentual precisa estar entre 0 e 10." };
  if (!(min >= 0 && min <= 1000) || !(max >= min && max <= 5000)) return { erro: "Custo de repasse (split): mínimo até R$ 10,00 e máximo entre o mínimo e R$ 50,00." };
  taxas.custo_lytex_split = { percentual: pct, minimo_centavos: min, maximo_centavos: max };
  return { taxas };
}

// uma palavra por linha (ou separadas por vírgula): minúsculas, sem repetição
export function lerPalavras(texto: string): string[] {
  const todas = texto
    .split(/[\n,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(todas)];
}

export function validarConfiguracoes(t: ConfiguracoesTexto): { erro: string } | { valores: ValoresConfiguracao } {
  const min = numeroBr(t.comissaoMin);
  const max = numeroBr(t.comissaoMax);
  const prazo = numeroBr(t.prazoNf);
  const faixa = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;

  const taxas = validarTaxas(t.taxas);
  if ("erro" in taxas) return taxas;
  if (!faixa(min)) return { erro: "A comissão mínima precisa ser um número entre 0 e 100." };
  if (!faixa(max)) return { erro: "A comissão máxima precisa ser um número entre 0 e 100." };
  if (min > max) return { erro: "A comissão mínima não pode ser maior que a máxima." };
  if (!Number.isInteger(prazo) || prazo < 1 || prazo > 60) return { erro: "O prazo da nota fiscal precisa ser de 1 a 60 dias." };

  const palavras = lerPalavras(t.palavras);
  if (palavras.length > 500) return { erro: "No máximo 500 palavras proibidas." };
  const ruim = palavras.find((p) => p.length < 2 || p.length > 60);
  if (ruim) return { erro: `Cada palavra precisa ter de 2 a 60 letras (revise "${ruim.slice(0, 30)}").` };

  if (!t.pix && !t.cartao && !t.boleto) return { erro: "Deixe pelo menos um meio de pagamento ligado." };

  return {
    valores: {
      taxas: taxas.taxas,
      comissao_min_percentual: min,
      comissao_max_percentual: max,
      prazo_nf_dias: prazo,
      palavras_proibidas: palavras,
      meios_pagamento: { pix: t.pix, cartao: t.cartao, boleto: t.boleto },
    },
  };
}
