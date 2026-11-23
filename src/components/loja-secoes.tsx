// Blocos da loja, montados a partir do tema em JSON (lib/tema-loja.ts).
// UM motor só: a página pública e a prévia ao vivo do painel usam este mesmo
// componente. Os 8 modelos mudam a ordem dos blocos (predefinição), o cartão de
// produto, o banner, os títulos e os espaços; o conjunto de blocos é o mesmo.
//
// O tamanho é decidido pela LARGURA DO CONTÊINER (@container), não da janela:
// assim a prévia "celular" mostra de verdade o layout de celular, mesmo num
// computador. Imagens sempre com proporção fixa (sem salto de layout) e
// "sizes"; só as primeiras imagens da página (prioridade) carregam com pressa.
import Image from "next/image";
import Link from "next/link";
import { FotoProduto } from "@/components/loja";
import { CarrosselBanners, VideoLoja, type SlideBanner } from "@/components/loja-blocos";
import { ListaFiltravel } from "@/components/loja-filtro";
import { ROTULO_NICHO } from "@/lib/lista";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import type { ItemLoja } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { MODELOS_LOJA, SECOES_LOJA, type CartaoTipo, type ModeloConfig, type ModeloLoja, type TemaLoja, type TipoSecao } from "@/lib/tema-loja";
import { ROTULO_TIPO } from "@/lib/vitrine";

export type DadosSobre = {
  slug: string;
  nome: string;
  descricao: string | null;
  razaoSocial: string;
  cidade: string | null;
  uf: string | null;
  email: string | null;
};

type Ctx = { cfg: ModeloConfig; slug: string; previa: boolean; itens: ItemLoja[] };

const rotuloCategoria = (c: string | null) => (c ? (ROTULO_NICHO[c] ?? c.replace(/_/g, " ")) : "Outros");

// ---------- cartão de produto (um por modelo) ----------
const SIZES: Record<CartaoTipo, string> = {
  simples: "(min-width: 768px) 25vw, 50vw",
  caixa: "(min-width: 768px) 25vw, 50vw",
  lista: "64px",
  retrato: "(min-width: 1024px) 33vw, (min-width: 448px) 50vw, 100vw",
  minimal: "(min-width: 896px) 25vw, (min-width: 672px) 33vw, 50vw",
  suave: "(min-width: 768px) 33vw, 50vw",
  denso: "(min-width: 896px) 20vw, (min-width: 672px) 33vw, 50vw",
  capa: "(min-width: 896px) 33vw, (min-width: 672px) 50vw, 100vw",
};

