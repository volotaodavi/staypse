// Moldura dos documentos jurídicos (Termos, Privacidade, Contrato do Produtor...):
// título, versão, resumo em linguagem simples, sumário clicável e seções numeradas.
// Feito para ler no celular: coluna estreita e sumário recolhível.
import { Cabecalho } from "./Cabecalho";

export type Secao = { id: string; titulo: string; conteudo: React.ReactNode };

export function DocumentoLegal({
  titulo,
  versao,
  resumo,
  secoes,
  rodape,
}: {
  titulo: string;
  versao: string;
  resumo?: React.ReactNode;
  secoes: Secao[];
  rodape?: React.ReactNode;
}) {
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl">{titulo}</h1>
        <p className="mt-2 text-sm text-petroleo/75">Versão {versao}</p>

        {resumo && (
          <aside aria-label="Resumo" className="mt-6 rounded-2xl bg-gelo p-5 leading-relaxed">
            <p className="font-medium">Em poucas palavras</p>
            <div className="mt-2 flex flex-col gap-2 text-petroleo/90">{resumo}</div>
          </aside>
        )}

        <details className="group mt-6 rounded-2xl border border-petroleo/15 p-4" open>
          <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
            Sumário <span className="text-sm text-petroleo/70 group-open:hidden">(toque para abrir)</span>
          </summary>
          <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-sm sm:grid-cols-2">
            {secoes.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-block py-1 underline-offset-2 hover:underline">
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </details>

        <ol className="mt-8 flex flex-col gap-8">
          {secoes.map((s, i) => (
            <li key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl">
                {i + 1}. {s.titulo}
              </h2>
              <div className="mt-3 flex flex-col gap-3 leading-relaxed text-petroleo/90">{s.conteudo}</div>
            </li>
          ))}
        </ol>

        {rodape && <div className="mt-10 border-t border-petroleo/15 pt-6 text-sm text-petroleo/80">{rodape}</div>}
      </main>
    </>
  );
}

// Lista com marcadores, no padrão dos documentos
export function Itens({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}
