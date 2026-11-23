// Admin: fila de denúncias de itens, lojas e vitrines. A decisão exige uma nota
// e fica no log de auditoria. Marcar como procedente NÃO tira nada do ar sozinho:
// o admin age na curadoria (recusar item ou loja) e a nota registra o motivo.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { MensagemAdmin, um } from "../comuns";
import { POR_PAGINA, Paginacao, lerPagina } from "../paginacao";
import { decidirDenuncia } from "./acoes";

export const metadata = { title: "Denúncias" };
export const instant = false;

const FILTROS: Record<string, string> = { aberta: "Abertas", procedente: "Procedentes", improcedente: "Improcedentes" };
const MOTIVOS: Record<string, string> = {
  produto_proibido: "Produto proibido",
  golpe_ou_fraude: "Golpe ou fraude",
  conteudo_enganoso: "Conteúdo enganoso",
  direito_autoral: "Direito autoral",
  conteudo_ofensivo: "Conteúdo ofensivo",
  outro: "Outro motivo",
};
const ALVO: Record<string, string> = { item: "Produto", loja: "Loja", vitrine: "Vitrine" };
const estiloCampo = "w-full rounded-xl border border-petroleo/60 bg-branco px-3 py-2 text-base";

type Denuncia = {
  id: string;
  alvo_tipo: string;
  alvo_id: string;
  motivo: string;
  descricao: string;
  email: string | null;
  status: string;
  nota_decisao: string | null;
  decidido_em: string | null;
  criado_em: string;
};

export default async function AdminDenuncias({ searchParams }: PageProps<"/admin/denuncias">) {
  await exigirPapel("admin");
  const sp = await searchParams;
  const status = Object.hasOwn(FILTROS, um(sp.status) ?? "") ? um(sp.status)! : "aberta";
  const pagina = lerPagina(sp.pagina);
  const supabase = await criarClienteServidor();

  const { data, count, error } = await supabase
    .from("denuncias")
    .select("id, alvo_tipo, alvo_id, motivo, descricao, email, status, nota_decisao, decidido_em, criado_em", { count: "exact" })
    .eq("status", status)
    .order("criado_em", { ascending: status === "aberta" })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    .returns<Denuncia[]>();
  if (error) throw new Error(`Denúncias indisponíveis: ${error.message}`);
  const lista = data ?? [];

  // nome do que foi denunciado (um grupo de ids por tipo)
  const ids = (tipo: string) => lista.filter((d) => d.alvo_tipo === tipo).map((d) => d.alvo_id);
  const [itens, lojas, vitrines] = await Promise.all([
    ids("item").length ? supabase.from("items").select("id, nome, producers(razao_social)").in("id", ids("item")) : { data: [] },
    ids("loja").length ? supabase.from("producers").select("id, razao_social, loja_slug").in("id", ids("loja")) : { data: [] },
    ids("vitrine").length ? supabase.from("storefronts").select("id, slug, nome_exibicao").in("id", ids("vitrine")) : { data: [] },
  ]);
  const nomes = new Map<string, string>();
  for (const i of (itens.data ?? []) as unknown as { id: string; nome: string; producers: { razao_social: string } | null }[])
    nomes.set(i.id, `${i.nome} (${i.producers?.razao_social ?? "loja"})`);
  for (const l of (lojas.data ?? []) as { id: string; razao_social: string }[]) nomes.set(l.id, l.razao_social);
  const slugs = new Map<string, string>();
  for (const v of (vitrines.data ?? []) as { id: string; slug: string; nome_exibicao: string | null }[]) {
    nomes.set(v.id, `${v.nome_exibicao ?? "Vitrine"} (@${v.slug})`);
    slugs.set(v.id, v.slug);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Denúncias</h1>
      <p className="text-sm text-petroleo/80">
        Enviadas por qualquer pessoa na página do produto, da loja ou da vitrine. Cada decisão fica no log de auditoria.
      </p>
      <MensagemAdmin msg={um(sp.msg) ?? um(sp.erro)} tipo={um(sp.erro) ? "erro" : undefined} />

      <nav aria-label="Filtrar por situação" className="flex flex-wrap gap-2 text-sm">
        {Object.entries(FILTROS).map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={`/admin/denuncias?status=${valor}`}
            aria-current={status === valor ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 ${status === valor ? "bg-petroleo text-branco" : "bg-branco"}`}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      {lista.length === 0 ? (
        <p className="rounded-2xl bg-branco p-5 text-sm">Nenhuma denúncia nesta situação.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((d) => (
            <li key={d.id} className="rounded-2xl bg-branco p-4 sm:p-5" data-denuncia={d.id}>
              <p className="text-sm text-petroleo/75">
                {ALVO[d.alvo_tipo]} · {MOTIVOS[d.motivo] ?? d.motivo} · {dataHora(d.criado_em)}
              </p>
              <p className="mt-1 text-lg font-medium break-words">{nomes.get(d.alvo_id) ?? "Registro removido"}</p>
              {slugs.get(d.alvo_id) && (
                <Link href={`/@${slugs.get(d.alvo_id)}`} className="inline-flex min-h-11 items-center text-sm underline">
                  Abrir a vitrine
                </Link>
              )}
              <p className="mt-2 text-sm whitespace-pre-line break-words">{d.descricao}</p>
              <p className="mt-1 text-sm break-all text-petroleo/75">{d.email ? `Contato: ${d.email}` : "Sem contato informado."}</p>

              {d.status !== "aberta" ? (
                <p className="mt-3 rounded-xl bg-gelo px-3 py-2 text-sm">
                  {FILTROS[d.status]} em {d.decidido_em ? dataHora(d.decidido_em) : ""}: {d.nota_decisao}
                </p>
              ) : (
                <form action={decidirDenuncia} className="mt-4 flex flex-col gap-2 rounded-xl border border-petroleo/20 p-3">
                  <input type="hidden" name="id" value={d.id} />
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Nota da decisão (fica no log)
                    <textarea name="nota" required minLength={5} maxLength={1000} rows={2} className={estiloCampo} />
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button name="decisao" value="procedente" className="min-h-11 rounded-full bg-petroleo px-5 text-sm font-medium text-branco">
                      Procedente
                    </button>
                    <button
                      name="decisao"
                      value="improcedente"
                      className="min-h-11 rounded-full border border-petroleo px-5 text-sm font-medium"
                    >
                      Improcedente
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <Paginacao caminho="/admin/denuncias" pagina={pagina} total={count ?? 0} filtros={{ status }} />
    </div>
  );
}
