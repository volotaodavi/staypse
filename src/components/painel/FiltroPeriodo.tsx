// Filtro de período (links + formulário GET para o personalizado).
// Funciona sem JavaScript e mantém os outros filtros da página.
import Link from "next/link";
import { OPCOES_PERIODO, parametrosPeriodo, type Periodo } from "@/lib/periodo";

export function FiltroPeriodo({ periodo, caminho, extras = {} }: { periodo: Periodo; caminho: string; extras?: Record<string, string> }) {
  const link = (chave: string) => `${caminho}?${new URLSearchParams({ ...extras, periodo: chave }).toString()}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label="Período" className="-mx-4 max-w-[100vw] overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1 rounded-xl border border-petroleo/10 bg-branco p-1">
            {OPCOES_PERIODO.filter(([k]) => k !== "personalizado").map(([chave, rotulo]) => (
              <li key={chave}>
                <Link
                  href={link(chave)}
                  aria-current={periodo.chave === chave ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    periodo.chave === chave ? "bg-petroleo text-branco" : "text-petroleo/80 hover:bg-gelo hover:text-petroleo"
                  }`}
                >
                  {rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-petroleo/75" data-periodo>
          {periodo.rotulo}
        </p>
        <details open={periodo.chave === "personalizado"} className="text-sm open:w-full">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium underline">Escolher datas</summary>
          <form action={caminho} method="get" className="mt-2 flex flex-wrap items-end gap-2">
            {Object.entries(extras).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <input type="hidden" name="periodo" value="personalizado" />
            <label className="flex flex-col gap-1">
              De
              <input
                type="date"
                name="de"
                required
                defaultValue={periodo.de}
                className="min-h-11 rounded-lg border border-petroleo/60 bg-branco px-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              Até
              <input
                type="date"
                name="ate"
                required
                defaultValue={periodo.ate}
                className="min-h-11 rounded-lg border border-petroleo/60 bg-branco px-3"
              />
            </label>
            <button className="min-h-11 rounded-lg bg-petroleo px-5 font-medium text-branco">Aplicar</button>
          </form>
        </details>
      </div>
    </div>
  );
}

// link de CSV que leva o mesmo período e filtros
export function LinkCsv({
  caminho,
  periodo,
  extras = {},
  children,
}: {
  caminho: string;
  periodo: Periodo;
  extras?: Record<string, string>;
  children: React.ReactNode;
}) {
  const q = new URLSearchParams({
    ...extras,
    ...parametrosPeriodo(periodo),
  }).toString();
  return (
    <a href={`${caminho}?${q}`} download className="inline-flex min-h-11 items-center text-sm font-medium underline">
      {children}
    </a>
  );
}
