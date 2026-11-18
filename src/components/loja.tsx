// Peças das lojas (site da loja operado pela Staypse). Visual neutro: fundo
// branco, a cor da loja só em botões, links e detalhes (variáveis --loja-*).
import Image from "next/image";
import Link from "next/link";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import { supabaseUrl } from "@/lib/supabase/env";

// ---------- cabeçalho da loja ----------
export function CabecalhoLoja({
  href,
  nome,
  logo,
  centralizado = false,
}: {
  href: string;
  nome: string;
  logo: string | null;
  centralizado?: boolean;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className={`mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 ${centralizado ? "justify-center" : ""}`}>
        <Link href={href} className="flex min-w-0 items-center gap-3">
          {logo ? (
            <Image src={urlFoto(supabaseUrl(), logo)} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--loja-principal)] text-base font-semibold text-[var(--loja-principal-texto)]"
            >
              {nome.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-base font-semibold">{nome}</span>
        </Link>
      </div>
    </header>
  );
}

// ---------- foto (1:1 ou 4:5, cantos de no máximo 8px) ----------
export function FotoProduto({
  caminho,
  alt,
  formato = "quadrado",
  sizes,
  prioridade = false,
}: {
  caminho: string | undefined;
  alt: string;
  formato?: "quadrado" | "retrato";
  sizes: string;
  prioridade?: boolean;
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-md bg-neutral-100 ${formato === "retrato" ? "aspect-[4/5]" : "aspect-square"}`}>
      {caminho ? (
        <Image src={urlFoto(supabaseUrl(), caminho)} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-neutral-600">Sem foto</span>
      )}
    </div>
  );
}

// ---------- cartão de produto da grade ----------
export function CartaoProdutoLoja({
  href,
  nome,
  foto,
  precoCentavos,
  formato,
  centralizado = false,
  prioridade = false,
  redirecionamento = false,
  rodape,
}: {
  href: string;
  nome: string;
  foto?: string;
  precoCentavos: number;
  formato?: "quadrado" | "retrato";
  centralizado?: boolean;
  prioridade?: boolean;
  // link curto /@afiliado/produto passa por um redirecionamento: <a> simples,
  // sem pré-carregamento (senão o clique seria contado sem a pessoa clicar)
  redirecionamento?: boolean;
  rodape?: React.ReactNode;
}) {
  const conteudo = (
    <>
      <FotoProduto caminho={foto} alt="" formato={formato} sizes="(min-width: 768px) 25vw, 50vw" prioridade={prioridade} />
      <span className="line-clamp-2 text-sm group-hover:underline">{nome}</span>
      <span className="text-base font-semibold">{formatarPreco(precoCentavos)}</span>
      {rodape}
    </>
  );
  const classe = `group flex flex-col gap-2 ${centralizado ? "items-center text-center" : ""}`;
  return redirecionamento ? (
    <a href={href} rel="nofollow" className={classe}>
      {conteudo}
    </a>
  ) : (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  );
}

export const classeGrade = "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4";

// Botão principal da loja (cor da marca, texto com contraste garantido)
export const classeBotaoLoja =
  "inline-flex items-center justify-center rounded-md bg-[var(--loja-principal)] px-6 py-3 text-base font-semibold text-[var(--loja-principal-texto)] hover:opacity-90";
