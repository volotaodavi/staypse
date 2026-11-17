// Painel do produtor: situação do cadastro (com o que falta) e lista de itens
// com status, pausar/ativar e estoque.
import Link from "next/link";
import { Miniatura } from "@/components/arquivos";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_ITEM, STATUS_PRODUTOR, formatarPreco, pendenciasItem, pendenciasProdutor, urlFoto, type DadosItem } from "@/lib/produtor";
import { supabaseUrl } from "@/lib/supabase/env";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { meuProdutor } from "./dados";
import { alternarPausa, atualizarEstoque } from "./itens/acoes";

export const metadata = { title: "Painel do produtor" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

type ItemLista = DadosItem & {
  id: string;
  nome: string;
  status_aprovacao: string;
  motivo_rejeicao: string | null;
  fotos: string[];
  preco_centavos: number;
  estoque: number | null;
  tipo: string;
};

const corStatus: Record<string, string> = {
  aprovado: "bg-petroleo text-branco",
  em_analise: "bg-gelo text-petroleo",
  rascunho: "bg-gelo text-petroleo",
  pausado: "bg-gelo text-petroleo",
  recusado: "bg-red-50 text-red-800",
  suspenso: "bg-red-50 text-red-800",
};

export default async function PainelProdutor({ searchParams }: PageProps<"/painel/produtor">) {
  const usuario = await exigirPapel("produtor");
  const aviso = await searchParams;
  const { produtor, contratoAceito } = await meuProdutor(usuario.id);
  const pendencias = pendenciasProdutor(produtor, contratoAceito);

  let itens: ItemLista[] = [];
  if (produtor) {
    const supabase = await criarClienteServidor();
    const { data } = await supabase
      .from("items")
      .select(
        "id, nome, descricao, fotos, preco_centavos, comissao_percentual, categoria, tipo, estoque, peso_gramas, altura_cm, largura_cm, comprimento_cm, prazo_postagem_dias, tipo_digital, arquivo_path, link_acesso, instrucoes_pos_compra, declaracao_nf, status_aprovacao, motivo_rejeicao",
      )
      .eq("producer_id", produtor.id)
      .order("criado_em", { ascending: false });
    itens = (data ?? []) as ItemLista[];
  }
  const base = supabaseUrl();

  return (
    <>
      <p className="text-sm font-medium tracking-wide text-petroleo/60 uppercase">Produtor</p>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>

      {aviso.enviado && (
        <p role="status" className="mt-4 rounded-xl bg-branco px-4 py-3 text-sm">
          ✓ Cadastro enviado para análise. Avisaremos aqui quando houver resultado.
        </p>
      )}
      {aviso.item && (
        <p role="status" className="mt-4 rounded-xl bg-branco px-4 py-3 text-sm">
          ✓ Item salvo.
        </p>
      )}

      {/* Empresa */}
      <section className="mt-6 rounded-3xl bg-branco p-5 sm:p-6" data-secao="empresa">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl">Sua empresa</h2>
          {produtor && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${corStatus[produtor.status_verificacao]}`} data-status-produtor>
              {STATUS_PRODUTOR[produtor.status_verificacao]}
            </span>
          )}
        </div>

        {!produtor && (
          <>
            <p className="mt-2 text-petroleo/80">
              Para vender, cadastre sua empresa: CNPJ ativo, endereço de envio e documentos.
            </p>
            <Link href="/painel/produtor/cadastro" className="mt-4 inline-block rounded-full bg-ciano px-6 py-3 font-medium text-petroleo">
              Começar cadastro
            </Link>
          </>
        )}

        {produtor && <p className="mt-1">{produtor.razao_social}</p>}

        {produtor?.status_verificacao === "recusado" && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong className="font-medium">Motivo da recusa:</strong> {produtor.motivo_rejeicao}
          </p>
        )}
        {produtor?.status_verificacao === "em_analise" && (
          <p className="mt-3 text-sm text-petroleo/80">
            A equipe Staypse está conferindo o CNPJ na Receita e os documentos.
          </p>
        )}
        {produtor && ["rascunho", "recusado"].includes(produtor.status_verificacao) && (
          <>
            {pendencias.length > 0 ? (
              <div className="mt-3 rounded-xl bg-gelo px-4 py-3 text-sm">
                <p className="font-medium">Para ser aprovado, falta:</p>
                <ul className="mt-1 list-disc pl-5">
                  {pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm">Tudo preenchido. Falta só enviar para análise.</p>
            )}
            <Link href="/painel/produtor/cadastro" className="mt-4 inline-block rounded-full bg-ciano px-6 py-3 font-medium text-petroleo">
              {produtor.status_verificacao === "recusado" ? "Corrigir cadastro" : "Continuar cadastro"}
            </Link>
          </>
        )}
      </section>

      {aviso.loja && (
        <p role="status" className="mt-4 rounded-xl bg-branco px-4 py-3 text-sm">
          ✓ Loja salva.
        </p>
      )}

      {/* Loja pública e afiliados */}
      {produtor && (
        <nav className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Loja, vendedores e afiliados">
          <Link href="/painel/produtor/loja" className="rounded-3xl bg-branco p-5 hover:ring-2 hover:ring-petroleo/20">
            <span className="block text-lg font-extrabold">Sua loja</span>
            <span className="text-sm text-petroleo/75">Endereço, logo, cores e layout</span>
          </Link>
          <Link href="/painel/produtor/vendedores" className="rounded-3xl bg-branco p-5 hover:ring-2 hover:ring-petroleo/20">
            <span className="block text-lg font-extrabold">Vendedores próprios</span>
            <span className="text-sm text-petroleo/75">Sua equipe, comissões e relatório</span>
          </Link>
          <Link href="/painel/produtor/afiliados" className="rounded-3xl bg-branco p-5 hover:ring-2 hover:ring-petroleo/20">
            <span className="block text-lg font-extrabold">Afiliados</span>
            <span className="text-sm text-petroleo/75">Quem indica seus itens</span>
          </Link>
        </nav>
      )}

      {/* Itens */}
      {produtor && (
        <section className="mt-6" data-secao="itens">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl">Seus itens</h2>
            <Link href="/painel/produtor/itens/novo" className="rounded-full bg-ciano px-4 py-2 text-sm font-medium text-petroleo">
              + Novo item
            </Link>
          </div>
          {produtor.status_verificacao !== "aprovado" && (
            <p className="mt-2 text-sm text-petroleo/75">
              Você já pode preparar itens. Eles só aparecem para revendedores depois que sua empresa e cada
              item forem aprovados.
            </p>
          )}

          {itens.length === 0 && <p className="mt-4 rounded-2xl bg-branco p-5 text-petroleo/80">Nenhum item ainda.</p>}

          <ul className="mt-4 flex flex-col gap-3">
            {itens.map((item) => {
              const falta = ["rascunho", "recusado"].includes(item.status_aprovacao) ? pendenciasItem(item) : [];
              return (
                <li key={item.id} className="rounded-2xl bg-branco p-4" data-item={item.nome}>
                  <div className="flex gap-3">
                    {item.fotos[0] ? (
                      <Miniatura src={urlFoto(base, item.fotos[0])} alt={item.nome} />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-gelo" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.nome}</p>
                      <p className="text-sm text-petroleo/75">
                        {formatarPreco(item.preco_centavos)} · {item.tipo === "fisico" ? "Físico" : "Digital"}
                      </p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${corStatus[item.status_aprovacao]}`} data-status-item>
                        {STATUS_ITEM[item.status_aprovacao]}
                      </span>
                    </div>
                  </div>

                  {item.status_aprovacao === "recusado" && (
                    <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                      <strong className="font-medium">Motivo:</strong> {item.motivo_rejeicao}
                    </p>
                  )}
                  {falta.length > 0 && (
                    <p className="mt-3 rounded-xl bg-gelo px-3 py-2 text-sm">
                      <strong className="font-medium">Falta para enviar:</strong> {falta.join("; ")}.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={`/painel/produtor/itens/${item.id}`} className="rounded-full border border-petroleo px-4 py-2 text-sm font-medium">
                      Editar
                    </Link>
                    {["aprovado", "pausado"].includes(item.status_aprovacao) && (
                      <form action={alternarPausa}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco">
                          {item.status_aprovacao === "aprovado" ? "Pausar" : "Ativar"}
                        </button>
                      </form>
                    )}
                    {item.tipo === "fisico" && (
                      <form action={atualizarEstoque} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={item.id} />
                        <label className="text-sm">
                          Estoque{" "}
                          <input
                            name="estoque"
                            type="number"
                            min={0}
                            defaultValue={item.estoque ?? 0}
                            className="w-20 rounded-lg border border-petroleo/20 px-2 py-1.5"
                          />
                        </label>
                        <button className="rounded-full border border-petroleo px-3 py-1.5 text-sm">OK</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
