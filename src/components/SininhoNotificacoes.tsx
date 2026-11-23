// Sininho do cabeçalho dos painéis: link para /painel/notificacoes com o número
// de avisos não lidos. O contador vem do banco (RLS: só as notificações da pessoa).
import Link from "next/link";
import { usuarioAtual } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

// Mostra o sino. naoLidas = null enquanto o número carrega (ou se não deu para ler).
export function SininhoNotificacoes({ naoLidas }: { naoLidas: number | null }) {
  const n = naoLidas ?? 0;
  return (
    <Link
      href="/painel/notificacoes"
      // enquanto o número carrega, o nome não promete uma contagem que ainda não existe
      aria-label={naoLidas === null ? "Notificações" : `Notificações, ${n} ${n === 1 ? "não lida" : "não lidas"}`}
      className="relative inline-flex size-11 items-center justify-center rounded-full border border-petroleo/30 text-petroleo hover:bg-gelo"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9ZM10 19a2 2 0 0 0 4 0" />
      </svg>
      {n > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-petroleo px-1 text-xs font-medium text-branco"
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}

export async function SininhoComContador() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", usuario.id)
    .is("lida_em", null);
  return <SininhoNotificacoes naoLidas={count ?? 0} />;
}
