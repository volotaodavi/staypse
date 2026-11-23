// Paginação por links (?pagina=2), mantendo os outros filtros da página.
import Link from "next/link";

export const POR_PAGINA = 20;

// número da página pedida na URL (1 ou mais)
export function lerPagina(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1;
}

export function Paginacao({
  caminho,
  pagina,
  total,
  filtros = {},
}: {
  caminho: string;
  pagina: number;
  total: number;
  filtros?: Record<string, string>;
}) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => `${caminho}?${new URLSearchParams({ ...filtros, pagina: String(p) }).toString()}`;
  const classe = "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium";
  return (
    <nav aria-label="Páginas" className="mt-4 flex flex-wrap items-center justify-between gap-2">
      {pagina > 1 ? (
        <Link href={link(pagina - 1)} rel="prev" className={`${classe} bg-petroleo text-branco`}>
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-petroleo/80">
        Página {pagina} de {paginas} · {total} {total === 1 ? "registro" : "registros"}
      </p>
      {pagina < paginas ? (
        <Link href={link(pagina + 1)} rel="next" className={`${classe} bg-petroleo text-branco`}>
          Próxima →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
