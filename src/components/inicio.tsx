// Peças da página inicial (pré-lançamento).
// O elemento central é a "vitrine com o split": mostra, de forma ilustrativa,
// como UM pagamento se divide entre produtor, revendedor e Staypse — a mesma
// ideia do "yp" da logo. Não mostra valores de ganho (regra de comunicação).

// ---------- ícones (traço simples, herdam a cor do texto) ----------
type IconeProps = { className?: string };
const base = "h-6 w-6 shrink-0";

export const IconeSplit = ({ className = base }: IconeProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 3v7M12 10l-6 6v5M12 10l6 6v5" />
  </svg>
);
export const IconeSelo = ({ className = base }: IconeProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const IconeVolta = ({ className = base }: IconeProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4h4" />
  </svg>
);
export const IconePessoa = ({ className = base }: IconeProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const IconeCheck = ({ className = "h-5 w-5 shrink-0" }: IconeProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const tr = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={base} aria-hidden="true">
    <path d={d} />
  </svg>
);
export const IconeLoja = () => tr("M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3M10 20v-5h4v5");
export const IconeLink = () => tr("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1");
export const IconeCrachaVendedor = () => tr("M5 4h14v16H5zM9 9h6M9 13h6M9 17h3");
export const IconeSacola = () => tr("M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2");

// ---------- vitrine no celular + barra do split ----------
// "host": endereço do site sem https:// (vem de urlDoSite — nunca fixo no código)
export function VitrineSplit({ host }: { host: string }) {
  return (
    <div role="img" className="relative mx-auto w-full max-w-[19rem]" aria-label="Exemplo ilustrativo de uma vitrine na Staypse e da divisão de um pagamento">
      {/* celular */}
      <div className="rounded-[2.2rem] bg-[#0B3A3F] p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.75rem] bg-branco text-petroleo">
          {/* endereço da vitrine */}
          <div className="flex items-center gap-2 bg-gelo px-4 py-2.5 text-[11px] text-petroleo/70">
            <span className="h-2 w-2 rounded-full bg-petroleo/30" />
            <span className="truncate">
              {host}/v/<span className="font-medium text-petroleo">ana</span>
            </span>
          </div>

          <div className="px-4 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-petroleo text-sm font-extrabold text-ciano">A</span>
              <div className="leading-tight">
                <p className="text-sm font-medium">Vitrine da Ana</p>
                <p className="text-[11px] text-petroleo/75">Beleza e cuidados</p>
              </div>
            </div>

            {/* produto ilustrativo (formas, sem foto) */}
            <div className="mt-4 rounded-2xl bg-gelo p-3">
              {/* frasco com conta-gotas, pote e bisnaga (formas de produto, não gráfico) */}
              <div className="flex h-28 items-end justify-center gap-3 rounded-xl bg-[linear-gradient(160deg,#d7ece9,#eef6f5)] pb-3">
                <span className="flex flex-col items-center">
                  <span className="h-3 w-2 rounded-t-full bg-petroleo" />
                  <span className="h-2 w-4 rounded-sm bg-petroleo" />
                  <span className="h-12 w-8 rounded-b-xl rounded-t-md bg-petroleo/85" />
                </span>
                <span className="flex flex-col items-center">
                  <span className="h-3 w-12 rounded-t-md bg-petroleo" />
                  <span className="h-9 w-14 rounded-b-2xl rounded-t-sm bg-ciano" />
                </span>
                <span className="flex flex-col items-center">
                  <span className="h-3 w-4 rounded-t-sm bg-petroleo" />
                  <span className="h-14 w-6 rounded-b-sm rounded-t-lg bg-branco ring-2 ring-petroleo/30" />
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">Kit cuidados com a pele</p>
              <p className="text-xs text-petroleo/75">Enviado pelo produtor</p>
            </div>

            <div className="mt-3 w-full rounded-full bg-petroleo py-2.5 text-center text-sm font-medium text-branco">Comprar</div>
          </div>
        </div>
      </div>

      {/* o split */}
      <figcaption className="relative -mt-8 mx-3 rounded-2xl bg-branco p-4 text-petroleo shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]">
        <p className="text-sm font-medium">Um pagamento, dividido automaticamente</p>
        <div className="mt-3 flex h-3 gap-1 overflow-hidden" aria-hidden="true">
          <span className="split-segmento rounded-l-full bg-petroleo" style={{ flexGrow: 66 }} />
          <span className="split-segmento bg-ciano" style={{ flexGrow: 26, animationDelay: "120ms" }} />
          <span className="split-segmento rounded-r-full bg-petroleo/30" style={{ flexGrow: 8, animationDelay: "240ms" }} />
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-[11px] leading-tight">
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-petroleo" />Produtor</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ciano" />Revendedor</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-petroleo/30" />Staypse</li>
        </ul>
        <p className="mt-2 text-[11px] text-petroleo/75">Ilustrativo. A comissão de cada produto é definida pelo produtor.</p>
      </figcaption>
    </div>
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

// ---------- painel da loja (ilustrativo, montado em HTML; sem números de ganho) ----------
const LINHAS_PAINEL = [
  ["Kit cuidados com a pele", "Aprovado", true],
  ["Camiseta básica algodão", "Aprovado", true],
  ["Curso de maquiagem (digital)", "Em análise", false],
] as const;
const ETAPAS_PEDIDO = ["Pagamento aprovado na Lytex", "Split feito entre as partes", "Nota fiscal emitida pela loja"] as const;

export function PainelIlustrativo() {
  return (
    <div role="img" aria-label="Exemplo ilustrativo do painel de uma loja: produtos com comissão definida pela loja e as etapas de um pedido" className="w-full overflow-hidden rounded-2xl bg-branco text-petroleo shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3 bg-gelo px-4 py-3 text-xs">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-petroleo/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-petroleo/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-petroleo/25" />
        </span>
        <span className="font-medium">Painel da loja</span>
        <span className="rounded-full bg-petroleo px-2.5 py-1 text-[11px] font-medium text-gelo">Ilustrativo</span>
      </div>
      <div className="grid gap-px bg-petroleo/10 md:grid-cols-[1.25fr_1fr]" aria-hidden="true">
        <div className="bg-branco p-4 sm:p-5">
          <p className="text-sm font-medium">Produtos</p>
          <ul className="mt-3 divide-y divide-petroleo/10">
            {LINHAS_PAINEL.map(([nome, status, ativo]) => (
              <li key={nome} className="flex items-center gap-3 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gelo">
                  <span className={`h-5 w-4 rounded-sm ${ativo ? "bg-petroleo" : "bg-petroleo/30"}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{nome}</span>
                  <span className="block text-[11px] text-petroleo/75">Comissão definida pela loja</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${ativo ? "bg-ciano text-petroleo" : "bg-gelo text-petroleo"}`}>{status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-branco p-4 sm:p-5">
          <p className="text-sm font-medium">Último pedido</p>
          <ol className="mt-3 flex flex-col gap-3">
            {ETAPAS_PEDIDO.map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-petroleo text-ciano"><IconeCheck className="h-3.5 w-3.5" /></span>
                {t}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex h-3 gap-1 overflow-hidden">
            <span className="rounded-l-full bg-petroleo" style={{ flexGrow: 66 }} />
            <span className="bg-ciano" style={{ flexGrow: 26 }} />
            <span className="rounded-r-full bg-petroleo/30" style={{ flexGrow: 8 }} />
          </div>
          <p className="mt-2 text-[11px] text-petroleo/75">Cada parte recebe a sua direto da Lytex.</p>
        </div>
      </div>
    </div>
  );
}

// ---------- como é hoje x com a Staypse (sem citar concorrente) ----------
export const COMPARATIVO = [
  ["Comissão", "Combinada por mensagem e difícil de conferir.", "Definida pela loja e visível ao afiliado antes de divulgar."],
  ["Pagamento", "Acerto manual entre loja e afiliado, depois da venda.", "Split automático na Lytex: cada parte recebe a sua direto."],
  ["Divulgação", "Link solto, catálogo em PDF ou lista no WhatsApp.", "Vitrine própria, com endereço só do afiliado."],
  ["Nota fiscal e devolução", "Cada loja resolve do seu jeito.", "A loja emite a nota fiscal e o comprador tem 7 dias para desistir."],
] as const;
