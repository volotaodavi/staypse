// /admin/lista — inscritos da lista de espera.
// Filtros por tipo, cidade e nicho; contadores; status do contato; CSV.
import Link from "next/link";
import { NICHOS, ROTULO_NICHO, STATUS_CONTATO, TIPOS_PRODUTO } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { atualizarStatusContato } from "./acoes";
import { LIMITE, buscarInscritos, contarInscritos, lerFiltros } from "./consulta";

export const metadata = { title: "Lista de espera" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

const ROTULO_TIPO_PRODUTO: Record<string, string> = Object.fromEntries(
  TIPOS_PRODUTO.map((t) => [t.valor, t.rotulo]),
);
const estiloCampo =
  "rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none";

export default async function AdminLista({ searchParams }: PageProps<"/admin/lista">) {
  await exigirPapel("admin");
  const filtros = lerFiltros(await searchParams);
  const [inscritos, contagem] = await Promise.all([buscarInscritos(filtros), contarInscritos()]);

  // mesma busca no CSV
  const consultaCsv = new URLSearchParams(
    Object.entries(filtros).filter((par): par is [string, string] => Boolean(par[1])),
  ).toString();

  return (
    <>
      <Link href="/admin" className="inline-block py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl">Lista de espera</h1>

      {/* Contadores */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["Total", contagem.total],
          ["Revendedores", contagem.revendedores],
          ["Produtores", contagem.produtores],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-2xl bg-petroleo p-4 text-gelo">
            <p className="text-3xl font-extrabold text-ciano">{valor}</p>
            <p className="text-xs text-gelo/85 sm:text-sm">{rotulo}</p>
          </div>
        ))}
      </div>

      {/* Filtros (GET: o endereço guarda a busca) */}
      <form className="mt-6 grid gap-3 rounded-2xl bg-branco p-4 sm:grid-cols-4" method="get">
        <select name="tipo" defaultValue={filtros.tipo ?? ""} className={estiloCampo} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          <option value="revendedor">Revendedores</option>
          <option value="produtor">Produtores</option>
        </select>
        <input name="cidade" defaultValue={filtros.cidade ?? ""} placeholder="Cidade" className={estiloCampo} aria-label="Cidade" />
        <select name="nicho" defaultValue={filtros.nicho ?? ""} className={estiloCampo} aria-label="Nicho">
          <option value="">Todos os nichos</option>
          {NICHOS.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.rotulo}
            </option>
          ))}
        </select>
        <button className="rounded-xl bg-petroleo px-4 py-2 font-medium text-branco">Filtrar</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-petroleo/75">
          {inscritos.length} {inscritos.length === 1 ? "inscrito encontrado" : "inscritos encontrados"}
          {inscritos.length === LIMITE && ` (mostrando os ${LIMITE} mais recentes)`}
        </p>
        <a
          href={`/admin/lista/csv${consultaCsv ? `?${consultaCsv}` : ""}`}
          className="rounded-full bg-ciano px-4 py-2 text-sm font-medium text-petroleo"
        >
          Exportar CSV
        </a>
      </div>

      {/* Inscritos */}
      <ul className="mt-4 flex flex-col gap-3">
        {inscritos.map((i) => (
          <li key={i.id} className="rounded-2xl bg-branco p-4" data-inscrito={i.email}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                {i.nome}{" "}
                <span className="rounded-full bg-gelo px-2 py-0.5 text-xs">
                  {i.interesse === "produtor" ? "Produtor" : "Revendedor"}
                </span>
              </p>
              <p className="text-xs text-petroleo/70">
                {new Date(i.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                {" · "}
                {i.indicacoes} {i.indicacoes === 1 ? "indicação" : "indicações"}
              </p>
            </div>
            <p className="mt-1 text-sm break-all text-petroleo/85">
              {i.email} · {i.whatsapp}
            </p>

            {i.interesse === "produtor" ? (
              <>
                <p className="mt-1 text-sm">
                  {i.empresa}
                  {i.cnpj && ` · CNPJ ${i.cnpj}`}
                  {i.tipo_produto && ` · ${ROTULO_TIPO_PRODUTO[i.tipo_produto]}`}
                </p>
                <p className="text-sm text-petroleo/80">{i.o_que_vende}</p>
                {/* Andamento do contato com o produtor */}
                <form action={atualizarStatusContato} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={i.id} />
                  <select
                    name="status_contato"
                    defaultValue={i.status_contato}
                    className={estiloCampo}
                    aria-label={`Status do contato com ${i.nome}`}
                  >
                    {STATUS_CONTATO.map((s) => (
                      <option key={s.valor} value={s.valor}>
                        {s.rotulo}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-xl bg-petroleo px-4 py-2 text-sm font-medium text-branco">Salvar</button>
                </form>
              </>
            ) : (
              <p className="mt-1 text-sm">
                {i.cidade}/{i.uf} · {i.nichos.map((n) => ROTULO_NICHO[n] ?? n).join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
