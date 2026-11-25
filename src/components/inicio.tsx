// Peças da página inicial. Tudo é HTML, CSS e SVG de servidor (sem JavaScript de cliente).

// Visual do hero: três cartões de vidro com coisas reais da Staypse (link, vitrine, recibo da divisão).
// Os valores são de exemplo e estão marcados como tal.
const VIDRO =
  "rounded-3xl border border-white/15 bg-white/[0.07] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl";

function Tenis() {
  return (
    <svg viewBox="0 0 120 80" className="h-auto w-4/5" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="72" rx="48" ry="4" fill="#062C30" opacity="0.18" />
      <path d="M8 56h104c0 9-6 14-15 14H23C14 70 8 65 8 56z" fill="#FFFFFF" />
      <path d="M10 56c0-11 4-19 12-23l9-3 8 8c6 4 14 6 24 6 18 0 32 4 47 11v1H10z" fill="#062C30" />
      <path d="M22 33l9-3 8 8c3 2 6 3 10 4-14 1-24-1-31-7z" fill="#14D6C4" />
      <path d="M40 40l-6 6M48 43l-6 6M56 45l-6 6" stroke="#EEF6F5" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 56h98" stroke="#14D6C4" strokeWidth="2" />
    </svg>
  );
}

function Garrafa() {
  return (
    <svg viewBox="0 0 80 100" className="h-auto w-1/2" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="95" rx="22" ry="3.5" fill="#062C30" opacity="0.18" />
      <rect x="31" y="4" width="18" height="12" rx="4" fill="#062C30" />
      <rect x="27" y="14" width="26" height="8" rx="3" fill="#14D6C4" />
      <rect x="22" y="22" width="36" height="70" rx="12" fill="#062C30" />
      <rect x="22" y="48" width="36" height="14" fill="#14D6C4" />
      <rect x="28" y="28" width="5" height="58" rx="2.5" fill="#FFFFFF" opacity="0.18" />
    </svg>
  );
}

const PARTES = [
  // Pix de R$ 200, comissão 20%: taxa 1,5% + R$ 2,00 = R$ 5,00, rateada (loja R$ 4,00; afiliada R$ 1,00)
  ["Loja", "R$ 156,00", "bg-gelo/45"],
  ["Afiliada @ana", "R$ 39,00", "bg-ciano"],
  ["Taxa Staypse (Pix)", "R$ 5,00", "bg-branco"],
] as const;

