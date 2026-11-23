// Configurações da plataforma (tela /admin/configuracoes): leitura de números
// em português, normalização e validação. O banco valida de novo (função
// configuracao_valida): aqui o objetivo é dar mensagens claras.

export type ConfiguracoesTexto = {
  taxa: string;
  comissaoMin: string;
  comissaoMax: string;
  prazoNf: string;
  palavras: string;
  pix: boolean;
  cartao: boolean;
  boleto: boolean;
};

export type ValoresConfiguracao = {
  taxa_staypse_percentual: number;
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

// uma palavra por linha (ou separadas por vírgula): minúsculas, sem repetição
export function lerPalavras(texto: string): string[] {
  const todas = texto
    .split(/[\n,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(todas)];
}

export function validarConfiguracoes(t: ConfiguracoesTexto): { erro: string } | { valores: ValoresConfiguracao } {
  const taxa = numeroBr(t.taxa);
  const min = numeroBr(t.comissaoMin);
  const max = numeroBr(t.comissaoMax);
  const prazo = numeroBr(t.prazoNf);
  const faixa = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;

  if (!faixa(taxa)) return { erro: "A taxa da Staypse precisa ser um número entre 0 e 100." };
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
      taxa_staypse_percentual: taxa,
      comissao_min_percentual: min,
      comissao_max_percentual: max,
      prazo_nf_dias: prazo,
      palavras_proibidas: palavras,
      meios_pagamento: { pix: t.pix, cartao: t.cartao, boleto: t.boleto },
    },
  };
}
