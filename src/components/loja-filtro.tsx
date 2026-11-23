"use client";
// Filtros da lista "Todos os produtos": categorias (quando há 2 ou mais) e busca
// por nome (quando a loja tem muitos produtos). Os cartões chegam prontos do
// servidor; aqui só se decide quais aparecem. Sem filtro ativo, mostra tudo.
import { useState } from "react";

export type ItemFiltravel = { id: string; nome: string; categoria: string; rotuloCategoria: string; no: React.ReactNode };

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ListaFiltravel({
  itens,
  classeLista,
  comBusca,
  centralizado = false,
}: {
  itens: ItemFiltravel[];
  classeLista: string;
  comBusca: boolean;
  centralizado?: boolean;
}) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const categorias = [...new Map(itens.map((i) => [i.categoria, i.rotuloCategoria])).entries()];
  const comCategorias = categorias.length > 1;
  const termo = normalizar(busca);
  const visiveis = itens.filter((i) => (!categoria || i.categoria === categoria) && (!termo || normalizar(i.nome).includes(termo)));
  const filtrando = categoria !== null || termo !== "";

  const chip = (ativo: boolean) =>
    `inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium ${
      ativo
        ? "border-[var(--loja-principal)] bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]"
        : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500"
    }`;

  return (
    <div className="flex flex-col gap-6">
      {(comCategorias || comBusca) && (
        <div className={`flex flex-col gap-3 ${centralizado ? "items-center" : ""}`}>
          {comBusca && (
            <label className="flex w-full max-w-md flex-col gap-1 text-sm font-medium text-neutral-800">
              Buscar nesta loja
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                maxLength={60}
                autoComplete="off"
                className="min-h-11 w-full rounded-md border border-neutral-500 bg-white px-3 text-base text-neutral-900 focus:border-neutral-900 focus:ring-2 focus:ring-[var(--loja-principal)] focus:outline-none"
              />
            </label>
          )}
          {comCategorias && (
            <div role="group" aria-label="Filtrar por categoria" className={`flex flex-wrap gap-2 ${centralizado ? "justify-center" : ""}`}>
              <button type="button" aria-pressed={categoria === null} onClick={() => setCategoria(null)} className={chip(categoria === null)}>
                Todos
              </button>
              {categorias.map(([valor, rotulo]) => (
                <button key={valor} type="button" aria-pressed={categoria === valor} onClick={() => setCategoria(valor)} className={chip(categoria === valor)}>
                  {rotulo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p role="status" className="text-sm text-neutral-700 empty:hidden">
        {filtrando ? (visiveis.length === 1 ? "1 produto encontrado" : `${visiveis.length} produtos encontrados`) : ""}
      </p>

      {visiveis.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-neutral-200 p-6">
          <p className="text-base font-medium text-neutral-900">Nenhum produto com esse filtro</p>
          <p className="text-sm text-neutral-700">Tente outra palavra ou veja todos os produtos da loja.</p>
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setCategoria(null);
            }}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--loja-link)] underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className={classeLista}>
          {visiveis.map((i) => (
            <li key={i.id}>{i.no}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
