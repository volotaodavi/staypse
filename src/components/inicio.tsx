// Peças da página inicial. Linguagem: etiqueta de preço e recibo, como no
// comércio de verdade. Tudo é HTML e CSS de servidor (sem JavaScript de cliente).
// Os valores são EXEMPLO e vêm marcados como exemplo na própria peça.

// Divisão do exemplo: R$ 250,00 = 66% loja + 26% afiliada + 8% plataforma.
const RECIBO = [
  ["Lia Calçados", "loja", "R$ 165,00"],
  ["Ana", "afiliada", "R$ 65,00"],
  ["Staypse", "taxa", "R$ 20,00"],
] as const;

// ---------- a coisa memorável: o link vira etiqueta, a venda vira recibo ----------
// "host": endereço do site sem https:// (vem de urlDoSite, nunca fixo no código)
export function EtiquetaERecibo({ host }: { host: string }) {
  return (
    <figure
      role="img"
      aria-label="Exemplo: o link /@ana/tenis-runner numa etiqueta de preço de R$ 250,00 e o recibo da divisão do pagamento feita pela Lytex, com R$ 165,00 para a loja, R$ 65,00 para a afiliada e R$ 20,00 de taxa da Staypse. Valores de exemplo."
      className="relative mx-auto w-full max-w-sm pb-4 lg:mx-0 lg:justify-self-end"
    >
      <div aria-hidden="true">
        {/* barbante */}
        <svg className="mx-auto -mb-3 block h-14 w-24 overflow-visible" viewBox="0 0 96 56" fill="none">
          <path d="M8 0C20 30 48 40 62 50" stroke="#EEF6F5" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* etiqueta de preço */}
        <div
          className="relative -rotate-3 bg-ciano px-6 pt-9 pb-6 text-petroleo"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 22px 100%, 0 calc(100% - 22px))" }}
        >
          <span className="absolute top-3 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-petroleo" />
          <p className="text-sm font-medium">O link que a Ana põe na bio</p>
          <p className="mt-1 font-mono text-[0.95rem] leading-snug break-all">
            {host}/@ana/<b className="font-medium underline decoration-2 underline-offset-4">tenis-runner</b>
          </p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-lg font-medium leading-tight">Tênis Runner</p>
              <p className="text-sm">Lia Calçados, Recife</p>
            </div>
            <p className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">R$&nbsp;250</p>
          </div>
          <div
            className="mt-5 h-8 opacity-80"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#062c30 0 2px,transparent 2px 5px,#062c30 5px 6px,transparent 6px 10px,#062c30 10px 13px,transparent 13px 15px)",
            }}
          />
        </div>

        {/* recibo da divisão */}
        <div
          className="relative z-10 -mt-3 ml-auto w-[92%] rotate-2 bg-branco px-5 pt-5 pb-8 font-mono text-[0.8125rem] leading-relaxed text-petroleo"
          style={{
            clipPath:
              "polygon(0 0,100% 0,100% calc(100% - 8px),95% 100%,90% calc(100% - 8px),85% 100%,80% calc(100% - 8px),75% 100%,70% calc(100% - 8px),65% 100%,60% calc(100% - 8px),55% 100%,50% calc(100% - 8px),45% 100%,40% calc(100% - 8px),35% 100%,30% calc(100% - 8px),25% 100%,20% calc(100% - 8px),15% 100%,10% calc(100% - 8px),5% 100%,0 calc(100% - 8px))",
          }}
        >
          <p className="font-sans text-base font-bold">Recibo da venda (exemplo)</p>
          <p className="text-petroleo/75">Tênis Runner, 1 un.</p>
          <ul className="mt-3 flex flex-col gap-1">
            {RECIBO.map(([nome, papel, valor]) => (
              <li key={nome} className="flex items-baseline gap-2">
                <span>
                  {nome} <span className="text-petroleo/75">({papel})</span>
                </span>
                <span className="mb-1 min-w-4 flex-1 self-end border-b border-dotted border-petroleo/50" />
                <span className="tabular-nums">{valor}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-baseline justify-between border-t border-dashed border-petroleo/50 pt-2 font-medium">
            <span>Total pago</span>
            <span className="tabular-nums">R$ 250,00</span>
          </p>
          <p className="mt-2 text-petroleo/75">Dividido pela Lytex na hora do pagamento.</p>
        </div>
      </div>
    </figure>
  );
}

// ---------- perguntas frequentes (sanfona nativa: acessível, sem JavaScript) ----------
export const PERGUNTAS: [string, string][] = [
  ["O que é a Staypse?", "Uma plataforma de afiliados para produtos físicos e digitais. Lojas e fábricas cadastram os produtos e definem a comissão; afiliados divulgam pelo próprio link; o pagamento é dividido automaticamente entre as partes."],
  ["Criar conta custa alguma coisa?", "Não. Criar conta é grátis, sem taxa de adesão nem mensalidade. A Staypse cobra uma taxa por venda, paga pelo produtor e já descontada na divisão do pagamento. Os percentuais estão na página de taxas."],
  ["Como funciona o pagamento?", "Pagamentos processados pela Lytex. O split acontece na Lytex: no momento da compra, ela divide o valor entre loja, afiliado e Staypse, e cada parte recebe a sua direto. A Staypse nunca recebe nem guarda o dinheiro de ninguém."],
  ["Preciso de estoque ou de muitos seguidores para ser afiliado?", "Não. Você divulga pelo seu link e a loja envia o pedido. Os resultados variam: dependem dos produtos que você escolher e de como divulgar."],
  ["Ganho por trazer outras pessoas?", "Não. A comissão vem só das vendas feitas pelo próprio afiliado. Não existe taxa de adesão nem comissão por recrutar."],
  ["Trabalho em uma loja. Como entro?", "A loja convida você como vendedor pelo e-mail e combina a sua comissão. Ao aceitar o convite, a sua conta já fica ligada a ela."],
  ["Quem pode vender produtos?", "Lojas e fábricas com CNPJ ativo que emitem nota fiscal de todas as vendas. Cada loja e cada produto passam por análise antes de aparecer nas vitrines."],
  ["E se o comprador se arrepender?", "O comprador tem 7 dias para desistir da compra e pedir de volta tudo o que pagou, inclusive o frete. A devolução segue a mesma proporção do split."],
  ["O que a Staypse faz com os meus dados?", "Pedimos só o que é preciso para criar a conta e fazer a venda acontecer. Você pode pedir a exclusão a qualquer momento pelo canal de privacidade (LGPD) da Staypse."],
];

export function Perguntas() {
  return (
    <div className="divide-y divide-petroleo/15 border-y border-petroleo/15">
      {PERGUNTAS.map(([pergunta, resposta]) => (
        <details key={pergunta} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-lg font-medium [&::-webkit-details-marker]:hidden">
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
