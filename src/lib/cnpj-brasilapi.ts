// Dados públicos do CNPJ (BrasilAPI, sem chave) para pré-preencher o cadastro de recebimento.
import type { TipoEmpresa } from "./pagamentos/dados-recebedor";

type Bruto = {
  razao_social?: string; nome_fantasia?: string; cep?: string; logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; municipio?: string; uf?: string; ddd_telefone_1?: string; opcao_pelo_mei?: boolean | null;
  porte?: string; natureza_juridica?: string;
};
export type DadosCnpj = {
  razaoSocial: string; nomeFantasia: string; cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string; celular: string; tipoEmpresa: TipoEmpresa | "";
};

export function deduzirTipoEmpresa(b: Pick<Bruto, "opcao_pelo_mei" | "porte" | "natureza_juridica">): TipoEmpresa | "" {
  const nj = (b.natureza_juridica ?? "").toLowerCase();
  if (b.opcao_pelo_mei || /microempreendedor/i.test(b.porte ?? "") || nj.includes("microempreendedor")) return "mei";
  if (nj.includes("anônima") || nj.includes("anonima")) return "sa";
  if (nj.includes("unipessoal")) return "slu";
  if (nj.includes("eireli")) return "eireli";
  if (nj.includes("limitada")) return "ltda";
  if (nj.includes("individual")) return "ei";
  if (nj.includes("sociedade simples")) return "ss";
  return nj ? "others" : "";
}

export function mapearCnpj(b: Bruto): DadosCnpj {
  const fone = (b.ddd_telefone_1 ?? "").replace(/\D/g, "");
  return {
    razaoSocial: b.razao_social ?? "", nomeFantasia: b.nome_fantasia || b.razao_social || "", cep: (b.cep ?? "").replace(/\D/g, ""),
    logradouro: b.logradouro ?? "", numero: b.numero ?? "", complemento: b.complemento ?? "", bairro: b.bairro ?? "",
    cidade: b.municipio ?? "", uf: b.uf ?? "", celular: fone.length === 10 || fone.length === 11 ? fone : "",
    tipoEmpresa: deduzirTipoEmpresa(b),
  };
}
