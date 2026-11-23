// Seções da loja, montadas a partir do tema em JSON (lib/tema-loja.ts).
// UM motor só: a página pública e a prévia ao vivo do painel usam este mesmo
// componente. Os 4 modelos mudam a ordem/visibilidade das seções (predefinição)
// e o estilo dos cartões e do banner; o conjunto de seções é o mesmo.
//
// O tamanho é decidido pela LARGURA DO CONTÊINER (@container), não da janela:
// assim a prévia "celular" mostra de verdade o layout de celular, mesmo num
// computador. Imagens sempre com proporção fixa (sem salto de layout) e
// "sizes"; só a primeira imagem da página (prioridade) carrega com pressa.
import Image from "next/image";
import Link from "next/link";
import { FotoProduto, classeBotaoLoja } from "@/components/loja";
import { ROTULO_NICHO } from "@/lib/lista";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import type { ItemLoja } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { SECOES_LOJA, type ModeloLoja, type TemaLoja, type TipoSecao } from "@/lib/tema-loja";

export type DadosSobre = {
  slug: string;
  nome: string;
  descricao: string | null;
  razaoSocial: string;
  cidade: string | null;
  uf: string | null;
  email: string | null;
};

type Ctx = { modelo: ModeloLoja; slug: string; previa: boolean; itens: ItemLoja[] };

const rotuloCategoria = (c: string | null) => (c ? (ROTULO_NICHO[c] ?? c.replace(/_/g, " ")) : "Outros");

