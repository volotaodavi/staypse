// LGPD (art. 18): o titular vê e baixa os dados que a Staypse tem sobre ele,
// e pede correção ou exclusão (que passam pelo atendimento: alguns dados
// precisam ser guardados por lei, como pedidos e notas fiscais).
import Link from "next/link";
import { ASSUNTOS_ATENDIMENTO, data } from "@/lib/pedidos";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const metadata = { title: "Meus dados" };
export const instant = false;

export default async function MeusDados() {
  // qualquer pessoa logada (sem exigir papel)
  const usuario = await exigirPapel();
  const supabase = await criarClienteServidor();
  const { data: atendimentos } = await supabase
    .from("atendimentos")
    .select("protocolo, assunto, status, criado_em")
    .eq("user_id", usuario.id)
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-3xl">Meus dados</h1>
        <p className="mt-1 text-petroleo/80">
          Pela Lei Geral de Proteção de Dados (LGPD), você pode saber quais dados temos, corrigir, pedir a exclusão e levar
          seus dados para outro serviço.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-branco p-6">
        <h2 className="text-xl">Baixar meus dados</h2>
        <p className="text-sm text-petroleo/80">
          Um arquivo (JSON) com sua conta, perfil, papéis, aceites de termos, empresa, vitrine, links, afiliações, compras e
          atendimentos. Os cliques são anônimos: mostramos só a contagem.
        </p>
        <a href="/painel/meus-dados/baixar" download className="inline-flex min-h-12 w-fit items-center rounded-full bg-petroleo px-6 py-3 font-medium text-branco">
          Baixar meus dados
        </a>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-branco p-6">
        <h2 className="text-xl">Corrigir ou excluir</h2>
        <ul className="flex flex-col gap-2 text-sm">
          <li>
            Nome, telefone e dados da empresa: corrija direto no seu painel. Para o resto,{" "}
            <Link href="/atendimento?assunto=lgpd_correcao" className="font-medium underline">
              peça a correção
            </Link>
            .
          </li>
          <li>
            <Link href="/atendimento?assunto=lgpd_exclusao" className="font-medium underline">
              Pedir a exclusão dos meus dados ou da conta
            </Link>
            . Guardamos só o que a lei exige (por exemplo, pedidos e notas fiscais por 5 anos) e avisamos o que foi apagado.
          </li>
          <li>
            <Link href="/atendimento?assunto=lgpd_outros" className="font-medium underline">
              Outro pedido sobre meus dados
            </Link>{" "}
            (revogar consentimento, saber com quem compartilhamos, se opor a um tratamento).
          </li>
        </ul>
        <p className="text-sm text-petroleo/80">
          Respondemos em até 15 dias. Detalhes na{" "}
          <Link href="/privacidade#canal-lgpd" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-branco p-6">
        <h2 className="text-xl">Meus atendimentos</h2>
        {!atendimentos?.length ? (
          <p className="text-sm text-petroleo/80">Nenhum atendimento aberto com esta conta.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-petroleo/10 text-sm">
            {atendimentos.map((a) => (
              <li key={a.protocolo} className="py-2">
                <span className="font-medium">{a.protocolo}</span>, {ASSUNTOS_ATENDIMENTO[a.assunto]}, {data(a.criado_em)} ·{" "}
                {a.status === "aberto" ? "aguardando resposta" : a.status}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-petroleo/75">Para ver a resposta, use o link que apareceu ao abrir o atendimento.</p>
      </section>
    </div>
  );
}
