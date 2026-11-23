// Peças das lojas (site da loja operado pela Staypse). Visual neutro: fundo
// branco, a cor da loja só em botões, links e detalhes (variáveis --loja-*).
import Image from "next/image";
import Link from "next/link";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import type { ItemLoja } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";

// ---------- cabeçalho da loja ----------
// Logo em qualquer proporção (paisagem, retrato ou quadrada): altura fixa de 40px,
// largura proporcional (até 160px), sem cortar nada.
export function CabecalhoLoja({
  href,
  nome,
  logo,
  centralizado = false,
  previa = false,
}: {
  href: string;
  nome: string;
  logo: string | null;
  centralizado?: boolean;
  // na prévia do painel o cabeçalho não leva a lugar nenhum
  previa?: boolean;
}) {
  const conteudo = (
    <>
      {logo ? (
        <Image
          src={urlFoto(supabaseUrl(), logo)}
          alt=""
          width={160}
          height={40}
          className="h-10 w-auto max-w-40 shrink-0 object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--loja-principal)] text-base font-semibold text-[var(--loja-principal-texto)]"
        >
          {nome.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate text-base font-semibold">{nome}</span>
    </>
  );
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className={`mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 ${centralizado ? "justify-center" : "justify-between"}`}>
        {previa ? (
          <span className="flex min-w-0 items-center gap-3">{conteudo}</span>
        ) : (
          <Link href={href} className="flex min-h-11 min-w-0 items-center gap-3">
            {conteudo}
          </Link>
        )}
        {/* acompanhar o pedido sem criar conta: confiança de quem já comprou */}
        {!previa && !centralizado && (
          <Link href="/pedido" className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-neutral-700 underline underline-offset-4">
            Meu pedido
          </Link>
        )}
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
      <span className="line-clamp-2 min-h-10 text-sm leading-5 group-hover:underline">{nome}</span>
      <span className="text-base font-semibold tabular-nums">{formatarPreco(precoCentavos)}</span>
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

// ---------- "Produtos da mesma loja" (página do produto) ----------
export function ProdutosDaLoja({ slug, itens }: { slug: string; itens: ItemLoja[] }) {
  if (itens.length === 0) return null;
  return (
    <section aria-labelledby="mais-da-loja" className="flex flex-col gap-4 mt-4 border-t border-neutral-200 pt-8">
      <h2 id="mais-da-loja" className="text-xl font-semibold">
        Mais produtos da loja
      </h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {itens.map((i) => (
          <li key={i.id}>
            <CartaoProdutoLoja href={`/loja/${slug}/${i.slug}`} nome={i.nome} foto={i.fotos[0]} precoCentavos={i.preco_centavos} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export const classeGrade = "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4";

// Botão principal da loja (cor da marca, texto com contraste garantido)
export const classeBotaoLoja =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--loja-principal)] px-6 py-3 text-base font-semibold text-[var(--loja-principal-texto)] hover:opacity-90";