// ---------- cartão de produto (muda de estilo conforme o modelo) ----------
function Cartao({ item, ctx, prioridade = false, grande = false }: { item: ItemLoja; ctx: Ctx; prioridade?: boolean; grande?: boolean }) {
  const { modelo, slug, previa } = ctx;
  const href = `/loja/${slug}/${item.slug}`;
  const envolver = (classe: string, filhos: React.ReactNode) =>
    previa ? (
      <div className={classe}>{filhos}</div>
    ) : (
      <Link href={href} className={classe}>
        {filhos}
      </Link>
    );

  if (modelo === "catalogo") {
    return envolver(
      "group flex min-h-16 items-center gap-3 py-3",
      <>
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-neutral-100">
          {item.fotos[0] && (
            <Image src={urlFoto(supabaseUrl(), item.fotos[0])} alt="" fill sizes="64px" priority={prioridade} className="object-cover" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-sm group-hover:underline">
          <span className="line-clamp-2 text-base">{item.nome}</span>
          <span className="text-neutral-600">{rotuloCategoria(item.categoria)}</span>
        </span>
        <span className="shrink-0 text-base font-semibold tabular-nums">{formatarPreco(item.preco_centavos)}</span>
      </>,
    );
  }

  if (modelo === "editorial") {
    return envolver(
      "group flex flex-col gap-3 text-center",
      <>
        <FotoProduto
          caminho={item.fotos[0]}
          alt=""
          formato="retrato"
          sizes={grande ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 448px) 50vw, 100vw"}
          prioridade={prioridade}
        />
        <span className="line-clamp-2 text-lg font-light tracking-tight group-hover:underline">{item.nome}</span>
        <span className="text-base text-neutral-700">{formatarPreco(item.preco_centavos)}</span>
      </>,
    );
  }

  // classico e vitrine
  const caixa = modelo === "vitrine";
  return envolver(
    `group flex h-full flex-col gap-2 ${caixa ? "rounded-lg border border-neutral-200 p-2" : ""}`,
    <>
      <FotoProduto
        caminho={item.fotos[0]}
        alt=""
        formato="quadrado"
        sizes={grande ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
        prioridade={prioridade}
      />
      <span className={`line-clamp-2 text-sm group-hover:underline ${caixa ? "px-1" : ""}`}>{item.nome}</span>
      <span className={`text-base font-semibold ${caixa ? "px-1 pb-1" : ""}`}>{formatarPreco(item.preco_centavos)}</span>
    </>,
  );
}

// ---------- lista de produtos (grade, lista compacta ou fotos grandes) ----------
function Produtos({ itens, ctx, prioridade = 0, destaque = false }: { itens: ItemLoja[]; ctx: Ctx; prioridade?: number; destaque?: boolean }) {
  const { modelo } = ctx;
  const classe =
    modelo === "catalogo"
      ? "grid grid-cols-1 divide-y divide-neutral-200 border-y border-neutral-200 @2xl:grid-cols-2 @2xl:gap-x-10"
      : modelo === "editorial"
        ? destaque
          ? "grid grid-cols-1 gap-x-6 gap-y-12 @2xl:grid-cols-2"
          : "grid grid-cols-1 gap-x-6 gap-y-12 @md:grid-cols-2 @3xl:grid-cols-3"
        : modelo === "vitrine"
          ? "grid grid-cols-2 gap-3 @3xl:grid-cols-4 @3xl:gap-4"
          : "grid grid-cols-2 gap-x-4 gap-y-8 @3xl:grid-cols-4";
  return (
    <ul className={classe}>
      {itens.map((item, i) => (
        // vitrine: no destaque, o primeiro produto ocupa 2 colunas (mosaico)
        <li key={item.id} className={modelo === "vitrine" && destaque && i === 0 ? "col-span-2 @3xl:row-span-2" : undefined}>
          <Cartao item={item} ctx={ctx} prioridade={i < prioridade} grande={modelo === "vitrine" && destaque && i === 0} />
        </li>
      ))}
    </ul>
  );
}

// ---------- banner ----------
function Banner({ tema, ctx, prioridade }: { tema: TemaLoja; ctx: Ctx; prioridade: boolean }) {
  const { imagem, frase, produto } = tema.banner;
  if (!imagem && !frase) return null;
  const item = produto ? ctx.itens.find((i) => i.id === produto) : undefined;
  const { modelo, previa } = ctx;
  const cheio = modelo === "vitrine" || modelo === "editorial"; // vai de ponta a ponta da tela
  const proporcao =
    modelo === "editorial"
      ? "aspect-[3/4] @2xl:aspect-[16/8]"
      : modelo === "vitrine"
        ? "aspect-[4/3] @2xl:aspect-[21/9]"
        : modelo === "catalogo"
          ? "aspect-[16/7] @2xl:aspect-[24/7]"
          : "aspect-[16/9] @2xl:aspect-[21/8]";

  const botao = item ? (
    previa ? (
      <span className={`${classeBotaoLoja} mt-4`}>Ver produto</span>
    ) : (
      <Link href={`/loja/${ctx.slug}/${item.slug}`} className={`${classeBotaoLoja} mt-4`}>
        Ver produto
        <span className="sr-only">: {item.nome}</span>
      </Link>
    )
  ) : null;
  const titulo = frase && (
    <h2 className={`${modelo === "editorial" ? "text-3xl font-light tracking-tight @2xl:text-5xl" : "text-2xl font-semibold @2xl:text-4xl"} text-balance`}>
      {frase}
    </h2>
  );

  return (
    <section aria-label="Banner" className={cheio ? "w-full" : "mx-auto w-full max-w-6xl px-4 pt-4"}>
      {imagem ? (
        <div className={`relative w-full overflow-hidden bg-neutral-200 ${proporcao} ${cheio ? "" : "rounded-lg"}`}>
          <Image
            src={urlFoto(supabaseUrl(), imagem)}
            alt={frase ? "" : "Imagem de destaque da loja"}
            fill
            sizes={cheio ? "100vw" : "(min-width: 1152px) 1152px, 100vw"}
            priority={prioridade}
            fetchPriority={prioridade ? "high" : "auto"}
            className="object-cover"
          />
          {(frase || botao) && (
            // painel escuro sólido sob o texto: contraste AA com qualquer foto
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-black/75 p-4 text-white @2xl:inset-x-auto @2xl:bottom-8 @2xl:left-8 @2xl:max-w-xl @2xl:p-6">
              {titulo}
              {botao}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--loja-principal)] px-6 py-10 text-[var(--loja-principal-texto)] @2xl:py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start">
            {titulo}
            {botao}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- uma seção com título ----------
function Secao({ tipo, children, editorial }: { tipo: TipoSecao; children: React.ReactNode; editorial: boolean }) {
  return (
    <section aria-labelledby={`sec-${tipo}`} className={`mx-auto w-full max-w-6xl px-4 ${editorial ? "py-8 @2xl:py-12" : "py-6 @2xl:py-8"}`}>
      <h2 id={`sec-${tipo}`} className={editorial ? "mb-6 text-center text-2xl font-light tracking-tight" : "mb-4 text-xl font-semibold"}>
        {SECOES_LOJA[tipo].rotulo}
      </h2>
      {children}
    </section>
  );
}

export function SecoesLoja({
  tema,
  sobre,
  itens,
  previa = false,
}: {
  tema: TemaLoja;
  sobre: DadosSobre;
  itens: ItemLoja[];
  previa?: boolean;
}) {
  const ctx: Ctx = { modelo: tema.modelo, slug: sobre.slug, previa, itens };
  const primeira = tema.secoes.find((s) => s.visivel)?.tipo;
  // só a primeira seção da página carrega as fotos com pressa (as demais são lazy)
  const pressa = (tipo: TipoSecao) => (primeira === tipo ? 2 : 0);
  const editorial = tema.modelo === "editorial";

  // conteúdo de cada seção; seção sem nada para mostrar some (não deixa buraco)
  const destaques = tema.destaques.map((id) => itens.find((i) => i.id === id)).filter((i): i is ItemLoja => !!i);
  const maisVendidos = itens
    .filter((i) => i.ordem_vendidos != null)
    .sort((a, b) => (a.ordem_vendidos ?? 0) - (b.ordem_vendidos ?? 0))
    .slice(0, 4);
  const porCategoria = new Map<string, ItemLoja[]>();
  for (const i of itens) porCategoria.set(i.categoria ?? "", [...(porCategoria.get(i.categoria ?? "") ?? []), i]);

  const primeiraCategoria = [...porCategoria.keys()][0];
  const conteudo: Record<TipoSecao, () => React.ReactNode> = {
    banner: () => null, // tratado à parte (largura total)
    destaques: () => destaques.length > 0 && (
      <Secao tipo="destaques" editorial={editorial}>
        <Produtos itens={destaques} ctx={ctx} destaque prioridade={pressa("destaques")} />
      </Secao>
    ),
    mais_vendidos: () => maisVendidos.length > 0 && (
      <Secao tipo="mais_vendidos" editorial={editorial}>
        <Produtos itens={maisVendidos} ctx={ctx} prioridade={pressa("mais_vendidos")} />
      </Secao>
    ),
    todos_produtos: () => (
      <Secao tipo="todos_produtos" editorial={editorial}>
        {itens.length === 0 ? (
          <p className="text-base text-neutral-600">Esta loja ainda não tem produtos.</p>
        ) : (
          <Produtos itens={itens} ctx={ctx} prioridade={pressa("todos_produtos")} />
        )}
      </Secao>
    ),
    categorias: () => porCategoria.size > 1 && (
      <Secao tipo="categorias" editorial={editorial}>
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
    sobre: () => (
      <Secao tipo="sobre" editorial={editorial}>
        <div className={`flex max-w-2xl flex-col gap-2 text-base text-neutral-700 ${editorial ? "mx-auto text-center" : ""}`}>
          <p className="whitespace-pre-line">{sobre.descricao || `Conheça os produtos de ${sobre.nome}.`}</p>
          <p className="text-sm text-neutral-600">
            {sobre.razaoSocial}
            {sobre.cidade && ` · ${[sobre.cidade, sobre.uf].filter(Boolean).join("/")}`}
          </p>
        </div>
      </Secao>
    ),
    trocas_entrega: () => (
      <Secao tipo="trocas_entrega" editorial={editorial}>
        <ul className={`flex max-w-2xl flex-col gap-2 text-base text-neutral-700 ${editorial ? "mx-auto text-center" : ""}`}>
          <li>Você pode desistir da compra em até 7 dias depois de receber o produto e recebe de volta tudo o que pagou (Código de Defesa do Consumidor, art. 49).</li>
          <li>O prazo de postagem ou de acesso aparece na página de cada produto.</li>
          {sobre.email && <li>Dúvidas? Fale com a loja: {sobre.email}</li>}
        </ul>
      </Secao>
    ),
  };

  const visiveis = tema.secoes.filter((s) => s.visivel);
  return (
    <>
      {visiveis.map((s, i) =>
        s.tipo === "banner" ? (
          <Banner key={s.tipo} tema={tema} ctx={ctx} prioridade={i === 0} />
        ) : (
          <div key={s.tipo}>{conteudo[s.tipo]()}</div>
        ),
      )}
    </>
  );
}
