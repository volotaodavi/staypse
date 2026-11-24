// Peças das lojas (site da loja operado pela Staypse). Visual neutro: fundo
// branco, a cor da loja só em botões, links e detalhes (variáveis --loja-*).
import Image from "next/image";
import Link from "next/link";
import { ROTULO_NICHO } from "@/lib/lista";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import type { ItemLoja } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { REDES, urlDaRede, type CabecalhoTipo, type TemaLoja } from "@/lib/tema-loja";

// ---------- faixa de anúncio (texto curto + link opcional) ----------
export function AnuncioLoja({ anuncio, previa = false }: { anuncio: TemaLoja["anuncio"]; previa?: boolean }) {
  if (!anuncio.visivel || !anuncio.texto) return null;
  const classe = "block bg-[var(--loja-principal)] px-4 py-3 text-center text-sm text-[var(--loja-principal-texto)]";
  return anuncio.url && !previa ? (
    <a href={anuncio.url} rel="noopener noreferrer" className={`${classe} underline-offset-4 hover:underline`}>
      {anuncio.texto}
    </a>
  ) : (
    <p className={classe}>{anuncio.texto}</p>
  );
}

// ---------- cabeçalho da loja: logo, menu com categorias e busca ----------
// Logo em qualquer proporção (paisagem, retrato ou quadrada): altura fixa de 40px,
// largura proporcional (até 160px), sem cortar nada.
export type ItemMenu = { rotulo: string; href: string; externo?: boolean };

export function itensDoMenu(tema: TemaLoja, slug: string, itens: ItemLoja[]): ItemMenu[] {
  const doMenu: ItemMenu[] = [];
  if (tema.cabecalho.menu) {
    const categorias = [...new Set(itens.map((i) => i.categoria).filter((c): c is string => !!c))].slice(0, 6);
    for (const c of categorias) doMenu.push({ rotulo: ROTULO_NICHO[c] ?? c.replace(/_/g, " "), href: `/loja/${slug}?cat=${c}#produtos` });
  }
  for (const l of tema.cabecalho.links) doMenu.push({ rotulo: l.rotulo, href: l.url, externo: true });
  return doMenu;
}

