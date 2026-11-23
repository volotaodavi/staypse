// Política de Privacidade (LGPD — Lei 13.709/2018) + canal do titular.
// Ao mudar o texto, troque TERMOS_VERSAO em src/config/empresa.ts.
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { CONTATO, EMPRESA, TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Staypse trata dados pessoais, com quais bases legais e como exercer seus direitos (LGPD).",
};

// [finalidade, dados, base legal (LGPD, art. 7º), por quanto tempo guardamos]
const FINALIDADES: [string, string, string, string][] = [
  ["Lista de espera e aviso de lançamento", "Nome, e-mail, WhatsApp (obrigatório só para lojas e afiliados), perfil escolhido, cidade/UF e nichos (afiliados); empresa, CNPJ (opcional) e o que vende (lojas); loja onde trabalha (vendedores de loja); código de quem indicou; IP em código irreversível (hash), só para limitar inscrições repetidas. Enviamos um e-mail com o link da sua posição na fila. Guardamos a versão e a data do seu consentimento", "Consentimento (inciso I), dado ao se inscrever e que você pode retirar quando quiser", "Até 12 meses após o lançamento, ou até você retirar o consentimento"],
  ["Criar e manter sua conta", "Nome, e-mail, senha (guardada de forma cifrada), papéis na plataforma, declaração de faixa de idade (18 anos ou mais; ou 16 a 17 com autorização dos responsáveis) e aceite dos termos com data e versão. Não pedimos data de nascimento", "Execução de contrato (inciso V)", "Enquanto a conta existir; depois, o prazo legal (em geral, 5 anos)"],
  ["Cadastro da loja e curadoria", "Razão social, CNPJ, inscrição estadual, endereço comercial e contatos (sem documentos de identidade: quem verifica é a instituição de pagamento)", "Execução de contrato (V) e legítimo interesse na prevenção a fraudes (IX)", "Enquanto a loja existir; depois, o prazo legal (em geral, 5 anos)"],
  ["Cadastro de recebimento (instituição de pagamento)", "CPF ou CNPJ de quem recebe e a situação do cadastro (em análise, aprovado, recusado ou suspenso) com o motivo informado pela instituição. Documentos e dados bancários vão direto para a instituição de pagamento; a Staypse não recebe nem guarda", "Execução de contrato (V)", "Enquanto a conta existir; depois, o prazo legal (em geral, 5 anos)"],
  ["Mostrar quem vende cada produto", "Razão social, CNPJ, endereço e contato da empresa produtora", "Obrigação legal — Decreto 7.962/2013 (II)", "Enquanto o produto estiver publicado"],
  ["Vitrines, links e atribuição de vendas", "Seu @, nome da vitrine, foto e links; nos cliques: data, produto, origem e o IP transformado em código irreversível (hash). Cookie de atribuição de 30 dias com códigos internos (veja a Política de cookies)", "Execução de contrato com o afiliado (V) e legítimo interesse em pagar corretamente quem indicou a venda (IX)", "Cliques: até 24 meses. Cookie: 30 dias"],
  ["Fotos, textos e marcas que você publica", "Fotos dos produtos, logo da loja ou foto da vitrine, descrições e nomes. Publique só o que você tem direito de usar (veja os Termos)", "Execução de contrato (V)", "Enquanto estiverem publicados"],
  ["Vendedores da loja", "E-mail do convite, comissão combinada, forma de pagamento e histórico de alterações (informados pela loja)", "Execução de contrato (V)", "Enquanto o vínculo existir; o histórico, pelo prazo legal"],
  ["Pedidos e pagamentos", "Nome, e-mail, CPF, telefone (opcional) e endereço de entrega do comprador; dados do pedido, da entrega, da nota fiscal e de eventual desistência. O CPF é pedido para a nota fiscal da loja e para o pagamento", "Execução de contrato (V) e obrigação legal fiscal e do CDC (II)", "Pelo prazo da legislação fiscal (em geral, 5 anos)"],
  ["Acompanhamento de comissões de afiliados e vendedores", "Nome do comprador e valor pago, mostrados ao afiliado ou vendedor que indicou a venda, para acompanhar suas comissões. Nunca e-mail, telefone, CPF, endereço ou código de acesso do comprador", "Execução de contrato (V) e legítimo interesse em permitir que quem indica confira a própria comissão (IX)", "Pelo prazo do pedido (em geral, 5 anos)"],
  ["Consulta de CEP", "O CEP que você digita no checkout é enviado, do seu navegador, ao serviço gratuito BrasilAPI, que devolve o endereço. Nós não guardamos essa consulta; a BrasilAPI pode receber seu IP e o CEP", "Execução de contrato (V): facilitar o preenchimento da entrega. É opcional: você pode digitar o endereço à mão", "Não guardamos"],
  ["Atendimento, denúncias e pedidos de titulares", "Nome, e-mail, assunto, mensagem, protocolo e, se você informar, o código do pedido; nas denúncias: motivo, descrição, o item denunciado e o e-mail (opcional), com o IP em código irreversível", "Execução de contrato (V) e obrigação legal — Decreto 7.962/2013 e LGPD (II); denúncias: legítimo interesse em manter a plataforma segura (IX)", "Atendimentos: 5 anos (prazo do CDC)"],
  ["Registros de acesso à aplicação", "IP, data e hora (com fuso) do login, do cadastro e da criação de pedido. Só são lidos para atender ordem judicial ou obrigação legal", "Obrigação legal — Marco Civil da Internet, art. 15 (II)", "6 meses, depois apagados"],
  ["Segurança e funcionamento do site", "Registros de erros do servidor (data, página e mensagem técnica), sem nome, e-mail, CPF ou códigos de acesso", "Legítimo interesse em manter o site seguro e funcionando (IX)", "90 dias"],
];

