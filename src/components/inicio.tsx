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

// ---------- vitrine no celular + barra do split ----------
export function VitrineSplit() {
  return (
    <figure className="relative mx-auto w-full max-w-[19rem]" aria-label="Exemplo ilustrativo de uma vitrine na Staypse e da divisão de um pagamento">
      {/* celular */}
      <div className="rounded-[2.2rem] bg-[#0B3A3F] p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.75rem] bg-branco text-petroleo">
          {/* endereço da vitrine */}
          <div className="flex items-center gap-2 bg-gelo px-4 py-2.5 text-[11px] text-petroleo/70">
            <span className="h-2 w-2 rounded-full bg-petroleo/30" />
            staypse.com.br/<span className="font-medium text-petroleo">ana</span>
          </div>

          <div className="px-4 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-petroleo text-sm font-extrabold text-ciano">A</span>
              <div className="leading-tight">
                <p className="text-sm font-medium">Vitrine da Ana</p>
                <p className="text-[11px] text-petroleo/60">Beleza e cuidados</p>
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
              <p className="text-xs text-petroleo/60">Enviado pelo produtor</p>
            </div>

            <div className="mt-3 w-full rounded-full bg-petroleo py-2.5 text-center text-sm font-medium text-branco">Comprar</div>
          </div>
        </div>
      </div>

      {/* o split */}
      <figcaption className="relative -mt-8 mx-3 rounded-2xl bg-branco p-4 text-petroleo shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]">
        <p className="text-sm font-medium">Um pagamento, dividido na hora</p>
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
        <p className="mt-2 text-[11px] text-petroleo/60">Ilustrativo. A comissão de cada produto é definida pelo produtor.</p>
      </figcaption>
    </figure>
  );
}

// ---------- perguntas frequentes (sanfona nativa: acessível, sem JavaScript) ----------
export const PERGUNTAS: [string, string][] = [
  ["Preciso pagar para entrar?", "Não. Não há taxa de adesão nem mensalidade. A Staypse fica com uma taxa sobre cada venda, descontada automaticamente no split."],
  ["Preciso ter estoque ou muitos seguidores?", "Não. Como revendedor, você indica pelo seu link e o produtor envia o pedido. Dá para começar indicando para quem você já conhece."],
  ["Como recebo a minha parte?", "No pagamento, a instituição de pagamento parceira divide o valor automaticamente entre produtor, revendedor e Staypse. A Staypse não recebe nem guarda o dinheiro de ninguém."],
  ["Ganho por trazer outros revendedores?", "Não. Você ganha somente sobre as suas próprias vendas. Indicar amigos para a lista de espera só adianta a sua entrada no acesso antecipado."],
  ["Quem pode vender produtos?", "Empresas com CNPJ ativo que emitem nota fiscal de todas as vendas. Cada produtor e cada produto passam por análise antes de aparecer nas vitrines."],
  ["E se o comprador se arrepender?", "O comprador tem 7 dias para desistir da compra. O reembolso é proporcional ao que cada parte recebeu no split."],
  ["Quando a Staypse abre?", "Estamos montando as primeiras vitrines. Quem está na lista de espera recebe o aviso pelo WhatsApp, e quem trouxer mais pessoas entra primeiro."],
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