export function CabecalhoLoja({
  href,
  nome,
  logo,
  tipo = "claro",
  slug,
  menu = [],
  busca = false,
  previa = false,
}: {
  href: string;
  nome: string;
  logo: string | null;
  tipo?: CabecalhoTipo;
  slug: string;
  menu?: ItemMenu[];
  busca?: boolean;
  // na prévia do painel o cabeçalho não leva a lugar nenhum
  previa?: boolean;
}) {
  const marca = tipo === "marca";
  const centro = tipo === "centro";
  const leve = tipo === "leve";
  const conteudo = (
    <>
      {logo ? (
        <Image src={urlFoto(supabaseUrl(), logo)} alt="" width={160} height={40} className="h-10 w-auto max-w-40 shrink-0 object-contain" style={{ width: "auto" }} />
      ) : (
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--loja-raio,6px)] text-base font-semibold ${
            marca ? "bg-[var(--loja-destaque)] text-[var(--loja-destaque-texto)]" : "bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]"
          }`}
        >
          {nome.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={`truncate ${centro ? "text-xl tracking-tight" : leve ? "text-sm font-medium" : "text-base font-semibold"}`}>{nome}</span>
    </>
  );
  const cores = marca
    ? "bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]"
    : leve
      ? "bg-[var(--loja-fundo,#fff)]"
      : "border-b border-neutral-200 bg-[var(--loja-fundo,#fff)]";
  const linkClasse = `inline-flex min-h-11 items-center rounded-[var(--loja-raio,6px)] px-3 text-sm font-medium whitespace-nowrap ${
    marca ? "hover:bg-white/15" : "text-neutral-800 hover:bg-neutral-100"
  }`;
  const pedido = (
    <Link href="/pedido" className={`inline-flex min-h-11 shrink-0 items-center text-sm font-medium underline underline-offset-4 ${marca ? "" : "text-neutral-700"}`}>
      Meu pedido
    </Link>
  );
  // na prévia do painel (que já está dentro de um formulário) não pode haver outro <form>
  const Caixa = previa ? "div" : "form";
  const formBusca = busca && (
    <Caixa {...(previa ? { role: "search" } : { action: `/loja/${slug}#produtos`, method: "get", role: "search" })} className="flex w-full min-w-0 @2xl:max-w-xs">
      <label className="sr-only" htmlFor={`busca-${slug}`}>
        Buscar nesta loja
      </label>
      <input
        id={`busca-${slug}`}
        type="search"
        name="q"
        maxLength={60}
        autoComplete="off"
        placeholder="Buscar produtos"
        className="min-h-11 min-w-0 flex-1 rounded-l-[var(--loja-raio,6px)] border border-neutral-500 bg-white px-3 text-base text-neutral-900 placeholder:text-neutral-600 focus:ring-2 focus:ring-[var(--loja-destaque)] focus:outline-none"
      />
      <button
        type={previa ? "button" : "submit"}
        className="inline-flex min-h-11 items-center rounded-r-[var(--loja-raio,6px)] bg-[var(--loja-destaque)] px-4 text-sm font-semibold text-[var(--loja-destaque-texto)] hover:opacity-90"
      >
        Buscar
      </button>
    </Caixa>
  );
  const temNav = menu.length > 0 || busca;

  return (
    <header className={cores}>
      <div className={`mx-auto flex max-w-6xl flex-col px-4 ${centro ? "items-center gap-1 pt-4 pb-2" : leve ? "gap-1 pt-3 pb-2" : "gap-1 py-2"}`}>
        <div className={`flex w-full items-center gap-3 ${centro ? "justify-center" : "justify-between"}`}>
          {previa ? (
            <span className="flex min-w-0 items-center gap-3">{conteudo}</span>
          ) : (
            <Link href={href} className="flex min-h-11 min-w-0 items-center gap-3">
              {conteudo}
            </Link>
          )}
          {/* acompanhar o pedido sem criar conta: confiança de quem já comprou */}
          {!previa && !centro && pedido}
        </div>
        {temNav && (
          <div className={`flex w-full flex-col gap-1 @2xl:flex-row @2xl:items-center ${centro ? "@2xl:justify-center" : "@2xl:justify-between"}`}>
            {menu.length > 0 && (
              <nav aria-label="Menu da loja" className="-mx-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ul className={`flex w-max items-center ${centro ? "@2xl:mx-auto" : ""}`}>
                  {menu.map((m) => (
                    <li key={m.href}>
                      {previa ? (
                        <span className={linkClasse}>{m.rotulo}</span>
                      ) : m.externo ? (
                        <a href={m.href} rel="noopener noreferrer" className={linkClasse}>
                          {m.rotulo}
                        </a>
                      ) : (
                        <Link href={m.href} className={linkClasse}>
                          {m.rotulo}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            {formBusca}
          </div>
        )}
        {!previa && centro && <div className="-mt-1">{pedido}</div>}
      </div>
    </header>
  );
}

// ---------- rodapé da loja: contatos, redes e links (os dados legais ficam no rodapé do site) ----------
export function RodapeLoja({
  nome,
  descricao,
  email,
  rodape,
  previa = false,
}: {
  nome: string;
  descricao: string | null;
  email: string | null;
  rodape: TemaLoja["rodape"];
  previa?: boolean;
}) {
  const redes = REDES.filter((r) => rodape[r]).map((r) => ({ rotulo: { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" }[r], href: urlDaRede(r, rodape[r]!) }));
  if (rodape.whatsapp) redes.push({ rotulo: "WhatsApp", href: `https://wa.me/${rodape.whatsapp}` });
  const todos = [...redes, ...rodape.links.map((l) => ({ rotulo: l.rotulo, href: l.url }))];
  const classe = "inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:no-underline";
  return (
    <footer className="mt-auto bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 @2xl:flex-row @2xl:justify-between">
        <div className="flex max-w-md flex-col gap-1">
          <p className="text-lg font-semibold">{nome}</p>
          {descricao && <p className="line-clamp-3 text-sm opacity-90">{descricao}</p>}
          {email &&
            (previa ? (
              <span className="text-sm">{email}</span>
            ) : (
              <a href={`mailto:${email}`} className={classe}>
                {email}
              </a>
            ))}
        </div>
        {todos.length > 0 && (
          <nav aria-label="Redes e links da loja">
            <ul className="flex flex-wrap gap-x-5 @2xl:justify-end">
              {todos.map((l) => (
                <li key={l.href}>
                  {previa ? (
                    <span className="inline-flex min-h-11 items-center text-sm underline">{l.rotulo}</span>
                  ) : (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className={classe}>
                      {l.rotulo}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}

// ---------- foto (1:1, 4:5 ou 4:3, cantos pelo modelo) ----------
export function FotoProduto({
  caminho,
  alt,
  formato = "quadrado",
  sizes,
  prioridade = false,
  className = "",
}: {
  caminho: string | undefined;
  alt: string;
  formato?: "quadrado" | "retrato" | "paisagem";
  sizes: string;
  prioridade?: boolean;
  className?: string;
}) {
  const proporcao = formato === "retrato" ? "aspect-[4/5]" : formato === "paisagem" ? "aspect-[4/3]" : "aspect-square";
  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--loja-raio,6px)] bg-neutral-100 ${proporcao} ${className}`}>
      {caminho ? (
        <Image src={urlFoto(supabaseUrl(), caminho)} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm text-neutral-600">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M9 9.5h.01" />
          </svg>
          Sem foto
        </span>
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

export const classeGrade = "grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4";

// Botão principal da loja (cor da marca, texto com contraste garantido)
export const classeBotaoLoja =
  "inline-flex min-h-12 items-center justify-center rounded-[var(--loja-raio,6px)] bg-[var(--loja-principal)] px-6 py-3 text-base font-semibold text-[var(--loja-principal-texto)] hover:opacity-90";