function Cartao({ item, ctx, prioridade = false, grande = false }: { item: ItemLoja; ctx: Ctx; prioridade?: boolean; grande?: boolean }) {
  const { cfg, slug, previa } = ctx;
  const href = `/loja/${slug}/${item.slug}`;
  const envolver = (classe: string, filhos: React.ReactNode) =>
    previa ? (
      <div className={classe}>{filhos}</div>
    ) : (
      <Link href={href} className={classe}>
        {filhos}
      </Link>
    );
  const sizes = grande ? "(min-width: 768px) 50vw, 100vw" : SIZES[cfg.cartao];
  const preco = formatarPreco(item.preco_centavos);

  switch (cfg.cartao) {
    case "lista":
      return envolver(
        "group flex min-h-16 items-center gap-3 py-3",
        <>
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--loja-raio)] bg-neutral-100">
            {item.fotos[0] && <Image src={urlFoto(supabaseUrl(), item.fotos[0])} alt="" fill sizes="64px" priority={prioridade} className="object-cover" />}
          </span>
          <span className="min-w-0 flex-1 text-sm group-hover:underline">
            <span className="line-clamp-2 text-base">{item.nome}</span>
            <span className="text-neutral-600">{rotuloCategoria(item.categoria)}</span>
          </span>
          <span className="shrink-0 text-base font-semibold tabular-nums">{preco}</span>
        </>,
      );
    case "retrato":
      return envolver(
        "group flex flex-col gap-3 text-center",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" formato="retrato" sizes={sizes} prioridade={prioridade} />
          <span className="line-clamp-2 text-lg font-light tracking-tight group-hover:underline">{item.nome}</span>
          <span className="text-base text-neutral-700 tabular-nums">{preco}</span>
        </>,
      );
    case "minimal":
      return envolver(
        "group flex flex-col gap-2",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" sizes={sizes} prioridade={prioridade} />
          <span className="line-clamp-1 text-sm text-neutral-900 group-hover:underline">{item.nome}</span>
          <span className="-mt-1 text-sm text-neutral-600 tabular-nums">{preco}</span>
        </>,
      );
    case "suave":
      return envolver(
        "group flex h-full flex-col gap-3 rounded-[var(--loja-raio)] bg-white p-3 ring-1 ring-black/5",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" formato="retrato" sizes={sizes} prioridade={prioridade} className="rounded-[calc(var(--loja-raio)-8px)]!" />
          <span className="line-clamp-2 min-h-10 px-1 text-center text-base leading-5 group-hover:underline">{item.nome}</span>
          <span className="px-1 pb-1 text-center text-base font-semibold text-[var(--loja-link)] tabular-nums">{preco}</span>
        </>,
      );
    case "denso":
      return envolver(
        "group flex h-full flex-col border border-neutral-300 bg-white",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" sizes={sizes} prioridade={prioridade} className="rounded-none! border-b border-neutral-200" />
          <span className="line-clamp-2 min-h-10 px-2 pt-2 text-sm leading-5 font-medium">{item.nome}</span>
          <span className="px-2 text-lg font-bold tabular-nums">{preco}</span>
          <span className="m-2 mt-auto inline-flex min-h-11 items-center justify-center rounded-[var(--loja-raio)] bg-[var(--loja-principal)] text-sm font-semibold text-[var(--loja-principal-texto)] group-hover:opacity-90">
            Ver produto
          </span>
        </>,
      );
    case "capa":
      return envolver(
        "group flex h-full flex-col gap-3",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" formato="paisagem" sizes={sizes} prioridade={prioridade} />
          <span className="flex flex-col gap-1">
            <span className="text-sm text-neutral-700">{ROTULO_TIPO[item.tipo] ?? item.tipo}</span>
            <span className="line-clamp-2 text-lg leading-6 font-semibold group-hover:underline">{item.nome}</span>
            <span className="text-xl font-semibold text-[var(--loja-link)] tabular-nums">{preco}</span>
          </span>
        </>,
      );
    case "caixa":
      return envolver(
        "group flex h-full flex-col gap-2 rounded-[var(--loja-raio)] border border-neutral-200 bg-white p-2",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" sizes={sizes} prioridade={prioridade} />
          <span className="line-clamp-2 min-h-10 px-1 text-sm leading-5 group-hover:underline">{item.nome}</span>
          <span className="px-1 pb-1 text-base font-bold text-[var(--loja-link)] tabular-nums">{preco}</span>
        </>,
      );
    default:
      return envolver(
        "group flex h-full flex-col gap-2",
        <>
          <FotoProduto caminho={item.fotos[0]} alt="" sizes={sizes} prioridade={prioridade} />
          <span className="line-clamp-2 min-h-10 text-sm leading-5 group-hover:underline">{item.nome}</span>
          <span className="text-base font-semibold tabular-nums">{preco}</span>
        </>,
      );
  }
}

// ---------- lista de produtos (a grade muda com o modelo) ----------
function classeLista(c: CartaoTipo, destaque: boolean) {
  switch (c) {
    case "lista":
      return "grid grid-cols-1 divide-y divide-neutral-200 border-y border-neutral-200 @2xl:grid-cols-2 @2xl:gap-x-10";
    case "retrato":
      return destaque ? "grid grid-cols-1 gap-x-6 gap-y-12 @2xl:grid-cols-2" : "grid grid-cols-1 gap-x-6 gap-y-12 @md:grid-cols-2 @3xl:grid-cols-3";
    case "minimal":
      return "grid grid-cols-2 gap-x-3 gap-y-8 @2xl:grid-cols-3 @4xl:grid-cols-4";
    case "suave":
      return "grid grid-cols-2 gap-3 @3xl:grid-cols-3 @3xl:gap-5";
    case "denso":
      return "grid grid-cols-2 gap-2 @2xl:grid-cols-3 @4xl:grid-cols-5";
    case "capa":
      return "grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @4xl:grid-cols-3";
    case "caixa":
      return "grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4";
    default:
      return "grid grid-cols-2 gap-x-4 gap-y-8 @3xl:grid-cols-4";
  }
}

