// Termos de Uso da Staypse.
// Ao mudar o texto, troque TERMOS_VERSAO em src/config/empresa.ts: o novo
// aceite fica gravado com data e versão (regra de conformidade 7).
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { EMPRESA, TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso da Staypse para quem compra, vende, indica e vende pela loja.",
};

const forte = "font-medium";

export default function Termos() {
  return (
    <DocumentoLegal
      titulo="Termos de uso"
      versao={TERMOS_VERSAO}
      resumo={
        <>
          <p>
            A Staypse é a tecnologia que liga lojas (produtores) a quem indica os produtos delas. Quem vende é a loja; o pagamento é dividido
            automaticamente por uma instituição de pagamento parceira — a Staypse não recebe nem guarda o dinheiro de ninguém.
          </p>
          <p>
            Quem compra tem 7 dias para desistir e recebe de volta tudo o que pagou. Quem indica ganha só sobre as próprias vendas: não há
            taxa de adesão nem ganho por trazer outras pessoas.
          </p>
        </>
      }
      secoes={[
        {
          id: "quem-somos",
          titulo: "Quem somos e o que fazemos",
          conteudo: (
            <>
              <p>
                A plataforma Staypse é operada por {EMPRESA.nomeEmpresarial}, CNPJ {EMPRESA.cnpj}, com sede em {EMPRESA.endereco} (a
                &quot;Staypse&quot;). A Staypse oferece tecnologia para que:
              </p>
              <Itens>
                <li><strong className={forte}>Produtores</strong> (empresas com CNPJ ativo) anunciem e vendam seus produtos em uma loja própria dentro da plataforma;</li>
                <li><strong className={forte}>Revendedores</strong> (afiliados) indiquem esses produtos por links e vitrines e recebam comissão sobre as vendas que fizerem;</li>
                <li><strong className={forte}>Vendedores da loja</strong> (pessoas da equipe de um produtor) vendam pela loja com link próprio;</li>
                <li><strong className={forte}>Compradores</strong> conheçam e comprem os produtos.</li>
              </Itens>
              <p>
                A Staypse <strong className={forte}>não é a vendedora</strong> dos produtos: quem vende, emite a nota fiscal e entrega é o produtor
                identificado na página do produto. A Staypse também <strong className={forte}>não recebe, não guarda e não repassa</strong> dinheiro
                de terceiros: o pagamento é processado por instituição de pagamento parceira, que divide o valor (split) entre produtor, revendedor e
                a taxa da Staypse no momento do pagamento.
              </p>
            </>
          ),
        },
        {
          id: "aceite",
          titulo: "Aceite e mudanças nestes termos",
          conteudo: (
            <>
              <p>
                Ao criar uma conta, você declara que leu e aceita estes Termos e a{" "}
                <Link href="/privacidade" className="underline">Política de Privacidade</Link>. Guardamos a data e a versão do seu aceite.
              </p>
              <p>
                Se mudarmos algo relevante, avisaremos com antecedência razoável pelos canais da conta e pediremos um novo aceite. Mudanças não
                valem para compras já feitas.
              </p>
            </>
          ),
        },
        {
          id: "conta",
          titulo: "Sua conta",
          conteudo: (
            <Itens>
              <li>Para criar conta é preciso ter 18 anos ou mais e informar dados verdadeiros e atualizados.</li>
              <li>A conta é pessoal. Guarde sua senha; você responde pelo que for feito com ela. Se suspeitar de uso indevido, avise a Staypse.</li>
              <li>Podemos pedir documentos para confirmar sua identidade ou a da sua empresa, principalmente antes de liberar vendas ou pagamentos.</li>
            </Itens>
          ),
        },
        {
          id: "compradores",
          titulo: "Para quem compra",
          conteudo: (
            <Itens>
              <li>Antes de pagar, você vê o preço total (com frete, quando houver), as condições de pagamento e de entrega e um resumo das principais regras da compra.</li>
              <li>A página de cada produto mostra quem vende: razão social, CNPJ, endereço e contato da loja.</li>
              <li>O produtor emite a nota fiscal de toda venda e é responsável pela entrega, pela qualidade do produto e pela garantia.</li>
              <li>Você tem todas as garantias do Código de Defesa do Consumidor, inclusive a garantia legal contra defeitos (art. 26) e o direito de arrependimento (item 10).</li>
              <li>Se houver problema com o pedido, fale com a loja ou com a Staypse (item 16). A Staypse ajuda a resolver e acompanha a resposta da loja.</li>
            </Itens>
          ),
        },
        {
          id: "produtores",
          titulo: "Para produtores",
          conteudo: (
            <p>
              Só vendem na Staypse empresas com CNPJ ativo, aprovadas após conferência de documentos, que aceitaram o{" "}
              <Link href="/contrato-produtor" className="underline">Contrato do Produtor</Link>. Ele traz as regras de cadastro, nota fiscal,
              comissão, entrega, vendedores da loja e taxas, e prevalece sobre estes Termos no que for específico do produtor.
            </p>
          ),
        },
        {
          id: "revendedores",
          titulo: "Para revendedores (afiliados)",
          conteudo: (
            <Itens>
              <li>Criar vitrine e indicar produtos é gratuito. <strong className={forte}>Não existe taxa de adesão, mensalidade ou compra obrigatória.</strong></li>
              <li>
                Você ganha <strong className={forte}>somente sobre as vendas feitas pelos seus links</strong>. Não há ganho por indicar outros
                revendedores nem por recrutamento de qualquer tipo (Lei 1.521/1951, art. 2º, IX).
              </li>
              <li>A comissão de cada produto é definida pelo produtor e aparece no catálogo. O valor mostrado é uma estimativa antes das taxas, não uma garantia de renda.</li>
              <li>Você recebe sua parte diretamente no split automático, pela instituição de pagamento parceira. Os tributos sobre o que você recebe são de sua responsabilidade.</li>
              <li>
                Ao divulgar, deixe claro que você recebe comissão (por exemplo: &quot;link de afiliado&quot; ou &quot;#publi&quot;), como exigem o
                Código de Defesa do Consumidor (art. 36) e as normas de autorregulamentação publicitária (CONAR).
              </li>
              <li>Fale só o que é verdade sobre o produto. É proibido prometer o que o produtor não oferece, inventar descontos, enviar mensagens em massa sem consentimento (spam) ou usar marcas de terceiros para enganar.</li>
              <li>Os links de outros sites (Shopee, Mercado Livre, TikTok Shop) em &quot;Minhas indicações&quot; são de sua responsabilidade. A Staypse mostra esses links como publicidade, não os altera e não ganha com eles.</li>
            </Itens>
          ),
        },
        {
          id: "vendedores-loja",
          titulo: "Para vendedores da loja",
          conteudo: (
            <Itens>
              <li>O vendedor da loja entra por convite do produtor e passa a ter link próprio para os produtos daquela loja.</li>
              <li>
                A comissão é a combinada no contrato entre o vendedor e a loja (não a comissão pública do produto) e é paga da forma escolhida
                pela loja: pela própria loja (folha de pagamento, para empregados) ou diretamente no split (só para quem não é empregado da loja,
                como autônomos ou MEI).
              </li>
              <li>A Staypse não é empregadora nem parte do contrato entre a loja e o vendedor. Ela apenas registra as indicações e gera relatórios para a loja.</li>
              <li>A loja pode desativar o vendedor a qualquer momento. A partir daí, os links dele deixam de registrar novas indicações; o histórico continua guardado.</li>
              <li>O vendedor vê apenas os próprios links, cliques e vendas — nunca os dados de outros vendedores ou o faturamento da loja.</li>
            </Itens>
          ),
        },
        {
          id: "links",
          titulo: "Links de indicação, cliques e atribuição",
          conteudo: (
            <>
              <p>
                Cada revendedor e vendedor tem um link curto para cada produto (por exemplo, <code className="rounded bg-gelo px-1">/@seu-nome/produto</code>).
                Quando alguém abre o link, a Staypse registra o clique (sem guardar o IP em texto puro) e grava no navegador um cookie que lembra,
                por até 30 dias, quem indicou aquele produto. Se a pessoa abrir links de pessoas diferentes para o mesmo produto, vale o último.
                Detalhes na <Link href="/cookies" className="underline">Política de cookies</Link>.
              </p>
              <p>Cliques artificiais, autocompras para ganhar comissão, uso de robôs ou qualquer fraude anulam as comissões envolvidas e podem levar ao encerramento da conta.</p>
            </>
          ),
        },
        {
          id: "pagamentos",
          titulo: "Pagamentos e split",
          conteudo: (
            <Itens>
              <li>Os pagamentos são processados por instituição de pagamento parceira, que divide automaticamente o valor de cada venda entre produtor, revendedor (ou vendedor da loja) e a taxa da Staypse.</li>
              <li>A Staypse não tem conta para receber o dinheiro das vendas, não guarda saldos e não faz repasses.</li>
              <li>Prazos de liberação, meios de pagamento e eventuais tarifas da instituição de pagamento são informados antes do pagamento ou no painel de cada participante.</li>
              <li>Em caso de cancelamento, estorno ou contestação do pagamento, cada participante devolve a parte que recebeu, na mesma proporção do split.</li>
            </Itens>
          ),
        },
        {
          id: "arrependimento",
          titulo: "Arrependimento, trocas e reembolsos",
          conteudo: (
            <>
              <p>
                Em compras feitas pela internet, você pode desistir em até <strong className={forte}>7 dias</strong> a contar do recebimento do produto
                (ou da contratação, no caso de produto digital), sem precisar explicar o motivo (CDC, art. 49).
              </p>
              <p>
                Ao desistir, você recebe de volta <strong className={forte}>todos os valores pagos, inclusive o frete</strong>, de imediato e pelo mesmo
                meio de pagamento. Entre as partes da venda, a devolução é feita na proporção do split — o produtor, o revendedor e a Staypse
                devolvem cada um a parte que receberam —, o que nunca reduz o seu reembolso.
              </p>
              <p>O arrependimento pode ser pedido pelo mesmo canal usado na compra ou pelos contatos do item 16. Trocas por defeito seguem a garantia legal do CDC.</p>
            </>
          ),
        },
        {
          id: "conteudo",
          titulo: "Conteúdo e propriedade intelectual",
          conteudo: (
            <>
              <p>
                Quem publica fotos, textos, nomes e marcas (produtos, lojas e vitrines) declara ter o direito de usá-los e autoriza a Staypse a
                exibi-los na plataforma e nas prévias de compartilhamento enquanto estiverem publicados.
              </p>
              <p>A marca, o logotipo e o software da Staypse pertencem à Staypse e não podem ser copiados ou usados sem autorização.</p>
            </>
          ),
        },
        {
          id: "proibido",
          titulo: "O que não é permitido",
          conteudo: (
            <Itens>
              <li>Vender ou indicar itens da <Link href="/produtos-proibidos" className="underline">lista de produtos proibidos</Link>;</li>
              <li>Prometer ganhos, renda garantida ou &quot;dinheiro fácil&quot;, ou criar qualquer esquema de ganho por recrutamento;</li>
              <li>Publicidade enganosa ou abusiva, ou divulgar sem informar que é uma indicação remunerada;</li>
              <li>Usar dados pessoais de compradores ou de outros usuários fora da finalidade da venda;</li>
              <li>Tentar burlar a segurança, os limites ou as regras de atribuição da plataforma.</li>
            </Itens>
          ),
        },
        {
          id: "suspensao",
          titulo: "Suspensão e encerramento",
          conteudo: (
            <p>
              A Staypse pode suspender ou encerrar contas, itens ou vitrines que descumpram estes Termos ou a lei, informando o motivo. Você pode
              encerrar sua conta quando quiser pelo canal de atendimento. Obrigações de pedidos já feitos (entrega, garantia, arrependimento e nota
              fiscal) continuam valendo depois do encerramento.
            </p>
          ),
        },
        {
          id: "responsabilidades",
          titulo: "Responsabilidades",
          conteudo: (
            <>
              <p>
                Cada participante responde pelos próprios atos: o produtor pelo produto, pela entrega, pela nota fiscal e pela garantia; o revendedor
                e o vendedor pela forma como divulgam; a Staypse pelo funcionamento da plataforma e pelo tratamento de dados que realiza.
              </p>
              <p>Nada nestes Termos limita os direitos garantidos ao consumidor pelo Código de Defesa do Consumidor.</p>
              <p>Trabalhamos para manter a plataforma no ar, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros; nesses casos, buscaremos restabelecer o serviço o quanto antes.</p>
            </>
          ),
        },
        {
          id: "privacidade",
          titulo: "Privacidade",
          conteudo: (
            <p>
              O uso dos seus dados pessoais está descrito na <Link href="/privacidade" className="underline">Política de Privacidade</Link> e na{" "}
              <Link href="/cookies" className="underline">Política de cookies</Link>, que fazem parte destes Termos.
            </p>
          ),
        },
        {
          id: "contato",
          titulo: "Atendimento",
          conteudo: <p>Fale com a Staypse pelo e-mail {EMPRESA.email} ou pelo WhatsApp {EMPRESA.whatsapp}. Respondemos em até 5 dias úteis.</p>,
        },
        {
          id: "foro",
          titulo: "Lei aplicável e foro",
          conteudo: (
            <p>
              Estes Termos seguem a lei brasileira. Se você for consumidor, pode recorrer à Justiça do seu domicílio. Nos demais casos, fica eleito
              o foro da comarca de Maricá/RJ.
            </p>
          ),
        },
      ]}
    />
  );
}
