// Cabeçalho simples, usado nas páginas públicas e no painel.
import Link from "next/link";
import { Logo } from "./Logo";

type Props = {
  // Se houver alguém logado, mostra "Sair" no lugar de "Entrar".
  logado?: boolean;
  // Página de pré-lançamento: esconde "Criar conta" para o foco ficar na
  // lista de espera (o "Entrar" fica discreto para a equipe).
  preLancamento?: boolean;
};

export function Cabecalho({ logado = false, preLancamento = false }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-petroleo/10 bg-branco/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="Staypse — página inicial">
          <Logo className="h-7 w-auto" />
        </Link>

        {logado ? (
          // Sair é um POST (evita que um link externo deslogue a pessoa)
          <form action="/sair" method="post">
            <button className="rounded-full border border-petroleo px-4 py-2 text-sm font-medium hover:bg-gelo">
              Sair
            </button>
          </form>
        ) : (
          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link href="/entrar" className="rounded-full px-4 py-2 hover:bg-gelo">
              Entrar
            </Link>
            {preLancamento ? (
              // Pré-lançamento: o botão principal é a lista de espera
              <Link href="/#lista" className="rounded-full bg-ciano px-4 py-2 text-petroleo hover:brightness-95">
                Entrar na lista
              </Link>
            ) : (
              <Link
                href="/cadastro"
                className="rounded-full bg-ciano px-4 py-2 text-petroleo hover:brightness-95"
              >
                Criar conta
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
