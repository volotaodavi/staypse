// /admin/produtores — curadoria de LOJAS (conteúdo, não identidade).
// A verificação de identidade é da Lytex (cadastro do recebedor): aqui o admin
// vê só o STATUS do recebedor, os dados públicos da loja e o contrato aceito.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_PRODUTOR, formatarCnpj } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FiltroStatus, Historico, MensagemAdmin, buscarHistorico, um } from "../comuns";
import { ROTULO_STATUS_RECEBEDOR } from "@/lib/pagamentos/recebedores";
import type { StatusRecebedor } from "@/lib/pagamentos/tipos";
import { decidirProdutor } from "../decisoes";

export const metadata = { title: "Produtores" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

const estiloCampo = "w-full rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base";

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
  status_verificacao: string;
  motivo_rejeicao: string | null;
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
      "id, user_id, razao_social, cnpj, inscricao_estadual, whatsapp, email_contato, cep, logradouro, numero, complemento, bairro, cidade, uf, status_verificacao, motivo_rejeicao, enviado_para_analise_em",
    )
    .eq("status_verificacao", status)
    .order("enviado_para_analise_em", { ascending: true, nullsFirst: false })
    .returns<ProdutorAdmin[]>();
  const produtores = data ?? [];

  // status do recebedor na Lytex (só leitura)
  const { data: recs } = produtores.length
    ? await supabase.from("recebedores").select("user_id, status_recebedor, motivo").eq("papel", "produtor").in("user_id", produtores.map((p) => p.user_id))
    : { data: [] };
  const recebedor = new Map((recs ?? []).map((r) => [r.user_id, r]));

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
      <Link href="/admin" className="inline-block py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl">Lojas</h1>
      <p className="mt-1 text-sm text-petroleo/80">
        Curadoria por conteúdo (nome, marca, produtos). A identidade é verificada pela Lytex no cadastro de recebimento.
      </p>
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

              <p className="mt-2 text-sm" data-recebedor>
                Recebedor na Lytex:{" "}
                <strong className="font-medium">
                  {ROTULO_STATUS_RECEBEDOR[(recebedor.get(p.user_id)?.status_recebedor ?? "nao_iniciado") as StatusRecebedor]}
                </strong>
                {recebedor.get(p.user_id)?.motivo ? ` · ${recebedor.get(p.user_id)?.motivo}` : ""}
              </p>
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
                    <p className="text-sm">Loja de acordo com as regras de conteúdo e os produtos proibidos.</p>
                    <button className="min-h-11 rounded-full bg-petroleo px-4 text-sm font-medium text-branco">Aprovar loja</button>
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

              <Historico registros={historico.get(p.id)} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
