"use client";
// Abas das áreas do painel. Marca a área atual com aria-current (leitor de tela
// diz "página atual") e rola na horizontal no celular, sem quebrar a linha.
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LinksAreas({ areas }: { areas: { caminho: string; titulo: string }[] }) {
  const caminho = usePathname();
  return (
    <nav aria-label="Áreas do painel" className="border-b border-petroleo/10 bg-branco">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
        {areas.map((a) => {
          const atual = caminho === a.caminho || caminho.startsWith(`${a.caminho}/`);
          return (
            <li key={a.caminho} className="shrink-0">
              <Link
                href={a.caminho}
                aria-current={atual ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${
                  atual ? "border-petroleo text-petroleo" : "border-transparent text-petroleo/75 hover:text-petroleo"
                }`}
              >
                {a.titulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
