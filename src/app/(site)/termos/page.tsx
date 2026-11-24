// Termos de Uso da Staypse.
// Ao mudar o texto, troque TERMOS_VERSAO em src/config/empresa.ts: o novo
// aceite fica gravado com data e versão (regra de conformidade 7).
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { CONTATO, EMPRESA, TERMOS_VERSAO } from "@/config/empresa";
import {
  ANUNCIO_IDENTIFICAR,
  ANUNCIO_PERMITIDO,
  ANUNCIO_PROIBIDO,
  ANUNCIO_REGRA_DA_LOJA,
} from "@/lib/anuncios";

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
            automaticamente por uma instituição de pagamento parceira, a Staypse não recebe nem guarda o dinheiro de ninguém.
          </p>
          <p>
            Quem compra tem 7 dias para desistir e recebe de volta tudo o que pagou (veja a{" "}
            <Link href="/reembolso" className="underline">política de reembolso</Link>). Quem indica ganha só sobre as próprias vendas: não há
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
                de terceiros: o pagamento é processado por instituição de pagamento parceira, que divide o valor (split) entre as partes da venda
                no momento do pagamento.
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
              <li>
                <strong className={forte}>Idade mínima.</strong> Para criar conta como revendedor ou vendedor da loja é preciso ter 16 anos ou mais.
                Quem tem 16 ou 17 anos é relativamente incapaz (Código Civil, art. 4º, I) e declara, no cadastro, que tem autorização dos pais ou
                responsáveis, que respondem pelos atos da conta, ou que é emancipado. O responsável de uma loja (produtor) representa uma empresa e
                precisa ter 18 anos ou mais, ou ser emancipado. A Staypse não é destinada a menores de 16 anos. Receber comissão depende da aprovação
                do cadastro de recebimento pela instituição de pagamento parceira, que pode ter regras de idade próprias.
              </li>
              <li>Informe dados verdadeiros e atualizados.</li>
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
              <li>Compradores menores de 18 anos só compram com a autorização e o acompanhamento do responsável legal; menores de 16 anos, só por meio do responsável.</li>
              <li>
                Você tem todas as garantias do Código de Defesa do Consumidor, inclusive a garantia legal contra defeitos (art. 26) e o direito de
                arrependimento. Tudo isso está explicado na <Link href="/reembolso" className="underline">política de reembolso</Link>.
              </li>
              <li>Se houver problema com o pedido, fale com a loja ou com o <Link href="/atendimento" className="underline">atendimento da Staypse</Link>. A Staypse ajuda a resolver e acompanha a resposta da loja.</li>
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
              <li>A comissão de cada produto é definida pelo produtor e aparece no catálogo. O valor mostrado é uma estimativa por venda, não uma garantia de renda. A taxa da plataforma é paga pelo produtor, não por você.</li>
              <li>Você recebe sua parte diretamente no split automático, pela instituição de pagamento parceira, depois que ela aprovar o seu cadastro de recebimento. Os tributos sobre o que você recebe são de sua responsabilidade.</li>
              <li>
                Ao divulgar, deixe claro, logo no início do post, vídeo ou mensagem, que é <strong className={forte}>publicidade</strong> e que você
                recebe comissão (por exemplo: &quot;Publicidade · link de afiliado&quot; ou &quot;#publi&quot;). Evite termos vagos, como só
                &quot;parceria&quot; ou &quot;#collab&quot;. É o que exigem o Código de Defesa do Consumidor (art. 36) e o Guia de Publicidade por
                Influenciadores do CONAR.
              </li>
              <li>Fale só o que é verdade sobre o produto. É proibido prometer o que o produtor não oferece, inventar descontos, prometer ganhos ou resultados, enviar mensagens em massa sem consentimento (spam) ou usar marcas de terceiros para enganar.</li>
              <li>Só publique fotos, textos e vídeos que você pode usar (seus ou licenciados) e só mostre pessoas que autorizaram o uso da imagem.</li>
              <li>Os links de outros sites (Shopee, Mercado Livre, TikTok Shop) em &quot;Minhas indicações&quot; são de sua responsabilidade. A Staypse mostra esses links como publicidade, não os altera, não carrega imagens desses sites na vitrine e não ganha com eles. O preço mostrado é o do dia em que o link foi cadastrado e pode mudar: confira no site de destino.</li>
            </Itens>
          ),
        },
        {
          id: "anuncios",
          titulo: "Anúncios pagos",
          conteudo: (
            <>
              <p>
                <strong className={forte}>Pode:</strong> {ANUNCIO_PERMITIDO} O link leva a pessoa à loja que vende o produto.
              </p>
              <p>
                <strong className={forte}>Não pode:</strong>
              </p>
              <Itens>
                {ANUNCIO_PROIBIDO.map((regra) => (
                  <li key={regra}>{regra}</li>
                ))}
              </Itens>
              <p>{ANUNCIO_IDENTIFICAR}</p>
              <p>
                {ANUNCIO_REGRA_DA_LOJA} Anúncio que descumprir estas regras pode ser retirado, e a comissão das vendas dele pode ser anulada.
              </p>
              <p>Quem anuncia responde pelo conteúdo e pelo gasto do próprio anúncio. A Staypse não reembolsa verba de anúncio.</p>
            </>
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
              <li>O vendedor vê apenas os próprios links, cliques e vendas, nunca os dados de outros vendedores ou o faturamento da loja.</li>
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
              <li>Os pagamentos são processados por instituição de pagamento parceira, que divide automaticamente o valor de cada venda entre as partes da venda (produtor, revendedor ou vendedor da loja e plataforma).</li>
              <li>A Staypse não tem conta para receber o dinheiro das vendas, não guarda saldos e não faz repasses.</li>
              <li>Prazos de liberação, meios de pagamento e eventuais tarifas da instituição de pagamento são informados antes do pagamento ou no painel de cada participante.</li>
              <li>
                Lojas e afiliados pagam a taxa da plataforma, proporcional à parte de cada um na venda, descontada no split. O comprador não paga a taxa da plataforma: paga o preço do anúncio e o frete. Só no parcelamento com juros, acima do número de parcelas sem juros definido pela loja, o comprador paga um acréscimo no total, informado antes de pagar. Alterações de taxa são avisadas com 30 dias de antecedência. Veja{" "}
                <Link href="/taxas" className="font-medium underline">
                  Taxas para lojas
                </Link>
                .
              </li>
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
                meio de pagamento. Entre as partes da venda, a devolução é feita na proporção do split, o produtor, o revendedor e a Staypse
                devolvem cada um a parte que receberam, o que nunca reduz o seu reembolso.
              </p>
              <p>
                O arrependimento é pedido pelo botão &quot;Desistir da compra&quot; na página do pedido ou pelo{" "}
                <Link href="/atendimento?assunto=arrependimento" className="underline">atendimento</Link>. Trocas por defeito seguem a garantia legal
                do CDC. Prazos, produtos digitais, devolução e estorno estão na{" "}
                <Link href="/reembolso" className="underline">Política de reembolso</Link>, que faz parte destes Termos.
              </p>
            </>
          ),
        },
        {
          id: "direitos-imagem",
          titulo: "Conteúdo, imagens e propriedade intelectual",
          conteudo: (
            <>
              <p>
                Quem publica fotos, vídeos, textos, nomes, logotipos e marcas (em produtos, lojas e vitrines) declara que <strong className={forte}>tem o
                direito de usá-los</strong>: que são seus ou que tem licença ou autorização, inclusive de quem aparece nas imagens (Lei 9.610/1998,
                direitos autorais; Lei 9.279/1996, marcas; Código Civil, art. 20, direito de imagem). Não vale copiar imagem de outro site, banco de
                imagens sem licença, foto de outra loja ou de &quot;cliente&quot; que não é cliente. Quem publica autoriza a Staypse a exibir o
                conteúdo na plataforma e nas prévias de compartilhamento enquanto estiver publicado, e responde por qualquer reclamação de terceiros.
              </p>
              <p><strong className={forte}>Como avisar sobre uma violação.</strong> Se você é titular de um direito ou aparece numa imagem sem ter autorizado:</p>
              <Itens>
                <li>use o botão &quot;Denunciar&quot; da página (motivo &quot;Direito autoral&quot;) ou o <Link href="/atendimento?assunto=denuncia" className="underline">atendimento</Link>;</li>
                <li>informe o endereço da página, qual é a obra, a imagem ou a marca, por que você é o titular (ou representante) e como falar com você;</li>
                <li>declare que as informações são verdadeiras. Avisos falsos ou de má-fé podem ter consequências legais para quem os envia.</li>
              </Itens>
              <p>
                A Staypse analisa o aviso e pode retirar ou ocultar o conteúdo enquanto apura, avisando o responsável, que pode se manifestar pelo
                atendimento. Em caso de ordem judicial, a Staypse cumpre (Marco Civil da Internet, art. 19). Conteúdo íntimo com nudez ou atos
                sexuais divulgado sem autorização é removido assim que a pessoa avisar (art. 21). Quem repete violações pode ter a conta suspensa.
              </p>
              <p>A marca, o logotipo e o software da Staypse pertencem à Staypse e não podem ser copiados ou usados sem autorização.</p>
            </>
          ),
        },
        {
          id: "avaliacoes",
          titulo: "Avaliações, depoimentos e provas sociais",
          conteudo: (
            <>
              <p>Hoje a Staypse não tem área de avaliações. Quando houver, e em qualquer texto de loja ou vitrine, valem estas regras (CDC, arts. 36 e 37):</p>
              <Itens>
                <li>É proibido criar, escrever, comprar, vender ou trocar avaliações, notas, estrelas, depoimentos ou comentários falsos, ou pedir a alguém que os faça sem ter comprado ou usado o produto;</li>
                <li>É proibido inventar &quot;clientes&quot;, usar foto ou nome de outra pessoa como se fosse cliente, ou números de vendas, de seguidores ou de resultados que não sejam verdadeiros;</li>
                <li>Só publique depoimento real, com autorização de quem o deu, e diga quando houve brinde, desconto ou pagamento em troca da avaliação;</li>
                <li>Não apague nem esconda avaliações negativas verdadeiras para enganar quem compra.</li>
              </Itens>
              <p>Quem descumprir pode ter o conteúdo retirado, as comissões anuladas e a conta suspensa, e responde pela publicidade enganosa.</p>
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
          conteudo: (
            <p>
              Fale com a Staypse pelo <Link href="/atendimento" className="underline">atendimento</Link> (você recebe um protocolo)
              {CONTATO.email && <>, pelo e-mail {CONTATO.email}</>}
              {CONTATO.whatsapp && <> ou pelo WhatsApp {CONTATO.whatsapp}</>}. Respondemos em até 5 dias úteis.
            </p>
          ),
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
