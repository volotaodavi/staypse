// Cabeçalho simples, usado nas páginas públicas e no painel.
import Link from "next/link";
import { Logo } from "./Logo";

const ATALHOS = [
  ["Como funciona", "/#como-funciona"],
  ["Para lojas", "/#para-lojas"],
  ["Para afiliados", "/#para-afiliados"],
  ["Taxas", "/#taxas"],
  ["Perguntas", "/#faq"],
] as const;

type Props = {
  // Se houver alguém logado, mostra "Sair" no lugar de "Entrar".
  logado?: boolean;
  // Páginas públicas: atalhos das seções (só em tela maior) mais "Entrar" e "Criar conta".
  preLancamento?: boolean;
  // Painéis com menu lateral: o logo alinha com o menu, sem largura máxima.
  largo?: boolean;
  // Painéis: atalhos ao lado do "Sair" (ex.: sininho de notificações).
  acoes?: React.ReactNode;
};

export function Cabecalho({ logado = false, preLancamento = false, largo = false, acoes }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-petroleo/10 bg-branco">
      <div className={`mx-auto flex items-center justify-between px-4 py-3 ${largo ? "lg:px-6" : "max-w-6xl"}`}>
        <Link href="/" aria-label="Staypse, página inicial" className="inline-flex min-h-11 items-center">
          <Logo className="h-7 w-auto" />
        </Link>

        {logado ? (
          <div className="flex items-center gap-2">
            {acoes}
            {/* Sair é um POST (evita que um link externo deslogue a pessoa) */}
            <form action="/sair" method="post">
              <button className="inline-flex min-h-11 items-center rounded-full border border-petroleo px-4 py-2 text-sm font-medium hover:bg-gelo">
                Sair
              </button>
            </form>
          </div>
        ) : preLancamento ? (
          <nav aria-label="Principal" className="flex items-center gap-1 text-sm font-medium">
            {/* atalhos para as seções: só em telas maiores (no celular o botão basta) */}
            <div className="hidden items-center lg:flex">
              {ATALHOS.map(([rotulo, href]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-full px-3 py-2 hover:bg-gelo">
                  {rotulo}
                </Link>
              ))}
            </div>
            <Link href="/entrar" className="hidden min-h-11 items-center rounded-full px-3 py-2 hover:bg-gelo sm:inline-flex">
              Entrar
            </Link>
            <Link href="/cadastro" className="inline-flex min-h-11 items-center rounded-full bg-ciano px-4 py-2 text-petroleo hover:brightness-95">
              Criar conta
            </Link>
            {/* menu do celular: sanfona nativa, sem JavaScript */}
            <details className="group relative lg:hidden">
              <summary
                aria-label="Menu"
                className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-gelo [&::-webkit-details-marker]:hidden"
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#062C30" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 6h16M3 11h16M3 16h16" />
                </svg>
              </summary>
              <div className="absolute top-12 right-0 flex w-56 flex-col rounded-2xl border border-petroleo/10 bg-branco p-2 shadow-lg">
                {ATALHOS.map(([rotulo, href]) => (
                  <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-xl px-3 hover:bg-gelo">
                    {rotulo}
                  </Link>
                ))}
                <Link href="/entrar" className="inline-flex min-h-11 items-center rounded-xl px-3 hover:bg-gelo sm:hidden">
                  Entrar
                </Link>
              </div>
            </details>
          </nav>
        ) : (
          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link href="/entrar" className="inline-flex min-h-11 items-center rounded-full px-4 py-2 hover:bg-gelo">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex min-h-11 items-center rounded-full bg-ciano px-4 py-2 text-petroleo hover:brightness-95"
            >
              Criar conta
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
