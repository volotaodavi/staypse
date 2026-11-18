// Catálogo de itens aprovados para o revendedor se afiliar.
// Filtros (no endereço, ex.: ?nicho=beleza&tipo=digital&comissao=20):
// nicho (categoria do item), tipo e comissão mínima.
import Link from "next/link";
import { FotoItem } from "@/components/publico";
import { NICHOS, ROTULO_NICHO } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { estimativaComissao } from "@/lib/vitrine";
import { BotaoAfiliar } from "./BotaoAfiliar";

export const metadata = { title: "Catálogo para afiliados" };
export const instant = false;

type ItemCatalogo = {
  id: string;
  slug: string;
  nome: string;
  fotos: string[];
  preco_centavos: number;
  comissao_percentual: number;
  tipo: string;
  categoria: string | null;
  aprovacao_afiliacao: string;
  produtor_nome: string;
  loja_slug: string;
  minha_afiliacao_status: string | null;
};

const STATUS: Record<string, string> = {
  aprovada: "Você já é afiliado",
  pendente: "Aguardando o produtor",
  recusada: "Afiliação recusada",
};

export default async function Catalogo({ searchParams }: PageProps<"/painel/revendedor/catalogo">) {
  const usuario = await exigirPapel("revendedor");
  const filtros = await searchParams;
  const nicho = String(filtros.nicho ?? "");
  const tipo = String(filtros.tipo ?? "");
  const comissao = Number(filtros.comissao ?? 0) || 0;

  const supabase = await criarClienteServidor();
  const [{ data }, { data: vitrine }] = await Promise.all([
    supabase.rpc("catalogo_afiliados"),
    supabase.from("storefronts").select("id").eq("revendedor_id", usuario.id).maybeSingle(),
  ]);
  const itens = ((data ?? []) as ItemCatalogo[]).filter(
    (i) =>
      (!nicho || i.categoria === nicho) && (!tipo || i.tipo === tipo) && Number(i.comissao_percentual) >= comissao,
  );

  const seletor = "rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/painel/revendedor" className="text-sm underline">
        ← Voltar ao painel
      </Link>
      <h1 className="text-3xl">Catálogo</h1>
      <p className="text-petroleo/80">
        Produtos aprovados pela Staypse. Ao se afiliar, o item entra na sua vitrine e você recebe um link só seu.
      </p>

      {!vitrine && (
        <p className="rounded-2xl bg-branco p-4">
          Antes de se afiliar,{" "}
          <Link href="/painel/revendedor/vitrine" className="font-medium underline">
            crie sua vitrine
          </Link>
          .
        </p>
      )}

      {/* filtros: formulário GET (funciona sem JavaScript) */}
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Filtros">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
          Nicho
          <select name="nicho" defaultValue={nicho} className={seletor}>
            <option value="">Todos</option>
            {NICHOS.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
          Tipo
          <select name="tipo" defaultValue={tipo} className={seletor}>
            <option value="">Todos</option>
            <option value="fisico">Físico</option>
            <option value="digital">Digital</option>
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
          Comissão mínima
          <select name="comissao" defaultValue={String(comissao || "")} className={seletor}>
            <option value="">Qualquer</option>
            {[10, 20, 30, 40, 50].map((c) => (
              <option key={c} value={c}>
                {c}% ou mais
              </option>
            ))}
          </select>
        </label>
        <button className="self-end rounded-full bg-petroleo px-5 py-2.5 font-medium text-branco">Filtrar</button>
      </form>

      {itens.length === 0 ? (
        <p className="rounded-2xl bg-branco p-6 text-petroleo/80">Nenhum produto encontrado com esses filtros.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((item) => {
            const pct = Number(item.comissao_percentual);
            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-3xl bg-branco">
                <FotoItem caminho={item.fotos[0]} alt={item.nome} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-xs text-petroleo/70">
                    {item.tipo === "digital" ? "Digital" : "Físico"}
                    {item.categoria ? ` · ${ROTULO_NICHO[item.categoria] ?? item.categoria}` : ""} · {item.produtor_nome}
                  </p>
                  <Link href={`/loja/${item.loja_slug}/${item.slug}`} className="font-medium leading-snug underline-offset-2 hover:underline">
                    {item.nome}
                  </Link>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-extrabold">{formatarPreco(item.preco_centavos)}</span>
                    <span className="rounded-full bg-gelo px-2.5 py-1 text-sm font-medium">{pct}% de comissão</span>
                  </div>
                  <p className="rounded-xl bg-petroleo px-3 py-2 text-sm text-gelo">
                    Você recebe <strong className="text-ciano">{formatarPreco(estimativaComissao(item.preco_centavos, pct))}</strong>{" "}
                    por venda
                    <span className="block text-xs text-gelo/75">Estimativa antes das taxas, recebida no split automático.</span>
                  </p>
                  <p className="text-xs text-petroleo/70">
                    {item.aprovacao_afiliacao === "manual" ? "O produtor aprova cada afiliação." : "Aprovação automática."}
                  </p>
                  <div className="mt-auto pt-1">
                    {item.minha_afiliacao_status ? (
                      <p className="rounded-full bg-gelo px-4 py-2.5 text-center text-sm font-medium">{STATUS[item.minha_afiliacao_status]}</p>
                    ) : vitrine ? (
                      <BotaoAfiliar itemId={item.id} manual={item.aprovacao_afiliacao === "manual"} />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