export default function Privacidade() {
  return (
    <DocumentoLegal
      titulo="Política de privacidade"
      versao={TERMOS_VERSAO}
      resumo={
        <>
          <p>Usamos seus dados só para o que você vê na Staypse: sua conta, a loja, as vitrines, as indicações e — quando abrirem — os pedidos.</p>
          <p>
            Não vendemos dados e não usamos analytics nem cookies de outras empresas. O IP de quem clica nos links vira um código irreversível. Você pode pedir acesso, correção ou exclusão a qualquer
            momento pelo canal no fim desta página.
          </p>
        </>
      }
      secoes={[
        {
          id: "controladora",
          titulo: "Quem é responsável pelos seus dados",
          conteudo: (
            <p>
              A controladora dos dados é {EMPRESA.nomeEmpresarial}, CNPJ {EMPRESA.cnpj}, com sede em {EMPRESA.endereco}. Nos pedidos, o produtor
              que vende o produto também é controlador dos dados de entrega e de nota fiscal do comprador.
            </p>
          ),
        },
        {
          id: "finalidades",
          titulo: "Que dados usamos, para quê e com qual base legal",
          conteudo: (
            <>
              <ul className="flex flex-col gap-3">
                {FINALIDADES.map(([fim, dados, base, guarda]) => (
                  <li key={fim} className="rounded-2xl border border-petroleo/15 p-4">
                    <p className="font-medium">{fim}</p>
                    <p className="mt-1 text-sm">
                      <span className="text-petroleo/75">Dados: </span>
                      {dados}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-petroleo/75">Base legal (LGPD, art. 7º): </span>
                      {base}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="text-petroleo/75">Por quanto tempo guardamos: </span>
                      {guarda}
                    </p>
                  </li>
                ))}
              </ul>
              <p>Pedimos só os dados da lista acima, e cada campo existe por um motivo. Campos marcados como opcionais podem ficar em branco. Não tratamos dados sensíveis (como saúde, religião ou biometria) e não usamos seus dados em decisões automatizadas que afetem seus interesses. Também não usamos seus dados para publicidade de terceiros.</p>
            </>
          ),
        },
        {
          id: "compartilhamento",
          titulo: "Com quem compartilhamos",
          conteudo: (
            <>
              <Itens>
                <li><strong className="font-medium">Supabase</strong>: banco de dados, login e armazenamento de arquivos, com servidores em São Paulo (Brasil).</li>
                <li><strong className="font-medium">Resend</strong>: envio do e-mail de confirmação da lista de espera (seu nome e e-mail), quando o envio está ativado; os servidores podem ficar fora do Brasil.</li>
                <li><strong className="font-medium">Vercel</strong>: hospedagem do site (região de São Paulo), que pode processar dados de navegação, como o IP, fora do Brasil. A fonte das letras é instalada no próprio site, sem pedir nada ao Google.</li>
                <li><strong className="font-medium">Instituição de pagamento parceira (Lytex)</strong>: processa os pagamentos e o split e faz a verificação de identidade de lojas, afiliados e vendedores no cadastro de recebimento — como controladora desses dados, pela política dela.</li>
                <li><strong className="font-medium">BrasilAPI</strong>: serviço público e gratuito de consulta de CEP, chamado pelo seu navegador no checkout quando você digita o CEP (recebe o CEP e o seu IP).</li>
                <li><strong className="font-medium">WhatsApp</strong>: só quando você mesmo toca em &quot;Compartilhar no WhatsApp&quot;; abrimos o WhatsApp com a mensagem pronta e não enviamos dados a ele.</li>
                <li><strong className="font-medium">Shopee, Mercado Livre e TikTok Shop</strong>: nossos servidores consultam a página pública do link que o afiliado cadastra para preencher o título e o preço. Nenhum dado de visitantes é enviado, e a Staypse não carrega imagens desses sites nas vitrines. Ao tocar no link, você sai da Staypse e passa a valer a política do outro site.</li>
                <li><strong className="font-medium">Produtores</strong>: recebem os dados de entrega e de nota fiscal dos pedidos que vendem e só podem usá-los para cumprir o pedido.</li>
                <li><strong className="font-medium">Revendedores e vendedores da loja</strong>: veem data, produto, valor, comissão e situação das próprias vendas, além do nome do comprador e do valor pago, para acompanhar suas comissões — nunca e-mail, telefone, CPF ou endereço do comprador.</li>
                <li><strong className="font-medium">Autoridades</strong>: quando houver ordem judicial ou obrigação legal.</li>
              </Itens>
              <p>Não vendemos nem alugamos dados pessoais.</p>
            </>
          ),
        },
        {
          id: "internacional",
          titulo: "Transferência para fora do Brasil",
          conteudo: (
            <p>
              Alguns fornecedores (Resend e a Vercel, por exemplo) podem processar dados no exterior, como nos Estados Unidos. Nesses casos, a
              transferência segue o art. 33 da LGPD, com fornecedores que oferecem garantias contratuais de proteção de dados (cláusulas-padrão
              contratuais, quando a ANPD as exigir). Você pode pedir mais detalhes pelo canal de privacidade.
            </p>
          ),
        },
        {
          id: "retencao",
          titulo: "Por quanto tempo guardamos",
          conteudo: (
            <Itens>
              <li>Lista de espera: até 12 meses após o lançamento ou até você pedir a exclusão.</li>
              <li>Conta e cadastro: enquanto a conta estiver ativa; depois, pelo prazo necessário para cumprir obrigações legais e defender direitos (em geral, 5 anos).</li>
              <li>Pedidos e notas fiscais: pelo prazo exigido pela legislação fiscal (em geral, 5 anos).</li>
              <li>Registros de acesso (IP, data e hora): 6 meses, como exige o Marco Civil da Internet (art. 15), e depois apagados.</li>
              <li>Cliques nos links: até 24 meses, sempre com o IP em forma de código irreversível.</li>
              <li>Cookie de atribuição: 30 dias no seu navegador.</li>
              <li>Atendimentos: 5 anos (prazo do Código de Defesa do Consumidor para reclamar de danos).</li>
              <li>Registros de erros do servidor: 90 dias.</li>
            </Itens>
          ),
        },
        {
          id: "direitos",
          titulo: "Seus direitos",
          conteudo: (
            <>
              <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
              <Itens>
                <li>confirmação de que tratamos seus dados e acesso a eles;</li>
                <li>correção de dados incompletos, errados ou desatualizados;</li>
                <li>anonimização, bloqueio ou exclusão de dados desnecessários ou tratados em desacordo com a lei;</li>
                <li>portabilidade dos dados a outro fornecedor;</li>
                <li>exclusão dos dados tratados com o seu consentimento e revogação desse consentimento;</li>
                <li>informação sobre com quem compartilhamos seus dados e sobre a possibilidade de não consentir;</li>
                <li>revisão de decisões tomadas apenas de forma automatizada.</li>
              </Itens>
              <p>
                Respondemos em até 15 dias. Se não ficar satisfeito, você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD). Alguns
                dados podem precisar ser mantidos por obrigação legal mesmo após um pedido de exclusão — nesse caso, explicamos o motivo.
              </p>
            </>
          ),
        },
        {
          id: "seguranca",
          titulo: "Como protegemos",
          conteudo: (
            <Itens>
              <li>Conexão sempre criptografada (HTTPS) e senhas guardadas de forma cifrada.</li>
              <li>Regras de acesso no próprio banco de dados: cada pessoa só enxerga o que é dela.</li>
              <li>Documentos de produtores em área privada, acessível apenas à equipe de análise.</li>
              <li>IP de quem clica em links guardado apenas como código irreversível.</li>
            </Itens>
          ),
        },
        {
          id: "cookies",
          titulo: "Cookies",
          conteudo: (
            <p>
              Usamos poucos cookies, todos da própria Staypse, sem analytics, sem pixels e sem publicidade de terceiros. Veja quais são na{" "}
              <Link href="/cookies" className="underline">Política de cookies</Link>.
            </p>
          ),
        },
        {
          id: "menores",
          titulo: "Menores de idade",
          conteudo: <p>
              A Staypse não é destinada a menores de 16 anos. Quem tem 16 ou 17 anos só pode criar conta de afiliado ou de vendedor da loja, com
              autorização dos pais ou responsáveis (declarada no cadastro); para ter uma loja é preciso ter 18 anos ou ser emancipado. Compras de
              menores de 18 anos só com o responsável legal. Para saber a idade pedimos apenas uma declaração, e não a data de nascimento. Se
              identificarmos uma conta ou uma inscrição de menor de 16 anos, ou de menor sem autorização, ela será encerrada e os dados, excluídos.
              Pais e responsáveis podem pedir informações e a exclusão dos dados pelo canal de privacidade.
            </p>,
        },
        {
          id: "mudancas",
          titulo: "Mudanças nesta política",
          conteudo: <p>Quando esta política mudar de forma relevante, avisaremos pelos canais da conta. A versão em vigor fica sempre nesta página.</p>,
        },
        {
          id: "canal-lgpd",
          titulo: "Canal de privacidade (LGPD)",
          conteudo: (
            <div className="rounded-2xl bg-petroleo p-5 text-gelo">
              <p>
                Para exercer seus direitos ou tirar dúvidas sobre seus dados, fale com o encarregado pelo tratamento de dados pessoais (LGPD,
                art. 41), por um destes caminhos:
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  Com conta: em{" "}
                  <Link href="/painel/meus-dados" className="font-medium text-branco underline">
                    Meus dados
                  </Link>{" "}
                  você baixa seus dados na hora e pede correção ou exclusão.
                </li>
                <li>
                  Sem conta: pelo{" "}
                  <Link href="/atendimento?assunto=lgpd_acesso" className="font-medium text-branco underline">
                    atendimento
                  </Link>
                  , com protocolo.
                </li>
                {CONTATO.emailPrivacidade && (
                  <li>
                    Por e-mail: <span className="text-lg font-medium text-branco">{CONTATO.emailPrivacidade}</span>
                  </li>
                )}
              </ul>
              <p className="mt-2 text-sm text-gelo/80">
                A Staypse é uma empresa de pequeno porte (Resolução CD/ANPD nº 2/2022): o encarregado é o canal acima, e o responsável pelo atendimento é {EMPRESA.nomeEmpresarial}.
              </p>
              <p className="mt-2 text-sm text-gelo/80">Para sua segurança, podemos pedir uma confirmação de identidade antes de atender o pedido.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
