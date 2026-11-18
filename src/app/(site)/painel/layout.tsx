// Moldura de todas as páginas do painel (área logada).
import { Suspense } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { NavPainel } from "@/components/NavPainel";

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <>
      <Cabecalho logado />
      {/* abas entre áreas (só para quem tem mais de um papel) */}
      <Suspense fallback={null}>
        <NavPainel />
      </Suspense>
      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col bg-gelo">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>
      </main>
    </>
  );
}
