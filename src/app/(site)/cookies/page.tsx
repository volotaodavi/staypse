// Política de cookies: o que fica gravado no navegador e por quê.
// Mantenha esta lista igual ao que o código grava (src/proxy.ts,
// src/app/ir/[afiliado]/[produto]/route.ts e src/components/AvisoCookies.tsx).
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal } from "@/components/DocumentoLegal";
import { TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Quais cookies a Staypse usa, para quê e por quanto tempo.",
  alternates: { canonical: "/cookies" },
};

// [nome, para que serve, duração, tipo]
const COOKIES: [string, string, string, string][] = [
  ["sb-…-auth-token", "Mantém você conectado à sua conta com segurança. Só é gravado depois que você entra ou cria conta.", "Até 400 dias, ou até você sair da conta", "Estritamente necessário (sem ele não dá para entrar na conta). Próprio"],
  ["sb-…-auth-token-code-verifier", "Confere que o link de confirmação de e-mail ou de acesso foi aberto por quem o pediu (segurança do login). Só existe durante esse processo.", "Até a confirmação do link", "Estritamente necessário, de segurança. Próprio"],
  [
    "staypse_atrib",
    "Lembra quem indicou cada produto que você abriu por um link de afiliado (até 12 produtos), para que a comissão vá para a pessoa certa se você comprar. Guarda só códigos internos, nenhum dado seu.",
    "30 dias",
    "Funcional, NÃO essencial: a compra funciona sem ele. Próprio, sem terceiros. Só é gravado quando você abre um link de afiliado",
  ],
  ["staypse_aviso_cookies (armazenamento local)", "Lembra que você já viu o aviso sobre cookies. Não é um cookie: fica só no seu navegador e não é enviado a ninguém.", "Até você limpar o navegador", "Preferência. Próprio"],
];

export default function Cookies() {
  return (
    <DocumentoLegal
      titulo="Política de cookies"
      versao={TERMOS_VERSAO}
      resumo={
        <p>
          A Staypse usa poucos cookies, todos próprios: um para manter você conectado e outro para saber quem indicou um produto. Não usamos
          cookies de publicidade, analytics, pixels nem de rastreamento de outras empresas, e não carregamos conteúdo de terceiros que grave
          cookies. Por isso o aviso do site é só informativo, e não pede o seu aceite para cookies necessários.
        </p>
      }
      secoes={[
        {
          id: "o-que-sao",
          titulo: "O que são cookies",
          conteudo: <p>Cookies são pequenos arquivos que um site grava no seu navegador para lembrar informações entre uma página e outra.</p>,
        },
        {
          id: "quais",
          titulo: "Quais cookies usamos",
          conteudo: (
            <ul className="flex flex-col gap-3">
              {COOKIES.map(([nome, uso, duracao, tipo]) => (
                <li key={nome} className="rounded-2xl border border-petroleo/15 p-4">
                  <p className="font-mono text-sm font-medium break-all">{nome}</p>
                  <p className="mt-1">{uso}</p>
                  <p className="mt-1 text-sm text-petroleo/75">
                    {tipo} · Duração: {duracao}
                  </p>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "terceiros",
          titulo: "Cookies e conteúdo de terceiros",
          conteudo: (
            <>
              <p>
                Não há cookies de terceiros, ferramentas de estatística (como Google Analytics), pixels (como o da Meta ou do TikTok), vídeos ou
                mapas incorporados, nem fontes carregadas de outros sites. Medimos só os cliques nos links de indicação, no nosso próprio
                banco, com o IP em código irreversível.
              </p>
              <p>
                A única consulta a outro serviço feita pelo seu navegador é a de CEP no checkout (BrasilAPI), que não grava cookies e só acontece
                quando você digita o CEP. Se a Staypse passar a usar qualquer ferramenta desse tipo, ela só será ativada depois do seu aceite, e esta
                página será atualizada antes.
              </p>
            </>
          ),
        },
        {
          id: "atribuicao",
          titulo: "Como funciona a atribuição de indicações",
          conteudo: (
            <>
              <p>
                Quando você abre um link como <code className="rounded bg-gelo px-1">/@ana/produto</code>, registramos o clique (com o IP
                transformado em código irreversível) e gravamos no cookie <code className="rounded bg-gelo px-1">staypse_atrib</code> quem
                indicou aquele produto. Se você abrir o link de outra pessoa para o mesmo produto, vale o último. Depois de 30 dias, a indicação
                expira.
              </p>
              <p>
                Usamos esse cookie com base no legítimo interesse (LGPD, art. 7º, IX) de pagar corretamente quem indicou a venda. Ele não é essencial
                para o site funcionar, mas é pouco invasivo: tem só códigos internos, vale 30 dias, não é usado para publicidade, não é
                compartilhado com outras empresas e não muda o preço que você paga. Você pode se opor a qualquer momento, bloqueando ou apagando
                o cookie no navegador (veja abaixo) ou pelo canal de privacidade.
              </p>
            </>
          ),
        },
        {
          id: "controle",
          titulo: "Como apagar ou bloquear",
          conteudo: (
            <p>
              Você pode apagar ou bloquear cookies nas configurações do seu navegador. Sem o cookie de sessão não é possível entrar na conta; sem o
              cookie de atribuição, sua compra continua funcionando normalmente, mas a indicação pode não ser registrada.
            </p>
          ),
        },
        {
          id: "mais",
          titulo: "Mais informações",
          conteudo: (
            <p>
              Veja também a <Link href="/privacidade" className="underline">Política de privacidade</Link> e os{" "}
              <Link href="/termos" className="underline">Termos de uso</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
