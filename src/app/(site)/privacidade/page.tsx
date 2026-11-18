// Política de Privacidade (LGPD — Lei 13.709/2018) + canal do titular.
// Ao mudar o texto, troque TERMOS_VERSAO em src/config/empresa.ts.
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { EMPRESA, TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Staypse trata dados pessoais, com quais bases legais e como exercer seus direitos (LGPD).",
};

// [finalidade, dados, base legal (LGPD, art. 7º)]
const FINALIDADES: [string, string, string][] = [
  ["Lista de espera e aviso de lançamento", "Nome, e-mail, WhatsApp, cidade/UF, interesse e nichos; para produtores, empresa, CNPJ (opcional) e o que vende", "Consentimento (inciso I), dado ao se inscrever"],
  ["Criar e manter sua conta", "Nome, e-mail, senha (guardada de forma cifrada), papéis na plataforma e aceite dos termos", "Execução de contrato (inciso V)"],
  ["Cadastro da loja e curadoria", "Razão social, CNPJ, inscrição estadual, endereço comercial e contatos (sem documentos de identidade: quem verifica é a instituição de pagamento)", "Execução de contrato (V) e legítimo interesse na prevenção a fraudes (IX)"],
  ["Cadastro de recebimento (instituição de pagamento)", "CPF ou CNPJ de quem recebe e a situação do cadastro (em análise, aprovado, recusado ou suspenso) com o motivo informado pela instituição. Documentos e dados bancários vão direto para a instituição de pagamento; a Staypse não recebe nem guarda", "Execução de contrato (V)"],
  ["Mostrar quem vende cada produto", "Razão social, CNPJ, endereço e contato da empresa produtora", "Obrigação legal — Decreto 7.962/2013 (II)"],
  ["Vitrines, links e atribuição de vendas", "Seu @, nome da vitrine, foto e links; nos cliques: data, produto, origem e o IP transformado em código irreversível (hash)", "Execução de contrato com o afiliado (V) e legítimo interesse (IX)"],
  ["Vendedores da loja", "E-mail do convite, comissão combinada, forma de pagamento e histórico de alterações (informados pela loja)", "Execução de contrato (V)"],
  ["Pedidos e pagamentos", "Nome, e-mail, CPF, telefone e endereço de entrega do comprador; dados do pedido, da entrega, da nota fiscal e de eventual desistência", "Execução de contrato (V) e obrigação legal fiscal e do CDC (II)"],
  ["Registros de acesso", "IP, data e hora de acesso à conta", "Obrigação legal — Marco Civil da Internet, art. 15 (II)"],
  ["Atendimento e pedidos de titulares", "Nome, e-mail, assunto, mensagem, protocolo e, se você informar, o código do pedido", "Execução de contrato (V) e obrigação legal — Decreto 7.962/2013 e LGPD (II)"],
  ["Segurança e funcionamento do site", "Registros de erros do servidor (data, página e mensagem técnica), sem nome, e-mail, CPF ou códigos de acesso", "Legítimo interesse em manter o site seguro e funcionando (IX)"],
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
            Não vendemos dados. O IP de quem clica nos links vira um código irreversível. Você pode pedir acesso, correção ou exclusão a qualquer
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
                {FINALIDADES.map(([fim, dados, base]) => (
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
                  </li>
                ))}
              </ul>
              <p>Não tratamos dados sensíveis (como saúde, religião ou biometria) e não usamos seus dados em decisões automatizadas que afetem seus interesses.</p>
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
                <li><strong className="font-medium">Vercel</strong>: hospedagem do site, que pode processar dados de navegação fora do Brasil.</li>
                <li><strong className="font-medium">Instituição de pagamento parceira (Lytex)</strong>: processa os pagamentos e o split e faz a verificação de identidade de lojas, afiliados e vendedores no cadastro de recebimento — como controladora desses dados, pela política dela.</li>
                <li><strong className="font-medium">Produtores</strong>: recebem os dados de entrega e de nota fiscal dos pedidos que vendem e só podem usá-los para cumprir o pedido.</li>
                <li><strong className="font-medium">Revendedores e vendedores da loja</strong>: veem apenas data, produto, valor, comissão e situação das próprias vendas — nunca nome, e-mail ou telefone do comprador.</li>
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
              Alguns fornecedores de tecnologia podem processar dados no exterior (por exemplo, nos Estados Unidos). Nesses casos, a transferência
              segue o art. 33 da LGPD, com fornecedores que oferecem garantias contratuais de proteção de dados.
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
              <li>Registros de acesso: pelo menos 6 meses, como exige o Marco Civil da Internet.</li>
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
              Usamos poucos cookies, todos da própria Staypse e sem publicidade de terceiros. Veja quais são na{" "}
              <Link href="/cookies" className="underline">Política de cookies</Link>.
            </p>
          ),
        },
        {
          id: "menores",
          titulo: "Menores de idade",
          conteudo: <p>A Staypse não é destinada a menores de 18 anos. Se identificarmos uma conta de menor, ela será encerrada e os dados, excluídos.</p>,
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
              <p>Para exercer seus direitos ou tirar dúvidas sobre seus dados, use um destes caminhos (encarregado pelo tratamento de dados pessoais):</p>
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
                <li>
                  Por e-mail: <span className="text-lg font-medium text-branco">{EMPRESA.emailPrivacidade}</span>
                </li>
              </ul>
              <p className="mt-2 text-sm text-gelo/80">Para sua segurança, podemos pedir uma confirmação de identidade antes de atender o pedido.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
