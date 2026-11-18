// Tabela dos painéis: no computador, tabela; no celular, lista de cartões
// (rótulo + valor), sem rolagem lateral. Estado vazio com uma ação clara.
import Link from "next/link";

export type Coluna = { titulo: string; numero?: boolean; principal?: boolean };
export type Linha = { chave: string; celulas: React.ReactNode[] };

export function TabelaDados({
  legenda,
  colunas,
  linhas,
  vazio,
}: {
  legenda: string;
  colunas: Coluna[];
  linhas: Linha[];
  vazio: { texto: string; acao?: { href: string; rotulo: string } };
}) {
  if (linhas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-branco p-5">
        <p className="text-petroleo/80">{vazio.texto}</p>
        {vazio.acao && (
          <Link href={vazio.acao.href} className="inline-flex min-h-11 items-center rounded-full bg-petroleo px-5 font-medium text-branco">
            {vazio.acao.rotulo}
          </Link>
        )}
      </div>
    );
  }
  const principal = Math.max(0, colunas.findIndex((c) => c.principal));
  return (
    <>
      {/* computador */}
      <div className="hidden overflow-x-auto rounded-2xl bg-branco md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            <tr className="border-b border-petroleo/10 text-left text-petroleo/75">
              {colunas.map((c) => (
                <th key={c.titulo} scope="col" className={`px-4 py-3 font-medium ${c.numero ? "text-right" : ""}`}>
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} className="border-b border-petroleo/10 last:border-0">
                {l.celulas.map((cel, i) => (
                  <td key={colunas[i].titulo} className={`px-4 py-3 align-top ${colunas[i].numero ? "text-right tabular-nums" : ""}`}>
                    {cel}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* celular */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label={legenda}>
        {linhas.map((l) => (
          <li key={l.chave} className="rounded-2xl bg-branco p-4 text-sm">
            <div className="font-medium">{l.celulas[principal]}</div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {l.celulas.map((cel, i) =>
                i === principal ? null : (
                  <div key={colunas[i].titulo} className="flex flex-col">
                    <dt className="text-petroleo/75">{colunas[i].titulo}</dt>
                    <dd className={colunas[i].numero ? "tabular-nums" : ""}>{cel}</dd>
                  </div>
                ),
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
