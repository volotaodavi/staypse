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
              <li>A verificação de identidade da empresa e de quem a representa é feita pela instituição de pagamento parceira (Lytex), no cadastro de recebimento. A Staypse não pede nem guarda documentos de identidade ou dados bancários.</li>
              <li>A loja só publica produtos e recebe pedidos com o cadastro de recebimento aprovado pela instituição de pagamento, com o mesmo CNPJ informado na Staypse. Se ele for recusado ou suspenso, as vendas novas param e a Staypse mostra o motivo informado pela instituição.</li>
              <li>A Staypse aprova a loja e cada produto por conteúdo (curadoria e produtos proibidos) e pode recusar ou suspender, sempre informando o motivo.</li>
              <li>O responsável que cadastra a loja representa uma empresa (pessoa jurídica) e declara ter 18 anos ou mais, ou ser emancipado, e poderes para aceitar este contrato.</li>
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
              <li>A taxa da plataforma (percentual mais valor fixo por venda, conforme o meio de pagamento e o número de parcelas) é a única taxa cobrada do Produtor, já inclui o processamento do pagamento, é informada antes da publicação de cada produto e é descontada automaticamente no split. O comprador não paga taxa da plataforma.</li>
              <li>
                <strong className={f}>Alteração de taxas com aviso prévio de 30 dias.</strong> A Staypse pode alterar a tabela de taxas avisando o Produtor com
                pelo menos 30 dias de antecedência, por notificação no painel e por e-mail, com a data em que as novas taxas passam a valer. Até essa data,
                as vendas seguem as taxas anteriores. O Produtor que continuar usando a plataforma depois da data de vigência aceita as novas taxas; quem
                discordar pode encerrar a loja antes dessa data, sem custo.
              </li>
              <li>
                O parcelamento no cartão é política da loja: o Produtor define até quantas parcelas oferece e até quantas sem juros. Nas parcelas sem juros, a
                loja absorve a taxa da faixa de parcelamento. Acima desse limite, o comprador paga um acréscimo, informado antes do pagamento, que cobre só a
                diferença de taxa da faixa, de modo que o Produtor recebe o mesmo que receberia no cartão à vista.
              </li>
              <li>
                A taxa da plataforma é dividida entre a loja e o afiliado, na proporção da parte de cada um no valor do pedido; vendedores próprios da loja
                não pagam taxa. A tabela vigente está em{" "}
                <Link href="/taxas" className="font-medium underline">
                  Taxas para lojas
                </Link>
                .
              </li>
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
          titulo: "Marcas, fotos, textos e avaliações",
          conteudo: (
            <Itens>
              <li>
                O Produtor declara ter direito de usar as marcas, fotos, vídeos e textos que publica (Lei 9.610/1998 e Lei 9.279/1996), inclusive a
                autorização de quem aparece nas imagens (Código Civil, art. 20). Não pode usar foto de outra loja, imagem de banco de imagens sem licença,
                nem marca de terceiros sem autorização.
              </li>
              <li>O Produtor autoriza a Staypse e os revendedores a exibir esse conteúdo para divulgar os produtos enquanto estiverem publicados, e responde por qualquer reclamação de terceiros sobre ele.</li>
              <li>
                Quem se sentir lesado pode avisar pelo botão &quot;Denunciar&quot; ou pelo atendimento. A Staypse pode retirar ou ocultar o conteúdo
                enquanto apura, avisa o Produtor, que pode se manifestar, e cumpre ordens judiciais (Marco Civil da Internet, arts. 19 e 21). As regras estão nos{" "}
                <Link href="/termos#direitos-imagem" className="underline">Termos de uso</Link>.
              </li>
              <li>É proibido criar, comprar ou pedir avaliações, notas ou depoimentos falsos, inventar clientes, números de vendas ou resultados, ou esconder avaliações verdadeiras para enganar (CDC, arts. 36 e 37).</li>
            </Itens>
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
