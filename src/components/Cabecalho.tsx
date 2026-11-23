// Cabeçalho simples, usado nas páginas públicas e no painel.
import Link from "next/link";
import { Logo } from "./Logo";

const ATALHOS = [
  ["Como funciona", "/#como-funciona"],
  ["Para lojas", "/#para-lojas"],
  ["Para afiliados", "/#para-afiliados"],
  ["Perguntas", "/#faq"],
] as const;

type Props = {
  // Se houver alguém logado, mostra "Sair" no lugar de "Entrar".
  logado?: boolean;
  // Páginas públicas no pré-lançamento: sem "Entrar" nem "Criar conta". O único
  // botão é a lista de espera (/entrar e /cadastro seguem existindo para quem
  // tem o link, mas não são oferecidos ao público).
  preLancamento?: boolean;
  // Painéis com menu lateral: o logo alinha com o menu, sem largura máxima.
  largo?: boolean;
};

export function Cabecalho({ logado = false, preLancamento = false, largo = false }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-petroleo/10 bg-branco/95 backdrop-blur">
      <div className={`mx-auto flex items-center justify-between px-4 py-3 ${largo ? "lg:px-6" : "max-w-6xl"}`}>
        <Link href="/" aria-label="Staypse — página inicial">
          <Logo className="h-7 w-auto" />
        </Link>

        {logado ? (
          // Sair é um POST (evita que um link externo deslogue a pessoa)
          <form action="/sair" method="post">
            <button className="inline-flex min-h-11 items-center rounded-full border border-petroleo px-4 py-2 text-sm font-medium hover:bg-gelo">
              Sair
            </button>
          </form>
        ) : preLancamento ? (
          <nav aria-label="Principal" className="flex items-center gap-1 text-sm font-medium">
            {/* atalhos para as seções: só em telas maiores (no celular o botão basta) */}
            <div className="hidden items-center md:flex">
              {ATALHOS.map(([rotulo, href]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-full px-3 py-2 hover:bg-gelo">
                  {rotulo}
                </Link>
              ))}
            </div>
            <Link href="/#lista" className="inline-flex min-h-11 items-center rounded-full bg-ciano px-4 py-2 text-petroleo hover:brightness-95">
              Entrar na lista de espera
            </Link>
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