function Produtos({ itens, ctx, prioridade = 0, destaque = false }: { itens: ItemLoja[]; ctx: Ctx; prioridade?: number; destaque?: boolean }) {
  const mosaico = ctx.cfg.cartao === "caixa" && destaque;
  return (
    <ul className={classeLista(ctx.cfg.cartao, destaque)}>
      {itens.map((item, i) => (
        // vitrine: no destaque, o primeiro produto ocupa 2 colunas (mosaico)
        <li key={item.id} className={mosaico && i === 0 ? "col-span-2 @3xl:row-span-2" : undefined}>
          <Cartao item={item} ctx={ctx} prioridade={i < prioridade} grande={mosaico && i === 0} />
        </li>
      ))}
    </ul>
  );
}

// "Mais produtos da loja" (página do produto): mesmo cartão e mesma grade do modelo
export function ProdutosRelacionados({ slug, modelo, itens }: { slug: string; modelo: ModeloLoja; itens: ItemLoja[] }) {
  if (itens.length === 0) return null;
  const ctx: Ctx = { cfg: MODELOS_LOJA[modelo], slug, previa: false, itens };
  return (
    <section aria-labelledby="mais-da-loja" className="mt-4 flex flex-col gap-4 border-t border-neutral-200 pt-8">
      <h2 id="mais-da-loja" className="text-xl font-semibold">
        Mais produtos da loja
      </h2>
      <Produtos itens={itens} ctx={ctx} />
    </section>
  );
}

// ---------- apresentação (banner sem imagem cadastrada): nome e descrição da loja ----------
function Apresentacao({ sobre, ctx, foto, prioridade }: { sobre: DadosSobre; ctx: Ctx; foto?: string; prioridade: boolean }) {
  const { cfg, previa } = ctx;
  const texto = sobre.descricao || `Conheça os produtos de ${sobre.nome}.`;
  const botao = previa ? (
    <span className="mt-5 inline-flex min-h-12 items-center rounded-[var(--loja-raio)] bg-[var(--loja-destaque)] px-6 text-base font-semibold text-[var(--loja-destaque-texto)]">Ver produtos</span>
  ) : (
    <a href="#produtos" className="mt-5 inline-flex min-h-12 items-center rounded-[var(--loja-raio)] bg-[var(--loja-destaque)] px-6 text-base font-semibold text-[var(--loja-destaque-texto)] hover:opacity-90">
      Ver produtos
    </a>
  );
  const centro = cfg.heroAlinha === "centro";
  switch (cfg.hero) {
    case "empilhado":
      return (
        <section aria-label="Apresentação" className={`mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-14 @2xl:py-20 ${centro ? "items-center text-center" : ""}`}>
          <h2 className="text-4xl leading-tight font-light tracking-tight text-balance @2xl:text-6xl">{sobre.nome}</h2>
          <p className="max-w-xl text-lg text-neutral-700">{texto}</p>
          <span className="mt-2 h-0.5 w-16 bg-[var(--loja-principal)]" aria-hidden="true" />
        </section>
      );
    case "dividido":
      return (
        <section aria-label="Apresentação" className="mx-auto w-full max-w-6xl px-4 pt-4">
          <div className={`grid overflow-hidden rounded-[var(--loja-raio)] @2xl:grid-cols-2 ${cfg.heroTom === "marca" ? "bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]" : "bg-white"}`}>
            <div className="flex flex-col items-start justify-center p-6 @2xl:p-12">
              <h2 className="text-3xl font-semibold text-balance @2xl:text-5xl">{sobre.nome}</h2>
              <p className="mt-3 max-w-md text-lg opacity-95">{texto}</p>
              {botao}
            </div>
            <div className="relative aspect-[4/3] @2xl:order-first @2xl:aspect-auto @2xl:min-h-96">
              {foto ? (
                <Image src={urlFoto(supabaseUrl(), foto)} alt="" fill sizes="(min-width: 1152px) 576px, 100vw" priority={prioridade} className="object-cover" />
              ) : (
                <span aria-hidden="true" className="absolute inset-0 bg-[var(--loja-destaque)]" />
              )}
            </div>
          </div>
        </section>
      );
    case "faixa":
      return (
        <section aria-label="Apresentação" className="mx-auto w-full max-w-6xl px-4 pt-4">
          <div className="flex flex-col gap-1 rounded-[var(--loja-raio)] bg-[var(--loja-principal)] px-5 py-5 text-[var(--loja-principal-texto)] @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6">
            <div>
              <h2 className="text-xl font-bold @2xl:text-2xl">{sobre.nome}</h2>
              <p className="line-clamp-2 max-w-2xl text-sm opacity-95">{texto}</p>
            </div>
            {botao}
          </div>
        </section>
      );
    case "cheio":
      return (
        <section aria-label="Apresentação" className="w-full bg-[var(--loja-principal)] px-4 py-14 text-[var(--loja-principal-texto)] @2xl:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start">
            <h2 className="max-w-2xl text-4xl leading-tight font-bold text-balance @2xl:text-6xl">{sobre.nome}</h2>
            <p className="mt-3 max-w-xl text-lg opacity-95">{texto}</p>
            {botao}
          </div>
        </section>
      );
    default:
      return (
        <section aria-label="Apresentação" className="mx-auto w-full max-w-6xl px-4 pt-4">
          <div className="rounded-[var(--loja-raio)] bg-[var(--loja-principal)] px-6 py-10 text-[var(--loja-principal-texto)] @2xl:py-16">
            <h2 className="text-2xl font-semibold @2xl:text-4xl">{sobre.nome}</h2>
            <p className="mt-2 max-w-xl text-base opacity-95">{texto}</p>
            {botao}
          </div>
        </section>
      );
  }
}

