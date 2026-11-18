"use client";
// Abas do painel da loja. Marca a atual (aria-current) e rola na horizontal no celular.
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  ["/painel/loja", "Resumo"],
  ["/painel/loja/pedidos", "Pedidos"],
  ["/painel/loja/produtos", "Produtos"],
  ["/painel/loja/afiliados", "Afiliados"],
  ["/painel/loja/vendedores", "Vendedores"],
  ["/painel/loja/minha-loja", "Minha loja"],
] as const;

export function AbasLoja() {
  const caminho = usePathname();
  return (
    <nav aria-label="Seções da loja" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-1 border-b border-petroleo/15">
        {ABAS.map(([href, rotulo]) => {
          const atual = href === "/painel/loja" ? caminho === href : caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={atual ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap ${
                  atual ? "border-petroleo text-petroleo" : "border-transparent text-petroleo/75 hover:text-petroleo"
                }`}
              >
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
