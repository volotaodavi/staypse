// Contrato do Produtor.
// Ao mudar o texto, troque CONTRATO_PRODUTOR_VERSAO em src/config/empresa.ts:
// o produtor precisará aceitar de novo (aceite gravado com data e versão).
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { CONTRATO_PRODUTOR_VERSAO, EMPRESA } from "@/config/empresa";

export const metadata: Metadata = {
  title: "Contrato do Produtor",
  description: "Regras para empresas que vendem na Staypse: cadastro, nota fiscal, comissões, vendedores da loja, split e dados.",
};

const f = "font-medium";

export default function ContratoProdutor() {
  return (
    <DocumentoLegal
      titulo="Contrato do Produtor"
      versao={CONTRATO_PRODUTOR_VERSAO}
      resumo={
        <>
          <p>Você vende pela sua loja na Staypse, emite nota fiscal de todas as vendas e define a comissão de quem indica seus produtos.</p>
          <p>
            O pagamento é dividido automaticamente pela instituição de pagamento parceira: você recebe a sua parte direto no split, e a Staypse
            não recebe nem guarda o seu dinheiro. Se tiver vendedores da sua equipe na Staypse, as obrigações trabalhistas com eles são suas.
          </p>
        </>
      }
      secoes={[
        {
          id: "partes",
          titulo: "Partes e objeto",
          conteudo: (
            <p>
              Este contrato é celebrado entre {EMPRESA.nomeEmpresarial}, CNPJ {EMPRESA.cnpj} (a &quot;Staypse&quot;), e a empresa que se cadastra
              como produtora (o &quot;Produtor&quot;). A Staypse licencia ao Produtor o uso da plataforma para manter uma loja on-line, cadastrar
              produtos, trabalhar com revendedores (afiliados) e vendedores da própria loja, e receber pagamentos por meio de instituição de
              pagamento parceira. Os <Link href="/termos" className="underline">Termos de uso</Link> também se aplicam.
            </p>
          ),
        },
        {
          id: "aprovacao",
          titulo: "Requisitos e aprovação",
          conteudo: (
            <Itens>
              <li>Só são aprovadas empresas com CNPJ ativo na Receita Federal, que enviem cartão CNPJ ou contrato social e documento com foto do responsável, e que tenham poderes para assinar por ela.</li>
              <li>A Staypse confere os dados antes de aprovar e pode pedir documentos adicionais, recusar ou suspender o cadastro, sempre informando o motivo.</li>
              <li>O Produtor mantém os dados do cadastro corretos e atualizados.</li>
            </Itens>
          ),
        },
        {
          id: "loja",
          titulo: "Loja e informações públicas",
          conteudo: (
            <>
              <p>
                Para cumprir o Decreto 7.962/2013 (comércio eletrônico), a página de cada produto mostra ao comprador a{" "}
                <strong className={f}>razão social, o CNPJ, o endereço e o e-mail de contato</strong> do Produtor. Ao aceitar este contrato, o
                Produtor concorda com essa divulgação.
              </p>
              <p>O Produtor pode definir nome, logo, cores, fonte e layout da loja, respeitando direitos de terceiros sobre marcas e imagens.</p>
            </>
          ),
        },
        {
          id: "itens",
          titulo: "Produtos",
          conteudo: (
            <Itens>
              <li>Cada produto é analisado pela Staypse antes de aparecer para revendedores e compradores. Mudanças de preço, comissão, descrição ou fotos exigem nova análise.</li>
              <li>O Produtor informa com clareza as características, o preço total, o prazo de postagem ou de liberação do acesso e eventuais restrições, e mantém o estoque atualizado.</li>
              <li>
                É proibido cadastrar itens da <Link href="/produtos-proibidos" className="underline">lista de produtos proibidos</Link> ou que dependam
                de licença, registro ou autorização que o Produtor não tenha.
              </li>
            </Itens>
          ),
        },
        {
          id: "nota-fiscal",
          titulo: "Nota fiscal e tributos",
          conteudo: (
            <p>
              O Produtor emite nota fiscal de <strong className={f}>todas</strong> as vendas feitas pela Staypse e informa a nota no pedido. Os
              tributos sobre as vendas do Produtor são de responsabilidade dele.
            </p>
          ),
        },
        {
          id: "comissao",
          titulo: "Comissão dos revendedores",
          conteudo: (
            <Itens>
              <li>O Produtor define, por produto, a comissão do revendedor, entre 10% e 70% do preço, e escolhe se a afiliação é aprovada automaticamente ou caso a caso.</li>
              <li>O revendedor ganha somente sobre as vendas feitas pelos links dele. Não existe ganho por recrutamento.</li>
              <li>Mudanças de comissão valem para vendas futuras; vendas já pagas mantêm a comissão vigente no momento da compra.</li>
            </Itens>
          ),
        },
        {
          id: "vendedores",
          titulo: "Vendedores da loja",
          conteudo: (
            <>
              <p>O Produtor pode convidar pessoas da sua equipe para vender pela loja com link próprio (&quot;vendedores da loja&quot;). Nesse caso:</p>
              <Itens>
                <li>A comissão do vendedor é a combinada no contrato entre ele e o Produtor e é informada pelo Produtor na plataforma, que guarda o histórico de alterações.</li>
                <li>
                  <strong className={f}>Folha de pagamento</strong> (padrão, para empregados): no split, a parte do vendedor fica com o Produtor, que a paga
                  ao vendedor. As comissões de empregados integram a remuneração (CLT, art. 457, § 1º) e devem ser pagas e tributadas pelo Produtor.
                  A Staypse fornece relatório mensal das vendas e comissões por vendedor.
                </li>
                <li>
                  <strong className={f}>Split direto</strong>: só para quem não é empregado do Produtor (autônomo ou MEI com contrato). O Produtor declara,
                  na plataforma, que o vendedor não é seu empregado; essa declaração fica registrada com data.
                </li>
                <li>
                  A Staypse <strong className={f}>não é empregadora</strong> nem parte da relação entre o Produtor e seus vendedores. Todas as obrigações
                  trabalhistas, previdenciárias e fiscais com eles são exclusivas do Produtor. A declaração de &quot;não empregado&quot; não afasta o
                  vínculo de emprego se, na prática, ele existir (CLT, art. 9º); a responsabilidade por essa classificação é do Produtor.
                </li>
                <li>O Produtor pode desativar um vendedor a qualquer momento; os links dele deixam de registrar novas indicações e o histórico é mantido.</li>
              </Itens>
            </>
          ),
        },
        {
          id: "pagamento",
          titulo: "Pagamento, split e taxas",
          conteudo: (
            <Itens>
              <li>Os pagamentos são processados por instituição de pagamento parceira. O Produtor mantém cadastro de recebedor válido nessa instituição para receber a sua parte diretamente no split.</li>
              <li>A Staypse <strong className={f}>não recebe, não guarda e não repassa</strong> o dinheiro das vendas.</li>
              <li>A taxa de serviço da Staypse é informada no painel do Produtor antes da publicação de cada produto e é descontada automaticamente no split. Tarifas e prazos da instituição de pagamento são informados por ela.</li>
            </Itens>
          ),
        },
        {
          id: "entrega",
          titulo: "Entrega e atendimento",
          conteudo: (
            <Itens>
              <li>O Produtor posta os produtos físicos no prazo informado no anúncio, informa o código de rastreio e libera os produtos digitais conforme as instruções cadastradas.</li>
              <li>O Produtor responde às mensagens dos compradores em até 5 dias úteis. A Staypse pode acompanhar o atendimento e pedir informações para resolver reclamações.</li>
            </Itens>
          ),
        },
        {
          id: "arrependimento",
          titulo: "Arrependimento, trocas, garantia e estornos",
          conteudo: (
            <Itens>
              <li>O comprador pode desistir em até 7 dias a contar do recebimento (CDC, art. 49) e recebe de volta <strong className={f}>todos</strong> os valores pagos, inclusive o frete.</li>
              <li>Entre as partes, a devolução segue a proporção do split: Produtor, revendedor (ou vendedor da loja) e Staypse devolvem cada um a parte que receberam. Os custos de devolução do produto no arrependimento são do Produtor.</li>
              <li>Trocas e consertos por defeito seguem a garantia legal do CDC e são de responsabilidade do Produtor.</li>
              <li>Estornos e contestações de pagamento seguem a mesma divisão proporcional.</li>
            </Itens>
          ),
        },
        {
          id: "dados",
          titulo: "Dados pessoais (LGPD)",
          conteudo: (
            <Itens>
              <li>Os dados dos compradores que o Produtor recebe (nome, contato, CPF e endereço de entrega) servem somente para cumprir o pedido, emitir a nota fiscal, prestar a garantia e cumprir obrigações legais.</li>
              <li>É proibido usar esses dados para outros fins (como publicidade) sem base legal, vendê-los ou compartilhá-los, salvo com transportadoras e prestadores necessários à entrega.</li>
              <li>O Produtor adota medidas de segurança adequadas e avisa a Staypse sem demora sobre qualquer incidente que envolva esses dados.</li>
              <li>Os dados dos vendedores da loja são tratados pelo Produtor como empregador ou contratante, sob sua responsabilidade.</li>
            </Itens>
          ),
        },
        {
          id: "propriedade",
          titulo: "Marcas, fotos e textos",
          conteudo: (
            <p>
              O Produtor declara ter direito de usar as marcas, fotos e textos que publica e autoriza a Staypse e os revendedores a exibi-los para
              divulgar os produtos enquanto estiverem publicados.
            </p>
          ),
        },
        {
          id: "penalidades",
          titulo: "Descumprimento",
          conteudo: (
            <p>
              O descumprimento deste contrato, dos Termos ou da lei pode levar à recusa de produtos, à suspensão da loja ou ao encerramento do
              cadastro, com aviso do motivo. Pedidos já pagos continuam com todas as obrigações perante os compradores.
            </p>
          ),
        },
        {
          id: "responsabilidade",
          titulo: "Responsabilidades",
          conteudo: (
            <p>
              O Produtor responde pelos produtos, pela entrega, pela garantia, pelos tributos e pelas relações com seus vendedores. Se a Staypse for
              condenada ou tiver de pagar algo por ato ou omissão do Produtor, o Produtor ressarcirá a Staypse (direito de regresso), sem prejuízo dos
              direitos do consumidor.
            </p>
          ),
        },
        {
          id: "vigencia",
          titulo: "Vigência, mudanças e encerramento",
          conteudo: (
            <Itens>
              <li>Este contrato vale por prazo indeterminado, a partir do aceite.</li>
              <li>Mudanças relevantes serão avisadas com pelo menos 15 dias de antecedência e exigirão novo aceite; quem não concordar pode encerrar o contrato.</li>
              <li>Qualquer parte pode encerrar o contrato a qualquer momento, por aviso pela plataforma; as obrigações de pedidos já feitos continuam valendo.</li>
            </Itens>
          ),
        },
        {
          id: "foro",
          titulo: "Lei e foro",
          conteudo: <p>Este contrato segue a lei brasileira. Fica eleito o foro da comarca de Maricá/RJ.</p>,
        },
      ]}
    />
  );
}
