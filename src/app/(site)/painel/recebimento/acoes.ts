"use server";
// "Completar cadastro de recebimento": cria o recebedor no provedor (Lytex ou
// simulador) e leva a pessoa para o onboarding. A Staypse não pede documentos
// nem dados bancários: só confere que o CPF/CNPJ é o mesmo do cadastro.
import { redirect } from "next/navigation";
import { z } from "zod";
import { TIPOS_EMPRESA, mensagemErroRecebedor } from "@/lib/pagamentos/dados-recebedor";
import { registrarErroApp } from "@/lib/erros-app";
import { iniciarRecebedor } from "@/lib/pagamentos/recebedores";
import { IntegracaoPendente, type PapelRecebedor } from "@/lib/pagamentos/tipos";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const VOLTA: Record<PapelRecebedor, string> = {
  produtor: "/painel/loja/recebimentos",
  afiliado: "/painel/afiliado/recebimentos",
  vendedor: "/painel/vendedor",
};
const PAPEL_EXIGIDO = { produtor: "produtor", afiliado: "revendedor", vendedor: "vendedor_proprio" } as const;

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const texto = (msg: string, max: number) => z.string().trim().min(2, msg).max(max, msg);
const esquemaDados = z.object({
  celular: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^[1-9]{2}9?\d{8}$/, "Informe o celular com DDD, por exemplo (11) 91234-5678.")),
  cep: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().length(8, "Informe o CEP com 8 números.")),
  logradouro: texto("Informe a rua.", 200),
  numero: z.string().trim().min(1, "Informe o número do endereço (ou S/N).").max(20, "Número do endereço muito longo."),
  complemento: z.string().trim().max(100, "Complemento muito longo.").optional().transform((v) => v || undefined),
  bairro: texto("Informe o bairro.", 100),
  cidade: texto("Informe a cidade.", 120),
  uf: z.string().trim().toUpperCase().refine((v) => UFS.includes(v), "Informe o estado (UF) do endereço."),
  tipoEmpresa: z.enum(Object.keys(TIPOS_EMPRESA) as [keyof typeof TIPOS_EMPRESA, ...(keyof typeof TIPOS_EMPRESA)[]], "Escolha um tipo de empresa válido.").optional(),
});

export async function completarRecebimento(f: FormData) {
  const papel = String(f.get("papel") ?? "") as PapelRecebedor;
  if (!Object.hasOwn(VOLTA, papel)) redirect("/painel");
  const usuario = await exigirPapel(PAPEL_EXIGIDO[papel]);
  const volta = VOLTA[papel];
  const erro = (msg: string): never => redirect(`${volta}?${new URLSearchParams({ erro: msg }).toString()}`);

  const supabase = await criarClienteServidor();
  let documento = String(f.get("documento") ?? "").replace(/\W/g, "").toUpperCase();
  let nome = usuario.nome;
  let nomeFantasia: string | undefined;
  if (papel === "produtor") {
    const { data: p } = await supabase.from("producers").select("cnpj, razao_social, loja_nome").eq("user_id", usuario.id).maybeSingle();
    if (!p) erro("Cadastre a empresa antes do recebimento.");
    documento = p!.cnpj;
    nome = p!.razao_social;
    nomeFantasia = p!.loja_nome ?? p!.razao_social;
  } else if (documento.length !== 11 && documento.length !== 14) {
    erro("Informe o CPF ou o CNPJ de quem vai receber (o mesmo que será usado na Lytex).");
  }

  // Celular, endereço e tipo de empresa só vão para a Lytex: a Staypse não guarda (LGPD, minimização).
  const dados = esquemaDados.safeParse({
    celular: f.get("celular"),
    cep: f.get("cep"),
    logradouro: f.get("logradouro"),
    numero: f.get("numero"),
    complemento: f.get("complemento"),
    bairro: f.get("bairro"),
    cidade: f.get("cidade"),
    uf: f.get("uf"),
    tipoEmpresa: f.get("tipoEmpresa") || undefined,
  });
  if (!dados.success) erro(dados.error.issues[0].message);
  const d = dados.data!;
  if (documento.length === 14 && !d.tipoEmpresa) erro("Informe o tipo de empresa (MEI, LTDA, EI...).");

  let url: string | null | undefined;
  try {
    const r = await iniciarRecebedor({
      userId: usuario.id,
      papel,
      documento,
      nome,
      email: usuario.email,
      celular: d.celular,
      endereco: { rua: d.logradouro, bairro: d.bairro, cidade: d.cidade, uf: d.uf, cep: d.cep, numero: d.numero, complemento: d.complemento },
      ...(documento.length === 14 ? { nomeFantasia: nomeFantasia ?? nome, tipoEmpresa: d.tipoEmpresa } : {}),
    });
    url = r.urlOnboarding;
  } catch (e) {
    if (e instanceof IntegracaoPendente) erro("O cadastro de recebimento abre quando a integração com a Lytex for concluída.");
    if (!(e instanceof Error && e.message === "documento_diferente_do_cadastro")) await registrarErroApp(e, "/painel/recebimento (completarRecebimento)");
    erro(mensagemErroRecebedor(e));
  }
  if (url) redirect(url.startsWith("/") ? `${url}?volta=${encodeURIComponent(volta)}` : url);
  redirect(`${volta}?msg=${encodeURIComponent("Cadastro de recebimento iniciado. Acompanhe a análise da Lytex aqui.")}`);
}
