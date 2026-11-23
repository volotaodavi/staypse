"use client";
// Editor da organização da vitrine. Tudo com botões (Subir, Descer, Remover):
// não exige arrastar. Uma região "status" avisa o que mudou para leitor de tela.
import { useId, useState } from "react";
import { BotaoEnviar, FormAcao } from "@/components/formulario";
import { formatarPreco } from "@/lib/produtor";
import {
  LIMITE_COLECOES,
  LIMITE_DESTAQUES,
  LIMITE_NOME_COLECAO,
  mover,
  type OrganizacaoVitrine,
} from "@/lib/vitrine";
import { salvarOrganizacao } from "../../acoes";

type Produto = { id: string; nome: string; loja: string; preco_centavos: number };

const botaoPequeno =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-petroleo px-3 text-sm font-medium disabled:opacity-40";

// Lista ordenada de produtos com Subir / Descer / Remover (e "Adicionar" opcional)
function ListaOrdenavel({
  ids,
  produtos,
  aoMudar,
  aoAvisar,
  limite,
  rotuloLista,
  semRemover = false,
}: {
  ids: string[];
  produtos: Map<string, Produto>;
  aoMudar: (novos: string[]) => void;
  aoAvisar: (msg: string) => void;
  limite?: number;
  rotuloLista: string;
  semRemover?: boolean;
}) {
  const idSeletor = useId();
  const [escolha, setEscolha] = useState("");
  const disponiveis = [...produtos.values()].filter((p) => !ids.includes(p.id));
  const cheio = limite !== undefined && ids.length >= limite;

  function mexer(i: number, passo: -1 | 1) {
    const nome = produtos.get(ids[i])?.nome ?? "Produto";
    const novos = mover(ids, i, passo);
    if (novos === ids) return;
    aoMudar(novos);
    aoAvisar(`${nome} agora é o ${i + passo + 1}º de ${ids.length} em ${rotuloLista}.`);
  }

  return (
    <div className="flex flex-col gap-3">
      {ids.length > 0 && (
        <ol className="flex flex-col gap-2">
          {ids.map((id, i) => {
            const p = produtos.get(id);
            if (!p) return null;
            return (
              <li key={id} className="flex flex-col gap-2 rounded-2xl bg-gelo p-3 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">
                    {i + 1}. {p.nome}
                  </span>
                  <span className="block text-xs text-petroleo/70">{formatarPreco(p.preco_centavos)}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => mexer(i, -1)} disabled={i === 0} className={botaoPequeno} aria-label={`Subir ${p.nome}`}>
                    Subir
                  </button>
                  <button
                    type="button"
                    onClick={() => mexer(i, 1)}
                    disabled={i === ids.length - 1}
                    className={botaoPequeno}
                    aria-label={`Descer ${p.nome}`}
                  >
                    Descer
                  </button>
                  {!semRemover && (
                    <button
                      type="button"
                      onClick={() => {
                        aoMudar(ids.filter((x) => x !== id));
                        aoAvisar(`${p.nome} saiu de ${rotuloLista}.`);
                      }}
                      className={botaoPequeno}
                      aria-label={`Remover ${p.nome} de ${rotuloLista}`}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {!semRemover && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label htmlFor={idSeletor} className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
            Adicionar produto
            <select
              id={idSeletor}
              value={escolha}
              onChange={(e) => setEscolha(e.target.value)}
              disabled={cheio || disponiveis.length === 0}
              className="min-h-11 w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base font-normal"
            >
              <option value="">
                {cheio ? `Limite de ${limite} atingido` : disponiveis.length === 0 ? "Todos já foram adicionados" : "Escolha um produto"}
              </option>
              {disponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!escolha || cheio}
            onClick={() => {
              aoMudar([...ids, escolha]);
              aoAvisar(`${produtos.get(escolha)?.nome ?? "Produto"} entrou em ${rotuloLista}.`);
              setEscolha("");
            }}
            className="min-h-11 rounded-full bg-petroleo px-5 py-2.5 font-medium text-branco disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}

export function FormOrganizar({ itens, inicial, slug }: { itens: Produto[]; inicial: OrganizacaoVitrine; slug: string }) {
  const produtos = new Map(itens.map((i) => [i.id, i]));
  const [destaques, setDestaques] = useState(inicial.destaques);
  const [colecoes, setColecoes] = useState(inicial.colecoes);
  const [ordem, setOrdem] = useState(inicial.ordem);
  const [aviso, setAviso] = useState("");

  const json = JSON.stringify({ destaques, colecoes, ordem } satisfies OrganizacaoVitrine);
  const secao = "flex flex-col gap-3 rounded-2xl border border-petroleo/15 p-4";

  return (
    <FormAcao acao={salvarOrganizacao} className="flex flex-col gap-6">
      <input type="hidden" name="organizacao" value={json} />
      {/* leitor de tela: avisa cada mudança de posição */}
      <p role="status" aria-live="polite" className="sr-only">
        {aviso}
      </p>

      <section aria-labelledby="org-destaques" className={secao}>
        <h2 id="org-destaques" className="text-xl">
          Destaques ({destaques.length} de {LIMITE_DESTAQUES})
        </h2>
        <p className="text-sm text-petroleo/75">Ficam no topo da vitrine, na ordem abaixo.</p>
        <ListaOrdenavel
          ids={destaques}
          produtos={produtos}
          aoMudar={setDestaques}
          aoAvisar={setAviso}
          limite={LIMITE_DESTAQUES}
          rotuloLista="destaques"
        />
      </section>

      <section aria-labelledby="org-colecoes" className={secao}>
        <h2 id="org-colecoes" className="text-xl">
          Coleções ({colecoes.length} de {LIMITE_COLECOES})
        </h2>
        <p className="text-sm text-petroleo/75">Grupos como &quot;Para presentear&quot; ou &quot;Treino&quot;. Cada um vira uma seção na vitrine.</p>
        {colecoes.map((c, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl bg-branco p-3 ring-1 ring-petroleo/15">
            <div className="flex items-end gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
                Nome da coleção {i + 1}
                <input
                  value={c.nome}
                  maxLength={LIMITE_NOME_COLECAO}
                  onChange={(e) => setColecoes(colecoes.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                  placeholder="Ex.: Para presentear"
                  className="min-h-11 w-full min-w-0 rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setColecoes(colecoes.filter((_, j) => j !== i));
                  setAviso(`Coleção ${c.nome || i + 1} removida.`);
                }}
                className={botaoPequeno}
                aria-label={`Excluir coleção ${c.nome || i + 1}`}
              >
                Excluir
              </button>
            </div>
            <ListaOrdenavel
              ids={c.itens}
              produtos={produtos}
              aoMudar={(novos) => setColecoes(colecoes.map((x, j) => (j === i ? { ...x, itens: novos } : x)))}
              aoAvisar={setAviso}
              rotuloLista={`a coleção ${c.nome || i + 1}`}
            />
          </div>
        ))}
        <button
          type="button"
          disabled={colecoes.length >= LIMITE_COLECOES}
          onClick={() => {
            setColecoes([...colecoes, { nome: "", itens: [] }]);
            setAviso("Nova coleção criada.");
          }}
          className="min-h-11 rounded-full border border-petroleo px-5 py-2.5 font-medium disabled:opacity-40"
        >
          {colecoes.length >= LIMITE_COLECOES ? `Limite de ${LIMITE_COLECOES} coleções` : "Nova coleção"}
        </button>
      </section>

      <section aria-labelledby="org-ordem" className={secao}>
        <h2 id="org-ordem" className="text-xl">
          Ordem dos produtos
        </h2>
        <p className="text-sm text-petroleo/75">É a ordem da lista &quot;Produtos&quot; da vitrine.</p>
        <ListaOrdenavel ids={ordem} produtos={produtos} aoMudar={setOrdem} aoAvisar={setAviso} rotuloLista="a lista de produtos" semRemover />
      </section>

      <BotaoEnviar>Salvar organização</BotaoEnviar>
      <a href={`/@${slug}`} className="inline-flex min-h-11 items-center justify-center text-sm underline">
        Ver minha vitrine
      </a>
    </FormAcao>
  );
}
