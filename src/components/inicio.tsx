// Peças da página inicial (pré-lançamento).
// Duas peças mostram o produto como ele é: o caminho de um link curto até a loja
// oficial (com a divisão do pagamento) e a tabela de produtos do painel da loja.
// Os percentuais são exemplos; a comissão real de cada produto é da loja.

const SPLIT = [
  ["Lia Calçados", "produtor", 66, "bg-petroleo"],
  ["Ana", "afiliada", 26, "bg-ciano"],
  ["Staypse", "taxa da plataforma", 8, "bg-petroleo/30"],
] as const;

function BarraSplit({ animada = false }: { animada?: boolean }) {
  return (
    <div className="flex h-2 gap-1 overflow-hidden rounded-full" aria-hidden="true">
      {SPLIT.map(([nome, , pct, cor], i) => (
        <span
          key={nome}
          className={`${animada ? "split-segmento " : ""}${cor}`}
          style={{ flexGrow: pct, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// ---------- hero: o link curto da Ana até a loja da Lia ----------
// "host": endereço do site sem https:// (vem de urlDoSite, nunca fixo no código)
export function LinkParaLoja({ host }: { host: string }) {
  return (
    <figure
      role="img"
      aria-label="Exemplo: o link /@ana/tenis-runner leva à loja oficial da Lia Calçados, e o pagamento é dividido entre loja, afiliada e Staypse"
      className="w-full max-w-md justify-self-center lg:justify-self-end"
    >
      <div className="overflow-hidden rounded-2xl bg-branco text-petroleo">
        <div className="bg-gelo px-5 py-3">
          <p className="text-xs text-petroleo/75">O que a Ana compartilha</p>
          <p className="mt-0.5 truncate font-mono text-sm">
            {host}/@ana/<span className="font-medium">tenis-runner</span>
          </p>
        </div>
        <div className="px-5 py-5">
          <p className="text-xs text-petroleo/75">Quem clica cai na loja oficial</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-medium leading-tight">Tênis Runner</p>
              <p className="text-sm text-petroleo/75">Lia Calçados</p>
              <p className="mt-1 font-mono text-xs text-petroleo/75">Indicado por @ana</p>
            </div>
            <span className="shrink-0 rounded-lg bg-petroleo px-4 py-2 text-sm font-medium text-branco">Comprar</span>
          </div>
        </div>
        <div className="border-t border-petroleo/10 px-5 py-5">
          <p className="text-sm font-medium">Na hora do pagamento, a Lytex divide</p>
          <div className="mt-3"><BarraSplit animada /></div>
          <dl className="mt-4 flex flex-col gap-1.5 text-sm">
            {SPLIT.map(([nome, papel, pct, cor]) => (
              <div key={nome} className="flex items-baseline gap-2">
                <span className={`h-2 w-2 shrink-0 self-center rounded-full ${cor}`} />
                <dt className="font-medium">{nome}</dt>
                <dd className="flex-1 text-petroleo/75">{papel}</dd>
                <dd className="font-mono tabular-nums">{pct}%</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-gelo/75">Exemplo com a comissão da Ana em 26%. Cada loja define a de cada produto.</figcaption>
    </figure>
  );
}

// ---------- perguntas frequentes (sanfona nativa: acessível, sem JavaScript) ----------
export const PERGUNTAS: [string, string][] = [
  ["O que é a Staypse?", "Uma plataforma de afiliados para produtos físicos e digitais. Lojas e fábricas cadastram os produtos e definem a comissão; afiliados divulgam pelo próprio link; o pagamento é dividido automaticamente entre as partes."],
  ["Quando a Staypse abre?", "Ainda não temos data fechada. Estamos montando as primeiras lojas e vitrines. Quem está na lista de espera é avisado antes da abertura, e quem indica mais pessoas entra antes no acesso antecipado."],
  ["Entrar na lista ou usar a Staypse custa algo?", "Entrar na lista de espera é grátis, e não haverá taxa de adesão nem mensalidade. Quando a plataforma abrir, a Staypse terá uma taxa sobre cada venda, que já sai dividida no pagamento. Os percentuais serão informados antes da abertura."],
  ["Como funciona o pagamento?", "Pagamentos processados pela Lytex. O split acontece na Lytex: no momento da compra, ela divide o valor entre loja, afiliado e Staypse, e cada parte recebe a sua direto. A Staypse nunca recebe nem guarda o dinheiro de ninguém."],
  ["Preciso ter estoque ou muitos seguidores para ser afiliado?", "Não. Você divulga pelo seu link e a loja envia o pedido. Os resultados variam: dependem dos produtos que você escolher e de como divulgar."],
  ["Ganho por trazer outras pessoas?", "Não. A comissão vem só das vendas feitas pelo próprio afiliado. Indicar pessoas para a lista de espera só adianta a entrada delas e a sua no acesso antecipado: não há sorteio nem prêmio em dinheiro."],
  ["Trabalho em uma loja. Como entro?", "Escolha \"Trabalho em loja\" na lista e diga em qual loja você trabalha. Quando a loja usar a Staypse, ela poderá convidar você como vendedor e combinar a sua comissão."],
  ["Quem pode vender produtos?", "Lojas e fábricas com CNPJ ativo que emitem nota fiscal de todas as vendas. Cada loja e cada produto passam por análise antes de aparecer nas vitrines."],
  ["O que a Staypse faz com os meus dados?", "Pedimos só o que é preciso para avisar você da abertura e entender qual é o seu perfil. Você marca o consentimento antes de enviar e pode pedir a exclusão a qualquer momento pelo canal de privacidade (LGPD) da Staypse."],
  ["E se o comprador se arrepender?", "O comprador tem 7 dias para desistir da compra e pedir de volta tudo o que pagou, inclusive o frete. A devolução segue a mesma proporção do split."],
];

export function Perguntas() {
  return (
    <div className="divide-y divide-petroleo/10 border-y border-petroleo/10">
      {PERGUNTAS.map(([pergunta, resposta]) => (
        <details key={pergunta} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-lg font-medium [&::-webkit-details-marker]:hidden">
            {pergunta}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gelo text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="max-w-prose pb-5 text-petroleo/80">{resposta}</p>
        </details>
      ))}
    </div>
  );
}

// ---------- painel da loja: a tabela de produtos e o último pedido ----------
const LINHAS_PAINEL = [
  ["Tênis Runner", "15%", "Aprovado"],
  ["Camiseta básica algodão", "20%", "Aprovado"],
  ["Curso de maquiagem (digital)", "30%", "Em análise"],
] as const;
const ETAPAS_PEDIDO = ["Pagamento aprovado na Lytex", "Split feito entre as partes", "Nota fiscal emitida pela loja"] as const;

export function PainelLoja() {
  return (
    <figure
      role="img"
      aria-label="Exemplo do painel de uma loja: tabela de produtos com a comissão definida pela loja e as etapas do último pedido"
      className="w-full overflow-hidden rounded-2xl bg-branco text-petroleo"
    >
      <div className="grid md:grid-cols-[1.3fr_1fr]" aria-hidden="true">
        <div className="p-5">
          <p className="font-mono text-xs text-petroleo/75">Painel da loja / Produtos</p>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-petroleo/15 text-xs text-petroleo/75">
                <th className="py-2 pr-3 font-medium">Produto</th>
                <th className="py-2 pr-3 font-medium">Comissão</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {LINHAS_PAINEL.map(([nome, pct, status]) => (
                <tr key={nome} className="border-b border-petroleo/10 last:border-0">
                  <td className="py-3 pr-3 font-medium">{nome}</td>
                  <td className="py-3 pr-3 font-mono tabular-nums">{pct}</td>
                  <td className="py-3 text-petroleo/75">{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-petroleo/10 bg-gelo p-5 md:border-t-0 md:border-l">
          <p className="font-mono text-xs text-petroleo/75">Último pedido</p>
          <ol className="mt-3 flex flex-col gap-2.5 text-sm">
            {ETAPAS_PEDIDO.map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="w-4 font-mono tabular-nums text-petroleo/75">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <div className="mt-5"><BarraSplit /></div>
          <p className="mt-2 text-xs text-petroleo/75">Cada parte recebe a sua direto da Lytex.</p>
        </div>
      </div>
    </figure>
  );
}

// ---------- como é hoje x com a Staypse (sem citar concorrente) ----------
export const COMPARATIVO = [
  ["Comissão", "Combinada por mensagem e difícil de conferir.", "Definida pela loja e visível ao afiliado antes de divulgar."],
  ["Pagamento", "Acerto manual entre loja e afiliado, depois da venda.", "Split automático na Lytex: cada parte recebe a sua direto."],
  ["Divulgação", "Link solto, catálogo em PDF ou lista no WhatsApp.", "Vitrine própria, com endereço só do afiliado."],
  ["Nota fiscal e devolução", "Cada loja resolve do seu jeito.", "A loja emite a nota fiscal e o comprador tem 7 dias para desistir."],
] as const;
