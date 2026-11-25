// Peças da página inicial. Tudo é HTML, CSS e SVG de servidor (sem JavaScript de cliente).

// O único elemento visual: um link de afiliada se desdobrando nas três partes da divisão.
const PARTES = [
  ["Loja", "o produto, o envio e a nota fiscal"],
  ["Afiliada", "a comissão combinada na loja"],
  ["Staypse", "a taxa por venda, já descontada"],
] as const;

export function LinkDividido({ host }: { host: string }) {
  return (
    <figure className="m-0">
      <p className="break-all text-2xl leading-tight font-medium tracking-[-0.02em] text-ciano sm:text-4xl">
        {host}/@ana/tenis
      </p>
      <div className="mt-2 flex gap-5 sm:gap-8">
        <svg width="40" height="200" viewBox="0 0 40 200" fill="none" className="h-[12.5rem] w-10 shrink-0 sm:w-14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 0V29Q1 33 5 33H40M1 29V163Q1 167 5 167H40M1 100H40" stroke="#14D6C4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className="grid h-[12.5rem] flex-1 grid-rows-3">
          {PARTES.map(([nome, texto]) => (
            <li key={nome} className="flex flex-col justify-center">
              <span className="text-2xl leading-none font-extrabold tracking-[-0.02em] text-branco sm:text-3xl">{nome}</span>
              <span className="mt-1 text-gelo/85">{texto}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-4 text-sm text-gelo/80">Um link, três partes.</figcaption>
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
    <div className="divide-y divide-petroleo/20 border-y border-petroleo">
      {PERGUNTAS.map(([pergunta, resposta]) => (
        <details key={pergunta} className="group">
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