// ---------- título e espaço de cada bloco (mudam com o modelo) ----------
const TITULO: Record<CartaoTipo, string> = {
  simples: "mb-4 text-xl font-semibold",
  caixa: "mb-4 border-l-4 border-[var(--loja-principal)] pl-3 text-2xl font-bold",
  lista: "mb-3 border-b-2 border-[var(--loja-principal)] pb-2 text-lg font-semibold",
  retrato: "mb-8 text-center text-3xl font-light tracking-tight",
  minimal: "mb-6 text-base font-medium",
  suave: "mb-8 text-center text-2xl after:mx-auto after:mt-3 after:block after:h-0.5 after:w-12 after:bg-[var(--loja-principal)]",
  denso: "mb-3 bg-[var(--loja-principal)] px-3 py-2 text-lg font-bold text-[var(--loja-principal-texto)]",
  capa: "mb-6 text-2xl font-semibold",
};
const ESPACO: Record<CartaoTipo, string> = {
  simples: "py-6 @2xl:py-8",
  caixa: "py-6 @2xl:py-8",
  lista: "py-5 @2xl:py-6",
  retrato: "py-8 @2xl:py-12",
  minimal: "py-8 @2xl:py-14",
  suave: "py-8 @2xl:py-12",
  denso: "py-3 @2xl:py-4",
  capa: "py-6 @2xl:py-10",
};
const centrado = (c: CartaoTipo) => c === "retrato" || c === "suave";

function Secao({ tipo, titulo, children, cfg, id }: { tipo: TipoSecao; titulo?: string | null; children: React.ReactNode; cfg: ModeloConfig; id?: string }) {
  return (
    <section id={id} aria-labelledby={`sec-${tipo}`} className={`mx-auto w-full max-w-6xl scroll-mt-4 px-4 ${ESPACO[cfg.cartao]}`}>
      <h2 id={`sec-${tipo}`} className={TITULO[cfg.cartao]}>
        {titulo || SECOES_LOJA[tipo].rotulo}
      </h2>
      {children}
    </section>
  );
}

