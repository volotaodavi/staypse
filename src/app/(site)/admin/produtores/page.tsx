// /admin/produtores — fila de análise de produtores.
// Documentos (links temporários de 10 min), dados do CNPJ, contrato aceito,
// aprovar (com confirmação de CNPJ ativo) ou recusar com motivo, id Lytex e histórico.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_PRODUTOR, formatarCnpj } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FiltroStatus, Historico, MensagemAdmin, buscarHistorico, um } from "../comuns";
import { decidirProdutor, definirRecebedorLytex } from "../decisoes";

export const metadata = { title: "Produtores" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

// Consulta oficial de CNPJ na Receita Federal (o admin confere manualmente)
const RECEITA_CNPJ = "https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp";
const estiloCampo = "w-full rounded-xl border border-petroleo/20 bg-branco px-3 py-2 text-base";

type ProdutorAdmin = {
  id: string;
  user_id: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual: string | null;
  whatsapp: string | null;
  email_contato: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  documento_path: string | null;
  documento_responsavel_path: string | null;
  status_verificacao: string;
  motivo_rejeicao: string | null;
  lytex_recebedor_id: string | null;
  enviado_para_analise_em: string | null;
};

export default async function AdminProdutores({ searchParams }: PageProps<"/admin/produtores">) {
  await exigirPapel("admin");
  const params = await searchParams;
  const status = Object.keys(STATUS_PRODUTOR).includes(um(params.status) ?? "") ? um(params.status)! : "em_analise";

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("producers")
    .select(
      "id, user_id, razao_social, cnpj, inscricao_estadual, whatsapp, email_contato, cep, logradouro, numero, complemento, bairro, cidade, uf, documento_path, documento_responsavel_path, status_verificacao, motivo_rejeicao, lytex_recebedor_id, enviado_para_analise_em",
    )
    .eq("status_verificacao", status)
    .order("enviado_para_analise_em", { ascending: true, nullsFirst: false })
    .returns<ProdutorAdmin[]>();
  const produtores = data ?? [];

  // Links temporários para os documentos (bucket privado; só admin consegue gerar)
  const caminhos = produtores.flatMap((p) => [p.documento_path, p.documento_responsavel_path]).filter(Boolean) as string[];
  const { data: assinados } = caminhos.length
    ? await supabase.storage.from("documentos-produtores").createSignedUrls(caminhos, 600)
    : { data: [] };
  // só links gerados com sucesso
  const link = new Map<string, string>(
    (assinados ?? []).flatMap((a) => (a.path && a.signedUrl ? [[a.path, a.signedUrl] as [string, string]] : [])),
  );

  // Aceite do contrato do produtor (versão e data)
  const { data: aceites } = produtores.length
    ? await supabase
        .from("terms_acceptances")
        .select("user_id, versao, aceito_em")
        .eq("documento", "termos_produtor")
        .in("user_id", produtores.map((p) => p.user_id))
        .order("aceito_em", { ascending: false })
    : { data: [] };
  const contrato = new Map<string, { versao: string; aceito_em: string }>();
  for (const a of aceites ?? []) if (!contrato.has(a.user_id)) contrato.set(a.user_id, a);

  const historico = await buscarHistorico("producer", produtores.map((p) => p.id));
  const dataBr = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <>
      <Link href="/admin" className="text-sm underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl">Produtores</h1>
      <MensagemAdmin msg={um(params.msg)} tipo={um(params.tipo)} />
      <FiltroStatus caminho="/admin/produtores" atual={status} opcoes={STATUS_PRODUTOR} />

      {produtores.length === 0 && <p className="mt-6 rounded-2xl bg-branco p-5">Nenhum produtor nesta situação.</p>}

      <ul className="mt-4 flex flex-col gap-4">
        {produtores.map((p) => {
          const aceite = contrato.get(p.user_id);
          return (
            <li key={p.id} className="rounded-2xl bg-branco p-4 sm:p-5" data-produtor={p.razao_social}>
              <p className="text-lg font-medium">{p.razao_social}</p>
              <p className="text-sm">
                CNPJ <strong className="font-medium">{formatarCnpj(p.cnpj)}</strong>
                {p.inscricao_estadual && ` · IE ${p.inscricao_estadual}`}
              </p>
              <p className="text-sm break-all text-petroleo/80">
                {p.email_contato} · {p.whatsapp}
              </p>
              <p className="text-sm text-petroleo/80">
                {p.logradouro}, {p.numero}
                {p.complemento && ` (${p.complemento})`} — {p.bairro}, {p.cidade}/{p.uf} · CEP {p.cep}
              </p>
              {p.enviado_para_analise_em && (
                <p className="text-xs text-petroleo/70">Enviado em {dataBr(p.enviado_para_analise_em)}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {p.documento_path && link.get(p.documento_path) && (
                  <a href={link.get(p.documento_path)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gelo px-3 py-1.5 underline">
                    Contrato social / cartão CNPJ
                  </a>
                )}
                {p.documento_responsavel_path && link.get(p.documento_responsavel_path) && (
                  <a href={link.get(p.documento_responsavel_path)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gelo px-3 py-1.5 underline">
                    Documento do responsável
                  </a>
                )}
                <a href={RECEITA_CNPJ} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gelo px-3 py-1.5 underline">
                  Consultar CNPJ na Receita ↗
                </a>
              </div>
              <p className="mt-2 text-sm">
                Contrato do Produtor:{" "}
                {aceite ? `aceito na versão ${aceite.versao} em ${dataBr(aceite.aceito_em)}` : "não aceito"}
              </p>

              {p.status_verificacao === "recusado" && (
                <p className="mt-2 text-sm text-red-800">Motivo da recusa: {p.motivo_rejeicao}</p>
              )}

              {p.status_verificacao === "em_analise" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <form action={decidirProdutor} className="flex flex-col gap-2 rounded-xl border border-petroleo/20 p-3">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decisao" value="aprovar" />
                    <label className="flex gap-2 text-sm">
                      <input type="checkbox" name="cnpj_ativo" value="sim" required className="mt-0.5 h-4 w-4 shrink-0 accent-petroleo" />
                      Conferi na Receita: o CNPJ está ATIVO e confere com os documentos.
                    </label>
                    <button className="rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco">Aprovar produtor</button>
                  </form>
                  <form action={decidirProdutor} className="flex flex-col gap-2 rounded-xl border border-petroleo/20 p-3">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="decisao" value="recusar" />
                    <textarea
                      name="motivo"
                      required
                      minLength={5}
                      rows={2}
                      placeholder="Motivo da recusa (o produtor vai ler)"
                      aria-label="Motivo da recusa"
                      className={estiloCampo}
                    />
                    <button className="rounded-full border border-red-800 px-4 py-2 text-sm font-medium text-red-800">Recusar</button>
                  </form>
                </div>
              )}

              {p.status_verificacao === "aprovado" && (
                <form action={definirRecebedorLytex} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="lytex_recebedor_id"
                    defaultValue={p.lytex_recebedor_id ?? ""}
                    placeholder="Id do recebedor na Lytex"
                    aria-label="Id do recebedor na Lytex"
                    className={estiloCampo}
                  />
                  <button className="shrink-0 rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco">Salvar id Lytex</button>
                </form>
              )}

              <Historico registros={historico.get(p.id)} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
