// Política de privacidade + canal LGPD (regra 7).
// ATENÇÃO: texto PROVISÓRIO. O texto definitivo deve ser revisado por advogado.
import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { EMPRESA, TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl">Política de privacidade</h1>
        <p className="mt-1 text-sm text-petroleo/70">Versão {TERMOS_VERSAO}</p>

        <p className="mt-6 rounded-xl bg-gelo px-4 py-3 text-sm">
          Texto provisório, em revisão jurídica. A versão definitiva será publicada antes do
          lançamento.
        </p>

        <section className="mt-8 space-y-3 leading-relaxed">
          <h2 className="text-xl">Controladora dos dados</h2>
          <p>
            {EMPRESA.nomeEmpresarial}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}.
          </p>

          <h2 className="pt-4 text-xl">Pagamentos</h2>
          <p>
            A Staypse não recebe, não guarda e não repassa o dinheiro das vendas. Os dados de
            pagamento são tratados diretamente pela instituição de pagamento parceira, que divide
            o valor entre produtor, revendedor e Staypse.
          </p>
        </section>

        <section id="canal-lgpd" className="mt-10 rounded-3xl bg-petroleo p-6 text-gelo">
          <h2 className="text-xl text-ciano">Canal de privacidade (LGPD)</h2>
          <p className="mt-2 text-gelo/90">
            Você pode pedir a qualquer momento acesso, correção, portabilidade ou exclusão dos
            seus dados, além de informações sobre o uso deles. Escreva para:
          </p>
          <p className="mt-3 text-lg font-medium">{EMPRESA.emailPrivacidade}</p>
        </section>
      </main>
    </>
  );
}
