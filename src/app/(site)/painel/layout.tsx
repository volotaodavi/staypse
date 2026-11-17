// Moldura de todas as páginas do painel (área logada).
import { Cabecalho } from "@/components/Cabecalho";

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <>
      <Cabecalho logado />
      <main className="flex flex-1 flex-col bg-gelo">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>
      </main>
    </>
  );
}
