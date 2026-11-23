// Moldura das áreas logadas (painel e admin): cabeçalho, menu e conteúdo.
// Computador: menu lateral fixo + conteúdo. Celular: conteúdo + barra de baixo
// fixa (o rodapé legal ganha respiro extra pelo CSS global, ver globals.css).
import { Suspense } from "react";
import { Cabecalho } from "./Cabecalho";
import { NavPainel } from "./NavPainel";
import { SininhoComContador, SininhoNotificacoes } from "./SininhoNotificacoes";

export function MolduraPainel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Cabecalho
        logado
        largo
        acoes={
          // o contador carrega sem travar a página; enquanto isso o sino já aparece (sem número)
          <Suspense fallback={<SininhoNotificacoes naoLidas={null} />}>
            <SininhoComContador />
          </Suspense>
        }
      />
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* o espaço do menu já fica reservado enquanto a sessão carrega */}
        <Suspense fallback={<div aria-hidden="true" className="hidden w-64 shrink-0 border-r border-petroleo/10 bg-branco lg:block" />}>
          <NavPainel />
        </Suspense>
        <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 bg-gelo">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </>
  );
}