export function SecoesLoja({ tema, sobre, itens, previa = false }: { tema: TemaLoja; sobre: DadosSobre; itens: ItemLoja[]; previa?: boolean }) {
  const cfg = MODELOS_LOJA[tema.modelo];
  const ctx: Ctx = { cfg, slug: sobre.slug, previa, itens };
  const c = centrado(cfg.cartao);
  const visiveis = tema.secoes.filter((s) => s.visivel);
  const primeira = visiveis[0]?.tipo;
  // só a primeira seção da página carrega as fotos com pressa (as demais são lazy)
  const pressa = (tipo: TipoSecao) => (primeira === tipo ? 2 : 0);

  // conteúdo de cada bloco; bloco sem nada para mostrar some (não deixa buraco)
  const destaques = tema.destaques.map((id) => itens.find((i) => i.id === id)).filter((i): i is ItemLoja => !!i);
  const maisVendidos = itens
    .filter((i) => i.ordem_vendidos != null)
    .sort((a, b) => (a.ordem_vendidos ?? 0) - (b.ordem_vendidos ?? 0))
    .slice(0, cfg.cartao === "denso" ? 5 : 4);
  const porCategoria = new Map<string, ItemLoja[]>();
  for (const i of itens) porCategoria.set(i.categoria ?? "", [...(porCategoria.get(i.categoria ?? "") ?? []), i]);
  const primeiraCategoria = [...porCategoria.keys()][0];

  // banners: com a imagem escolhida; sem nenhum banner, a apresentação da loja
  const slides: SlideBanner[] = tema.banners.map((b) => {
    const item = b.produto ? itens.find((i) => i.id === b.produto) : undefined;
    return {
      desktop: b.imagem ? urlFoto(supabaseUrl(), b.imagem) : null,
      celular: b.celular ? urlFoto(supabaseUrl(), b.celular) : null,
      frase: b.frase,
      alt: b.alt ?? (b.frase ? "" : "Imagem de destaque da loja"),
      href: item ? `/loja/${sobre.slug}/${item.slug}` : b.url,
      externo: !item && !!b.url,
      rotuloBotao: item ? "Ver produto" : "Saiba mais",
    };
  });

  const colecoes = [...porCategoria.entries()]
    .filter(([cat]) => cat)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  const conteudo: Record<TipoSecao, () => React.ReactNode> = {
    banner: () =>
      slides.length > 0 ? (
        <CarrosselBanners slides={slides} tipo={cfg.hero} alinha={cfg.heroAlinha} tom={cfg.heroTom} previa={previa} />
      ) : (
        <Apresentacao sobre={sobre} ctx={ctx} foto={itens[0]?.fotos[0]} prioridade={primeira === "banner"} />
      ),
    destaques: () =>
      destaques.length > 0 && (
        <Secao tipo="destaques" cfg={cfg}>
          <Produtos itens={destaques} ctx={ctx} destaque prioridade={pressa("destaques")} />
        </Secao>
      ),
    colecoes: () =>
      colecoes.length > 1 && (
        <Secao tipo="colecoes" cfg={cfg}>
          <ul className={`grid gap-3 ${colecoes.length === 2 ? "grid-cols-2" : "grid-cols-2 @2xl:grid-cols-3"}`}>
            {colecoes.map(([cat, lista], i) => {
              const imagem = tema.colecoes.find((x) => x.categoria === cat)?.imagem ?? lista[0]?.fotos[0];
              const href = `/loja/${sobre.slug}?cat=${cat}#produtos`;
              const miolo = (
                <>
                  <span className={`relative block w-full overflow-hidden rounded-[var(--loja-raio)] bg-neutral-100 ${c ? "aspect-[4/5]" : "aspect-[4/3]"}`}>
                    {imagem && (
                      <Image
                        src={urlFoto(supabaseUrl(), imagem)}
                        alt=""
                        fill
                        sizes="(min-width: 1152px) 360px, (min-width: 672px) 33vw, 50vw"
                        priority={primeira === "colecoes" && i < 2}
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className={`mt-2 block text-base font-medium group-hover:underline ${c ? "text-center" : ""}`}>{rotuloCategoria(cat)}</span>
                  <span className={`block text-sm text-neutral-600 ${c ? "text-center" : ""}`}>{lista.length === 1 ? "1 produto" : `${lista.length} produtos`}</span>
                </>
              );
              return (
                <li key={cat}>
                  {previa ? (
                    <div className="group block">{miolo}</div>
                  ) : (
                    <Link href={href} className="group block">
                      {miolo}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Secao>
      ),
    mais_vendidos: () =>
      maisVendidos.length > 0 && (
        <Secao tipo="mais_vendidos" cfg={cfg}>
          <Produtos itens={maisVendidos} ctx={ctx} prioridade={pressa("mais_vendidos")} />
        </Secao>
      ),
    todos_produtos: () => (
      <Secao tipo="todos_produtos" cfg={cfg} id="produtos">
        {itens.length === 0 ? (
          <div className={`flex max-w-md flex-col gap-1 rounded-[var(--loja-raio)] border border-neutral-200 p-6 ${c ? "mx-auto text-center" : ""}`}>
            <p className="text-base font-medium text-neutral-900">Esta loja ainda não tem produtos</p>
            <p className="text-sm text-neutral-700">Os produtos aparecem aqui assim que a loja publicar o primeiro.</p>
          </div>
        ) : itens.length >= 2 && (porCategoria.size > 1 || itens.length >= 8) ? (
          // 2 ou mais categorias: filtro por categoria; 8 ou mais produtos: busca por nome
          <ListaFiltravel
            classeLista={classeLista(cfg.cartao, false)}
            comBusca={itens.length >= 8}
            centralizado={c}
            itens={itens.map((item, i) => ({
              id: item.id,
              nome: item.nome,
              categoria: item.categoria ?? "",
              rotuloCategoria: rotuloCategoria(item.categoria),
              no: <Cartao item={item} ctx={ctx} prioridade={i < pressa("todos_produtos")} />,
            }))}
          />
        ) : (
          <Produtos itens={itens} ctx={ctx} prioridade={pressa("todos_produtos")} />
        )}
      </Secao>
    ),
    categorias: () =>
      porCategoria.size > 1 && (
        <Secao tipo="categorias" cfg={cfg}>
          <div className="flex flex-col gap-8">
            {[...porCategoria.entries()].map(([cat, lista]) => (
              <div key={cat || "outros"}>
                <h3 className="mb-3 text-base font-semibold">
                  {rotuloCategoria(cat || null)} <span className="font-normal text-neutral-600">({lista.length})</span>
                </h3>
                <Produtos itens={lista.slice(0, 8)} ctx={ctx} prioridade={cat === primeiraCategoria ? pressa("categorias") : 0} />
              </div>
            ))}
          </div>
        </Secao>
      ),
    sobre: () => {
      const imagem = tema.sobre.imagem;
      const corpo = (
        <div className={`flex max-w-2xl flex-col gap-2 text-base text-neutral-700 ${c && !imagem ? "mx-auto text-center" : ""}`}>
          <p className="whitespace-pre-line">{tema.sobre.texto || sobre.descricao || `Conheça os produtos de ${sobre.nome}.`}</p>
          <p className="text-sm text-neutral-600">
            {sobre.razaoSocial}
            {sobre.cidade && `, ${[sobre.cidade, sobre.uf].filter(Boolean).join("/")}`}
          </p>
        </div>
      );
      return (
        <Secao tipo="sobre" titulo={tema.sobre.titulo} cfg={cfg}>
          {imagem ? (
            <div className="grid items-center gap-6 @2xl:grid-cols-2 @2xl:gap-10">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--loja-raio)] bg-neutral-100">
                <Image src={urlFoto(supabaseUrl(), imagem)} alt="" fill sizes="(min-width: 1152px) 560px, (min-width: 672px) 50vw, 100vw" className="object-cover" />
              </div>
              {corpo}
            </div>
          ) : (
            corpo
          )}
        </Secao>
      );
    },
    video: () =>
      tema.video && (
        <Secao tipo="video" titulo={tema.video.titulo ? "Vídeo" : undefined} cfg={cfg}>
          <div className={`max-w-3xl ${c ? "mx-auto" : ""}`}>
            <VideoLoja video={tema.video} previa={previa} />
          </div>
        </Secao>
      ),
    faq: () =>
      tema.faq.length > 0 && (
        <Secao tipo="faq" cfg={cfg}>
          <div className={`max-w-3xl border-t border-neutral-200 ${c ? "mx-auto" : ""}`}>
            {tema.faq.map((f, i) => (
              <details key={i} className="group border-b border-neutral-200">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {f.p}
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform group-open:rotate-180">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="pb-4 text-base whitespace-pre-line text-neutral-700">{f.r}</p>
              </details>
            ))}
          </div>
        </Secao>
      ),
    trocas_entrega: () => (
      <Secao tipo="trocas_entrega" cfg={cfg}>
        <ul className={`flex max-w-2xl flex-col gap-2 text-base text-neutral-700 ${c ? "mx-auto text-center" : ""}`}>
          <li>Você pode desistir da compra em até 7 dias depois de receber o produto e recebe de volta tudo o que pagou (Código de Defesa do Consumidor, art. 49).</li>
          <li>O prazo de postagem ou de acesso aparece na página de cada produto.</li>
          {sobre.email && <li>Dúvidas? Fale com a loja: {sobre.email}</li>}
        </ul>
      </Secao>
    ),
  };

  return (
    <>
      {visiveis.map((s) => (
        <div key={s.tipo}>{conteudo[s.tipo]()}</div>
      ))}
    </>
  );
}
