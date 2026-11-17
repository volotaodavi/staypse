// Termos de uso.
// ATENÇÃO: texto PROVISÓRIO. O texto definitivo deve ser revisado por advogado.
// Ao mudar o texto, troque TERMOS_VERSAO em src/config/empresa.ts.
import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl">Termos de uso</h1>
        <p className="mt-1 text-sm text-petroleo/70">Versão {TERMOS_VERSAO}</p>

        <p className="mt-6 rounded-xl bg-gelo px-4 py-3 text-sm">
          Texto provisório, em revisão jurídica. A versão definitiva será publicada antes do
          lançamento.
        </p>

        {/* Pontos já decididos que o texto final precisa conter */}
        <ul className="mt-8 list-disc space-y-2 pl-5 leading-relaxed">
          <li>A Staypse não recebe nem guarda o dinheiro das vendas: o pagamento é dividido diretamente pela instituição de pagamento parceira.</li>
          <li>Produtores só são aprovados com CNPJ ativo e documento, e emitem nota fiscal de cada venda.</li>
          <li>Revendedores ganham apenas sobre as próprias vendas. Não há taxa de adesão nem ganho por indicação de novos revendedores.</li>
          <li>O comprador tem 7 dias para desistir da compra (direito de arrependimento), com reembolso proporcional ao que cada parte recebeu.</li>
          <li>Links externos (Shopee, Mercado Livre, TikTok Shop) na vitrine são de responsabilidade do revendedor; a Staypse não os altera e não ganha com eles.</li>
        </ul>
      </main>
    </>
  );
}