export function VisualHero({ host }: { host: string }) {
  return (
    <figure className="m-0 [perspective:1600px]" aria-label="Exemplo de link, vitrine e divisão de uma venda">
      <div className="relative flex flex-col lg:block lg:h-[40rem] lg:[transform:rotateY(-6deg)_rotateX(2deg)] lg:[transform-style:preserve-3d]">
        {/* link da afiliada */}
        <div className={`${VIDRO} relative z-20 px-5 py-4 lg:absolute lg:top-0 lg:left-0 lg:w-[68%]`}>
          <p className="text-sm text-gelo/75">Seu link de afiliada</p>
          <p className="mt-1 break-all text-lg font-semibold text-branco sm:text-xl">
            <span className="text-gelo/70">{host}</span>
            <span className="text-ciano">/@ana/tenis-runner</span>
          </p>
        </div>

        {/* vitrine com dois produtos */}
        <div className={`${VIDRO} relative z-10 -mt-3 ml-6 p-4 lg:absolute lg:top-[6rem] lg:right-0 lg:left-auto lg:m-0 lg:w-[84%]`}>
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="font-semibold text-branco">Vitrine da Ana</p>
            <p className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-gelo/80">exemplo</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-ciano/90 to-[#7fe9dd] p-3">
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-gelo/30">
                <Tenis />
              </div>
              <p className="mt-3 text-sm font-semibold text-petroleo">Tênis Runner</p>
              <p className="text-sm text-petroleo/85 tabular-nums">R$ 200,00</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-gelo to-[#cfe6e3] p-3">
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-branco/50">
                <Garrafa />
              </div>
              <p className="mt-3 text-sm font-semibold text-petroleo">Garrafa térmica</p>
              <p className="text-sm text-petroleo/85 tabular-nums">R$ 89,90</p>
            </div>
          </div>
        </div>

        {/* recibo da divisão */}
        <div className={`${VIDRO} relative z-30 -mt-6 mr-6 bg-[#0a3a40]/95 p-5 lg:absolute lg:bottom-0 lg:left-0 lg:m-0 lg:w-[60%]`}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-branco">Divisão da venda</p>
            <p className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-gelo/80">exemplo</p>
          </div>
          <p className="mt-3 flex items-baseline justify-between text-gelo/85">
            <span>Tênis Runner</span>
            <span className="text-2xl font-semibold text-branco tabular-nums">R$ 200,00</span>
          </p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full" aria-hidden="true">
            <span className="w-[78%] bg-gelo/45" />
            <span className="w-[19.5%] bg-ciano" />
            <span className="w-[6%] bg-branco" />
          </div>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {PARTES.map(([nome, valor, cor]) => (
              <li key={nome} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-gelo/90">
                  <span className={`h-2.5 w-2.5 rounded-full ${cor}`} aria-hidden="true" />
                  {nome}
                </span>
                <span className="font-medium text-branco tabular-nums">{valor}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/10 pt-3 text-xs text-gelo/70">Cada parte recebe direto no pagamento.</p>
        </div>
      </div>
    </figure>
  );
}

// ---------- perguntas frequentes (sanfona nativa: acessível, sem JavaScript) ----------
export const PERGUNTAS: [string, string][] = [
  ["O que é a Staypse?", "Uma plataforma de afiliados para produtos físicos e digitais. Lojas e fábricas cadastram os produtos e definem a comissão; afiliados divulgam pelo próprio link; o pagamento é dividido automaticamente entre as partes."],
  ["Criar conta custa alguma coisa?", "Não. Criar conta é grátis, sem taxa de adesão nem mensalidade. A Staypse cobra uma taxa por venda, paga pelo produtor e já descontada na divisão do pagamento. Os percentuais estão na página de taxas."],
  ["Como funciona o pagamento?", "O split acontece na Lytex: no momento da compra, ela divide o valor entre loja, afiliado e Staypse, e cada parte recebe a sua direto. A Staypse nunca recebe nem guarda o dinheiro de ninguém."],
  ["Preciso de estoque ou de muitos seguidores para ser afiliado?", "Não. Você divulga pelo seu link e a loja envia o pedido. Os resultados variam: dependem dos produtos que você escolher e de como divulgar."],
  ["Ganho por trazer outras pessoas?", "Não. A comissão vem só das vendas feitas pelo próprio afiliado. Não existe taxa de adesão nem comissão por recrutar."],
  ["Trabalho em uma loja. Como entro?", "A loja convida você como vendedor pelo e-mail e combina a sua comissão. Ao aceitar o convite, a sua conta já fica ligada a ela."],
  ["Quem pode vender produtos?", "Lojas e fábricas com CNPJ ativo que emitem nota fiscal de todas as vendas. Cada loja e cada produto passam por análise antes de aparecer nas vitrines."],
  ["E se o comprador se arrepender?", "O comprador tem 7 dias para desistir da compra e pedir de volta tudo o que pagou, inclusive o frete. A devolução segue a mesma proporção do split."],
  ["O que a Staypse faz com os meus dados?", "Pedimos só o que é preciso para criar a conta e fazer a venda acontecer. Você pode pedir a exclusão a qualquer momento pelo canal de privacidade (LGPD) da Staypse."],
];

export function Perguntas() {
  return (
    <div className="flex flex-col gap-3">
      {PERGUNTAS.map(([pergunta, resposta]) => (
        <details key={pergunta} className="group rounded-2xl border border-petroleo/10 bg-branco px-5 shadow-[0_1px_2px_rgba(6,44,48,0.04)] open:shadow-[0_12px_32px_-16px_rgba(6,44,48,0.25)]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-lg font-medium [&::-webkit-details-marker]:hidden">
            {pergunta}
            <span className="relative h-4 w-4 shrink-0 transition-transform group-open:rotate-45" aria-hidden="true"><span className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-petroleo" /><span className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 bg-petroleo" /></span>
          </summary>
          <p className="max-w-prose pb-5 text-petroleo/85">{resposta}</p>
        </details>
      ))}
    </div>
  );
}
