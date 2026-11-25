// Dados que a Lytex EXIGE para criar um recebedor (subconta) e as mensagens de erro
// para quem preenche. Tudo aqui é puro (sem rede nem banco): o Lytex real e o simulador
// usam a mesma validação, assim o bug "faltou campo" não passa mais nos testes.
import type { DadosRecebedor } from "./tipos";

export const TIPOS_EMPRESA = {
  mei: "MEI",
  ei: "Empresário individual (EI)",
  ltda: "Sociedade limitada (LTDA)",
  slu: "Sociedade limitada unipessoal (SLU)",
  sa: "Sociedade anônima (SA)",
  eireli: "EIRELI",
  ss: "Sociedade simples (SS)",
  others: "Outros",
} as const;
export type TipoEmpresa = keyof typeof TIPOS_EMPRESA;

export type EnderecoLytex = { rua: string; bairro: string; cidade: string; uf: string; cep: string; numero?: string; complemento?: string };
export type DadosRecebedorLytex = DadosRecebedor & {
  celular?: string; // 10 ou 11 dígitos
  endereco?: EnderecoLytex;
  nomeFantasia?: string; // exigido para pj (fantasyName)
  tipoEmpresa?: TipoEmpresa; // companyType, exigido para pj
};

// Lança `lytex_dados_recebedor_incompletos: campo1,campo2` (mesma mensagem do Lytex real)
export function validarDadosRecebedor(dados: DadosRecebedorLytex) {
  const pj = dados.documento.replace(/\D/g, "").length > 11;
  const end = dados.endereco;
  const faltando = [
    dados.celular?.replace(/\D/g, "").length !== 10 && dados.celular?.replace(/\D/g, "").length !== 11 && "celular",
    !end?.rua && "rua",
    !end?.bairro && "bairro",
    !end?.cidade && "cidade",
    !end?.uf && "uf",
    end?.cep?.replace(/\D/g, "").length !== 8 && "cep",
    pj && !dados.tipoEmpresa && "tipoEmpresa",
  ].filter(Boolean);
  if (faltando.length) throw new Error(`lytex_dados_recebedor_incompletos: ${faltando.join(",")}`);
}

const ROTULO_CAMPO: Record<string, string> = {
  celular: "o celular", rua: "a rua", bairro: "o bairro", cidade: "a cidade", uf: "o estado", cep: "o CEP",
  tipoEmpresa: "o tipo de empresa",
};
const CAMPO_LYTEX: [RegExp, string][] = [
  [/cellphone|phone/i, "o celular"], [/cpfCnpj|cpf|cnpj|document/i, "o CPF/CNPJ"], [/zip|cep/i, "o CEP"],
  [/street/i, "a rua"], [/zone/i, "o bairro"], [/city/i, "a cidade"], [/state/i, "o estado"], [/email/i, "o e-mail"],
  [/companyType/i, "o tipo de empresa"], [/fantasyName/i, "o nome fantasia"], [/address/i, "o endereço"], [/name/i, "o nome"],
];

// Texto amigável para a tela (nunca ecoa dados pessoais) a partir do erro técnico
export function mensagemErroRecebedor(erro: unknown): string {
  const m = erro instanceof Error ? erro.message : "";
  if (m === "documento_diferente_do_cadastro") return "O CNPJ precisa ser o mesmo do cadastro da empresa.";
  const inc = /^lytex_dados_recebedor_incompletos: (.+)$/.exec(m);
  if (inc) return `Faltam dados para a Lytex: informe ${inc[1].split(",").map((c) => ROTULO_CAMPO[c] ?? c).join(", ")}.`;
  const http = /^lytex_http_(\d{3}): ?(.*)$/.exec(m);
  if (http) {
    const [, status, msg] = http;
    if (status === "409" || /already|exist|j[aá] cadastrad|duplic/i.test(msg))
      return "Este CPF/CNPJ já tem cadastro na Lytex. Fale com o suporte para vincular a conta existente.";
    if (status === "400" || status === "422") {
      const campo = CAMPO_LYTEX.find(([re]) => re.test(msg))?.[1];
      return campo ? `A Lytex não aceitou ${campo}. Confira o dado e tente de novo.` : "A Lytex não aceitou algum dado. Confira CPF/CNPJ, celular e endereço e tente de novo.";
    }
    if (status === "401" || status === "403") return "A conexão com a Lytex está sendo ajustada. Tente de novo mais tarde; já avisamos a equipe.";
    if (Number(status) >= 500) return "A Lytex está fora do ar agora. Tente de novo em alguns minutos.";
  }
  if (/abort|timeout|fetch failed/i.test(m)) return "A Lytex demorou a responder. Tente de novo em alguns minutos.";
  return "Não foi possível iniciar agora. Tente de novo; a equipe já foi avisada.";
}
