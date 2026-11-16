// Painel do produtor (Etapa 1: só a recepção + status da empresa).
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Painel do produtor" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

const STATUS: Record<string, string> = {
  pendente: "Em análise pela equipe Staypse",
  aprovado: "Aprovado",
  rejeitado: "Recusado — veja o motivo e corrija",
  suspenso: "Suspenso",
};

export default async function PainelProdutor() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  // RLS: só volta a empresa do próprio usuário
  const { data: empresa } = await supabase
    .from("producers")
    .select("razao_social, status_verificacao")
    .eq("user_id", usuario.id)
    .maybeSingle();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-petroleo/60">Produtor</p>
      <h1 className="text-3xl">Olá, {usuario.nome.split(" ")[0]}!</h1>

      <section className="mt-6 rounded-3xl bg-branco p-6">
        <h2 className="text-xl">Sua empresa</h2>
        {empresa ? (
          <p className="mt-2">
            {empresa.razao_social} —{" "}
            <strong className="font-medium">{STATUS[empresa.status_verificacao]}</strong>
          </p>
        ) : (
          <p className="mt-2 text-petroleo/80">
            Para vender, você vai cadastrar o CNPJ (ativo) e enviar o cartão CNPJ ou contrato
            social. Esse cadastro chega na próxima etapa.
          </p>
        )}
      </section>
    </>
  );
}
