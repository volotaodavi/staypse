// Recebimentos do afiliado: situação do cadastro de recebimento na Lytex.
import Link from "next/link";
import { Recebimento } from "@/components/painel/Recebimento";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Recebimentos" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RecebimentosAfiliado({ searchParams }: PageProps<"/painel/afiliado/recebimentos">) {
  const usuario = await exigirPapel("revendedor");
  const sp = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase.from("profiles").select("documento").eq("id", usuario.id).maybeSingle();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link href="/painel/afiliado" className="inline-block w-fit py-2 text-sm underline">
        ← Painel do afiliado
      </Link>
      <h1 className="text-3xl">Recebimentos</h1>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}
      {um(sp.erro) && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {um(sp.erro)}
        </p>
      )}
      <Recebimento papel="afiliado" documentoSugerido={perfil?.documento} />
    </div>
  );
}
