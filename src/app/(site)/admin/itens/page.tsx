// /admin/itens — fila de análise de itens. Itens com alerta de palavras
// proibidas aparecem primeiro e destacados.
import Link from "next/link";
import { Miniatura } from "@/components/arquivos";
import { ROTULO_NICHO } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_ITEM, TIPOS_DIGITAIS, formatarPreco, urlFoto } from "@/lib/produtor";
import { supabaseUrl } from "@/lib/supabase/env";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FiltroStatus, Historico, MensagemAdmin, buscarHistorico, um } from "../comuns";
import { decidirItem } from "../decisoes";

export const metadata = { title: "Itens" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

const ROTULO_DIGITAL: Record<string, string> = Object.fromEntries(TIPOS_DIGITAIS.map((t) => [t.valor, t.rotulo]));
const dataBr = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

type ItemAdmin = {
  id: string;
  nome: string;
  descricao: string | null;
  fotos: string[];
  preco_centavos: number;
  comissao_percentual: number;
  categoria: string | null;
  tipo: string;
  estoque: number | null;
  peso_gramas: number | null;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  prazo_postagem_dias: number | null;
  retirada_local: boolean;
  tipo_digital: string | null;
  arquivo_path: string | null;
  link_acesso: string | null;
  instrucoes_pos_compra: string | null;
  declaracao_nf_em: string | null;
  alerta_palavras: string[];
  status_aprovacao: string;
  motivo_rejeicao: string | null;
  enviado_para_analise_em: string | null;
  producers: { razao_social: string; status_verificacao: string };
};

export default async function AdminItens({ searchParams }: PageProps<"/admin/itens">) {
  await exigirPapel("admin");
  const params = await searchParams;
  const status = Object.keys(STATUS_ITEM).includes(um(params.status) ?? "") ? um(params.status)! : "em_analise";

  const supabase = await criarClienteServidor();
  // itens_privados(): o admin vê também o conteúdo digital para analisar
  const { data, error } = await supabase
    .rpc("itens_privados")
    .select(
      "id, nome, descricao, fotos, preco_centavos, comissao_percentual, categoria, tipo, estoque, peso_gramas, altura_cm, largura_cm, comprimento_cm, prazo_postagem_dias, retirada_local, tipo_digital, arquivo_path, link_acesso, instrucoes_pos_compra, declaracao_nf_em, alerta_palavras, status_aprovacao, motivo_rejeicao, enviado_para_analise_em, producers(razao_social, status_verificacao)",
    )
    .eq("status_aprovacao", status);
  // fila vazia por erro seria enganosa: melhor mostrar a página de erro
  if (error) throw new Error(`Fila de itens indisponível: ${error.message}`);
  // ordem: itens com alerta de palavra proibida primeiro; depois, os enviados há mais tempo
  // (ordenamos aqui porque, em rpc, o PostgREST só ordena por colunas do select)
  // (a relação producers é 1:1; a tipagem genérica do supabase-js a vê como lista)
  const itens = ((data ?? []) as unknown as ItemAdmin[]).sort(
    (a, b) =>
      b.alerta_palavras.length - a.alerta_palavras.length ||
      (a.enviado_para_analise_em ?? "9999").localeCompare(b.enviado_para_analise_em ?? "9999"),
  );

  // Links temporários para arquivos digitais (bucket privado)
  const caminhos = itens.map((i) => i.arquivo_path).filter(Boolean) as string[];
  const { data: assinados } = caminhos.length
    ? await supabase.storage.from("arquivos-digitais").createSignedUrls(caminhos, 600)
    : { data: [] };
  // só links gerados com sucesso
  const link = new Map<string, string>(
    (assinados ?? []).flatMap((a) => (a.path && a.signedUrl ? [[a.path, a.signedUrl] as [string, string]] : [])),
  );

  const historico = await buscarHistorico("item", itens.map((i) => i.id));
  const base = supabaseUrl();

  return (
    <>
      <Link href="/admin" className="inline-block py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl">Itens</h1>
      <MensagemAdmin msg={um(params.msg)} tipo={um(params.tipo)} />
      <FiltroStatus caminho="/admin/itens" atual={status} opcoes={STATUS_ITEM} />

      {itens.length === 0 && <p className="mt-6 rounded-2xl bg-branco p-5">Nenhum item nesta situação.</p>}

      <ul className="mt-4 flex flex-col gap-4">
        {itens.map((i) => {
          const produtorAprovado = i.producers.status_verificacao === "aprovado";
          return (
            <li
              key={i.id}
              data-item={i.nome}
              className={`rounded-2xl bg-branco p-4 sm:p-5 ${i.alerta_palavras.length ? "ring-2 ring-red-700" : ""}`}
            >
              {i.alerta_palavras.length > 0 && (
                <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" data-alerta>
                  <strong className="font-medium">⚠ Revisar: termos da lista de proibidos</strong> —{" "}
                  {i.alerta_palavras.join(", ")}
                </p>
              )}

              <div className="flex gap-1">
                {i.fotos.slice(0, 3).map((f, n) => (
                  <Miniatura key={f} src={urlFoto(base, f)} alt={`${i.nome} — foto ${n + 1}`} />
                ))}
              </div>

              <p className="mt-3 text-lg font-medium">{i.nome}</p>
              <p className="text-sm">
                {i.producers.razao_social}{" "}
                <span className={produtorAprovado ? "" : "font-medium text-red-800"}>
                  (produtor {produtorAprovado ? "aprovado" : "ainda NÃO aprovado"})
                </span>
              </p>
              <p className="text-sm">
                {formatarPreco(i.preco_centavos)} · comissão {i.comissao_percentual}% ·{" "}
                {ROTULO_NICHO[i.categoria ?? ""] ?? "sem categoria"} · {i.tipo === "fisico" ? "Físico" : "Digital"}
              </p>
              <p className="mt-2 text-sm whitespace-pre-line text-petroleo/85">{i.descricao}</p>

              {i.tipo === "fisico" ? (
                <p className="mt-2 text-sm text-petroleo/80">
                  Estoque {i.estoque} · {i.peso_gramas} g · {i.altura_cm}×{i.largura_cm}×{i.comprimento_cm} cm · postagem
                  em {i.prazo_postagem_dias} dia(s) útil(eis){i.retirada_local && " · aceita retirada"}
                </p>
              ) : (
                <div className="mt-2 text-sm text-petroleo/80">
                  <p>
                    {ROTULO_DIGITAL[i.tipo_digital ?? ""]}
                    {i.link_acesso && (
                      <>
                        {" · "}
                        <a href={i.link_acesso} target="_blank" rel="noopener noreferrer" className="underline">
                          link de acesso ↗
                        </a>
                      </>
                    )}
                    {i.arquivo_path && link.get(i.arquivo_path) && (
                      <>
                        {" · "}
                        <a href={link.get(i.arquivo_path)} target="_blank" rel="noopener noreferrer" className="underline">
                          baixar arquivo
                        </a>
                      </>
                    )}
                  </p>
                  <p>Instruções: {i.instrucoes_pos_compra}</p>
                </div>
              )}
              <p className="mt-1 text-xs text-petroleo/70">
                Declarou emitir nota fiscal em {i.declaracao_nf_em ? dataBr(i.declaracao_nf_em) : "—"}
              </p>
              {i.status_aprovacao === "recusado" && <p className="mt-2 text-sm text-red-800">Motivo: {i.motivo_rejeicao}</p>}

              {i.status_aprovacao === "em_analise" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <form action={decidirItem} className="flex flex-col gap-2 rounded-xl border border-petroleo/20 p-3">
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="decisao" value="aprovar" />
                    {!produtorAprovado && <p className="text-xs text-red-800">Aprove o produtor primeiro.</p>}
                    <button
                      disabled={!produtorAprovado}
                      className="rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco disabled:opacity-40"
                    >
                      Aprovar item
                    </button>
                  </form>
                  <form action={decidirItem} className="flex flex-col gap-2 rounded-xl border border-petroleo/20 p-3">
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="decisao" value="recusar" />
                    <textarea
                      name="motivo"
                      required
                      minLength={5}
                      rows={2}
                      placeholder="Motivo da recusa (o produtor vai ler)"
                      aria-label="Motivo da recusa"
                      className="w-full rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base"
                    />
                    <button className="rounded-full border border-red-800 px-4 py-2 text-sm font-medium text-red-800">Recusar</button>
                  </form>
                </div>
              )}

              <Historico registros={historico.get(i.id)} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
