// Para quem ainda não escolheu papel (ex.: conta criada fora do formulário).
import { redirect } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Começar" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

// Grava o papel escolhido. A RLS só deixa gravar produtor/revendedor
// para o próprio usuário — "admin" seria recusado pelo banco.
async function escolherPapel(formData: FormData) {
  "use server";
  const papel = String(formData.get("papel"));
  if (papel !== "produtor" && papel !== "revendedor") return;
  const usuario = await exigirPapel();
  const supabase = await criarClienteServidor();
  await supabase.from("user_roles").insert({ user_id: usuario.id, papel });
  redirect("/painel");
}

export default async function Comecar() {
  const usuario = await exigirPapel();
  if (usuario.papeis.length > 0) redirect("/painel");

  return (
    <>
      <h1 className="text-3xl">Como você quer usar a Staypse?</h1>
      <form action={escolherPapel} className="mt-6 grid gap-4 sm:grid-cols-2">
        <button name="papel" value="revendedor" className="rounded-3xl bg-petroleo p-6 text-left text-gelo">
          <span className="block text-2xl font-extrabold text-ciano">Revendedor</span>
          <span className="mt-1 block text-gelo/85">Quero montar minha vitrine e indicar.</span>
        </button>
        <button name="papel" value="produtor" className="rounded-3xl bg-petroleo p-6 text-left text-gelo">
          <span className="block text-2xl font-extrabold text-ciano">Produtor</span>
          <span className="mt-1 block text-gelo/85">Tenho CNPJ e quero vender meus produtos.</span>
        </button>
      </form>
    </>
  );
}
