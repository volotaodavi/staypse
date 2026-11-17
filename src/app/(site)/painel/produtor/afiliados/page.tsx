// Quem se afiliou aos itens do produtor: nome da vitrine e status.
// Por privacidade (LGPD), NÃO mostra e-mail nem telefone do revendedor.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { decidirAfiliacaoAcao } from "../loja/acoes";

export const metadata = { title: "Afiliados" };
export const instant = false;

type Linha = {
  id: string;
  status: string;
  criado_em: string;
  items: { nome: string } | null;
  storefronts: { nome_exibicao: string | null; slug: string } | null;
};

const ROTULO: Record<string, string> = { pendente: "Aguardando você", aprovada: "Aprovada", recusada: "Recusada" };

export default async function Afiliados({ searchParams }: PageProps<"/painel/produtor/afiliados">) {
  const usuario = await exigirPapel("produtor");
  const { msg } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: produtor } = await supabase.from("producers").select("id").eq("user_id", usuario.id).maybeSingle();
  // RLS: o produtor só enxerga afiliações dos próprios itens
  const { data } = produtor
    ? await supabase
        .from("afiliacoes")
        .select("id, status, criado_em, items!inner(nome, producer_id), storefronts(nome_exibicao, slug)")
        .eq("items.producer_id", produtor.id)
        .order("criado_em", { ascending: false })
        .returns<Linha[]>()
    : { data: [] as Linha[] };
  const linhas = data ?? [];
  const pendentes = linhas.filter((l) => l.status === "pendente");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/painel/produtor" className="text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="text-3xl">Afiliados</h1>
      <p className="text-petroleo/80">
        Revendedores que querem indicar seus itens. Nos itens com “aprovo manualmente”, você decide quem entra.
      </p>
      {typeof msg === "string" && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {msg}
        </p>
      )}

      <p className="text-sm font-medium">
        {pendentes.length} {pendentes.length === 1 ? "pedido aguardando" : "pedidos aguardando"} · {linhas.length} no total
      </p>

      {linhas.length === 0 ? (
        <p className="rounded-2xl bg-branco p-5 text-petroleo/70">Ninguém se afiliou ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((l) => (
            <li key={l.id} className="flex flex-col gap-2 rounded-2xl bg-branco p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {l.storefronts ? (
                    <Link href={`/@${l.storefronts.slug}`} className="underline">
                      {l.storefronts.nome_exibicao || l.storefronts.slug}
                    </Link>
                  ) : (
                    "Vitrine não publicada"
                  )}
                </p>
                <p className="text-sm text-petroleo/70">
                  {l.items?.nome} · {new Date(l.criado_em).toLocaleDateString("pt-BR")} · {ROTULO[l.status]}
                </p>
              </div>
              {l.status === "pendente" && (
                <form action={decidirAfiliacaoAcao} className="flex gap-2">
                  <input type="hidden" name="afiliacao_id" value={l.id} />
                  <button name="decisao" value="aprovar" className="rounded-full bg-petroleo px-4 py-2 text-sm font-medium text-branco">
                    Aprovar
                  </button>
                  <button name="decisao" value="recusar" className="rounded-full border border-petroleo px-4 py-2 text-sm font-medium">
                    Recusar
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
