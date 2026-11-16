// Contrato do Produtor.
// ATENÇÃO: texto PROVISÓRIO, deve ser revisado por advogado antes do beta.
// Ao mudar o texto, troque CONTRATO_PRODUTOR_VERSAO em src/config/empresa.ts.
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { CONTRATO_PRODUTOR_VERSAO, EMPRESA } from "@/config/empresa";

export const metadata: Metadata = { title: "Contrato do Produtor" };

const CLAUSULAS = [
  ["Quem pode vender", "Empresas com CNPJ ativo na Receita Federal, que enviem contrato social ou cartão CNPJ e documento do responsável. A Staypse confere os dados antes de aprovar."],
  ["Nota fiscal", "O produtor emite nota fiscal de TODAS as vendas feitas pela Staypse e informa a nota em cada pedido."],
  ["Comissão do revendedor", "O produtor define, por item, a comissão do revendedor, entre 10% e 70% do preço. O revendedor ganha somente sobre as vendas feitas por ele."],
  ["Pagamento e split", "O pagamento é processado pela instituição de pagamento parceira, que divide o valor automaticamente entre produtor, revendedor e taxa da Staypse. Cada parte recebe a sua parte no split; a Staypse não recebe, não guarda e não repassa o dinheiro de terceiros."],
  ["Arrependimento e reembolso", "O comprador pode desistir em até 7 dias do recebimento (art. 49 do CDC). O reembolso é proporcional ao que cada parte recebeu no split."],
  ["Envio e entrega", "O produtor posta os produtos físicos no prazo informado no anúncio e entrega os digitais conforme as instruções cadastradas."],
  ["Análise dos itens", "Todo item é analisado antes de aparecer para revendedores. Mudanças de preço, comissão ou descrição exigem nova análise."],
  ["Produtos proibidos", "É proibido cadastrar os itens da lista de produtos proibidos. O descumprimento leva à recusa do item e pode levar à suspensão da conta."],
  ["Dados pessoais (LGPD)", "Os dados dos compradores recebidos para entrega são usados só para cumprir o pedido e não podem ser usados para outros fins."],
] as const;

export default function ContratoProdutor() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl">Contrato do Produtor</h1>
        <p className="mt-1 text-sm text-petroleo/70">Versão {CONTRATO_PRODUTOR_VERSAO}</p>
        <p className="mt-6 rounded-xl bg-gelo px-4 py-3 text-sm">
          Texto provisório, em revisão jurídica. A versão definitiva será publicada antes do lançamento, e quem
          já aceitou será convidado a aceitar a nova versão.
        </p>
        <p className="mt-6">
          Contrato entre {EMPRESA.nomeEmpresarial} (CNPJ {EMPRESA.cnpj}), a &quot;Staypse&quot;, e a empresa
          produtora que se cadastra na plataforma.
        </p>
        <ol className="mt-6 flex list-decimal flex-col gap-4 pl-5">
          {CLAUSULAS.map(([titulo, texto]) => (
            <li key={titulo}>
              <h2 className="text-lg">{titulo}</h2>
              <p className="mt-1 text-petroleo/85">{texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm">
          Veja também a{" "}
          <Link href="/produtos-proibidos" className="underline">
            lista de produtos proibidos
          </Link>
          .
        </p>
      </main>
    </>
  );
}
