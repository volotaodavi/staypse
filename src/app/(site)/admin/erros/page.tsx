// Admin: erros do servidor dos últimos 90 dias (gravados por src/instrumentation.ts).
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Erros do site" };
export const instant = false;

export default async function AdminErros() {
  await exigirPapel("admin");
  const supabase = await criarClienteServidor();
  const { data: erros } = await supabase
    .from("erros_app")
    .select("id, criado_em, mensagem, digest, caminho, metodo, rota, tipo")
    .order("criado_em", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Erros do site</h1>
      <p className="text-sm text-petroleo/80">
        Últimos 100 erros do servidor (guardados por 90 dias, sem dados pessoais). Para saber se o site está no ar, use um
        monitor gratuito apontado para /api/saude.
      </p>
      {!erros?.length ? (
        <p className="rounded-2xl bg-branco p-4 text-sm">Nenhum erro registrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {erros.map((e) => (
            <li key={e.id} className="rounded-2xl bg-branco p-4 text-sm">
              <p className="text-petroleo/75">
                {dataHora(e.criado_em)} · {e.metodo} {e.caminho} · {e.tipo} · {e.rota}
              </p>
              <p className="mt-1 font-medium break-words">{e.mensagem}</p>
              {e.digest && <p className="text-xs text-petroleo/75">digest {e.digest}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
