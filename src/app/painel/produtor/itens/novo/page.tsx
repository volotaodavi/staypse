// Novo item (produto físico ou digital)
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { supabaseUrl } from "@/lib/supabase/env";
import { meuProdutor } from "../../dados";
import { FormItem } from "../FormItem";

export const metadata = { title: "Novo item" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

export default async function NovoItem() {
  const usuario = await exigirPapel("produtor");
  const { produtor } = await meuProdutor(usuario.id);
  if (!produtor) redirect("/painel/produtor/cadastro");

  return (
    <div className="mx-auto max-w-md">
      <Link href="/painel/produtor" className="text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="mt-2 mb-5 text-3xl">Novo item</h1>
      <section className="rounded-3xl bg-branco p-5 sm:p-6">
        <FormItem uid={usuario.id} supabaseUrl={supabaseUrl()} />
      </section>
    </div>
  );
}
