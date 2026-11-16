// Painel do revendedor (Etapa 1: só a recepção + status da vitrine).
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Painel do revendedor" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

export default async function PainelRevendedor() {
  const usuario = await exigirPapel("revendedor");
  const supabase = await criarClienteServidor();
  // RLS: o dono vê a própria vitrine (mesmo não publicada)
  const { data: vitrine } = await supabase
    .from("storefronts")
    .select("slug, publicada")
    .eq("revendedor_id", usuario.id)
    .maybeSingle();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-petroleo/60">Revendedor</p>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>

      <section className="mt-6 rounded-3xl bg-branco p-6">
        <h2 className="text-xl">Sua vitrine</h2>
        {vitrine ? (
          <p className="mt-2">
            staypse.com.br/{vitrine.slug} — {vitrine.publicada ? "publicada" : "rascunho"}
          </p>
        ) : (
          <p className="mt-2 text-petroleo/80">
            Em breve você escolhe o endereço da sua vitrine (staypse.com.br/seu-nome) e os
            produtos que quer indicar. Você ganha apenas sobre as suas vendas — sem taxa de
            adesão.
          </p>
        )}
      </section>
    </>
  );
}
