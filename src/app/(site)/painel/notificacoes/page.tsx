// Central de notificações: os avisos da pessoa (loja, afiliado, vendedor ou admin).
// Sem tempo real: a lista atualiza ao recarregar a página.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { marcarComoLida, marcarTodasComoLidas } from "./acoes";

export const metadata = { title: "Notificações" };
export const instant = false;

const LIMITE = 50;

// só caminho interno (o banco também garante); qualquer outra coisa não vira link
const linkInterno = (l: string | null) => (l && /^\/($|[^/\\])/.test(l) ? l : null);

export default async function Notificacoes() {
  const usuario = await exigirPapel();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("notificacoes")
    .select("id, titulo, texto, link, lida_em, criado_em")
    .eq("user_id", usuario.id)
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  const lista = data ?? [];
  const naoLidas = lista.filter((n) => !n.lida_em).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Notificações</h1>
          <p className="mt-1 text-sm text-petroleo/80" role="status">
            {naoLidas === 0 ? "Você não tem avisos novos." : `${naoLidas} ${naoLidas === 1 ? "aviso novo" : "avisos novos"}.`}
          </p>
        </div>
        {naoLidas > 0 && (
          <form action={marcarTodasComoLidas}>
            <button className="inline-flex min-h-11 items-center rounded-full border border-petroleo px-5 py-2 text-sm font-medium hover:bg-gelo">
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-3xl bg-branco p-6 text-sm text-petroleo/80">
          Quando algo importante acontecer (uma venda, uma decisão sobre sua afiliação, uma mudança no cadastro de recebimento), o aviso aparece aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((n) => {
            const link = linkInterno(n.link);
            return (
              <li key={n.id} className={`flex flex-col gap-2 rounded-2xl bg-branco p-4 ${n.lida_em ? "" : "border-l-4 border-ciano"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h2 className="text-base font-medium">
                    {n.titulo}
                    {!n.lida_em && <span className="ml-2 rounded-full bg-petroleo px-2 py-0.5 text-xs font-medium text-branco">Nova</span>}
                  </h2>
                  <time dateTime={n.criado_em} className="text-xs text-petroleo/75">
                    {dataHora(n.criado_em)}
                  </time>
                </div>
                <p className="text-sm text-petroleo/90">{n.texto}</p>
                <div className="flex flex-wrap gap-2">
                  {link && (
                    <Link href={link} className="inline-flex min-h-11 items-center rounded-full bg-ciano px-5 py-2 text-sm font-medium text-petroleo hover:brightness-95">
                      Abrir
                    </Link>
                  )}
                  {!n.lida_em && (
                    <form action={marcarComoLida}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        aria-label={`Marcar como lida: ${n.titulo}`}
                        className="inline-flex min-h-11 items-center rounded-full border border-petroleo/60 px-5 py-2 text-sm font-medium hover:bg-gelo"
                      >
                        Marcar como lida
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {lista.length === LIMITE && <p className="text-xs text-petroleo/75">Mostrando os {LIMITE} avisos mais recentes.</p>}
    </div>
  );
}
