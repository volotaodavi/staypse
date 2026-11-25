// Peças da página inicial. Tudo é HTML, CSS e SVG de servidor (sem JavaScript de cliente).
// Os valores dos mockups são EXEMPLO e vêm marcados como exemplo.
import type { ReactNode } from "react";

const Exemplo = ({ escuro = false }: { escuro?: boolean }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-xs font-medium ${escuro ? "bg-petroleo text-gelo" : "bg-gelo text-petroleo"}`}
  >
    Exemplo
  </span>
);

const BARRAS = [38, 52, 44, 66, 58, 80, 72];
const VENDAS = [
  ["Tênis Runner", "Loja R$ 165,00 | Ana R$ 65,00"],
  ["Camiseta Lisa", "Loja R$ 48,00 | Caio R$ 12,00"],
  ["Mochila Urbana", "Loja R$ 120,00 | Ana R$ 45,00"],
] as const;

// ---------- mockup do hero: painel da loja + vitrine da afiliada no celular ----------
export function MockupProduto({ host }: { host: string }) {
  return (
    <figure
      role="img"
      aria-label="Exemplo da Staypse: painel da loja com gráfico de vendas e lista de pedidos pagos, e, sobreposta, a vitrine de uma afiliada no celular com produtos e botão de compra. Valores de exemplo."
      className="relative mx-auto w-full max-w-xl pb-10 lg:max-w-none"
    >
      <div aria-hidden="true" className="relative">
        {/* painel da loja */}
        <div className="overflow-hidden rounded-2xl bg-branco text-petroleo shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-gelo/20">
          <div className="flex items-center gap-1.5 border-b border-petroleo/10 bg-gelo px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-petroleo/25" />
            <span className="h-2.5 w-2.5 rounded-full bg-petroleo/25" />
            <span className="h-2.5 w-2.5 rounded-full bg-petroleo/25" />
            <span className="ml-3 truncate text-xs text-petroleo/75">{host}/painel</span>
            <span className="ml-auto"><Exemplo /></span>
          </div>
          <div className="grid grid-cols-[3.25rem_1fr] sm:grid-cols-[9rem_1fr]">
            <div className="flex flex-col gap-2 bg-petroleo p-2.5 text-xs text-gelo sm:p-4">
              {["Vendas", "Produtos", "Afiliados", "Pagamentos"].map((n, i) => (
                <span key={n} className={`truncate rounded-lg px-2 py-1.5 ${i === 0 ? "bg-ciano text-petroleo" : "text-gelo/85"}`}>
                  <span className="hidden sm:inline">{n}</span>
                  <span className="sm:hidden">{n.slice(0, 2)}</span>
                </span>
              ))}
            </div>
            <div className="p-3 sm:p-5">
              <p className="text-sm font-bold">Vendas da loja</p>
              <svg viewBox="0 0 280 90" className="mt-3 h-24 w-full" fill="none">
                {BARRAS.map((h, i) => (
                  <rect key={i} x={6 + i * 40} y={86 - h} width="26" height={h} rx="5" fill={i === 5 ? "#14D6C4" : "#EEF6F5"} />
                ))}
                <path d="M0 86H280" stroke="#062C30" strokeOpacity="0.2" />
              </svg>
              <ul className="mt-3 flex flex-col divide-y divide-petroleo/10 text-xs">
                {VENDAS.map(([nome, split]) => (
                  <li key={nome} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <b className="block truncate text-[0.8125rem] font-medium">{nome}</b>
                      <span className="block truncate text-petroleo/75">{split}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-gelo px-2 py-0.5 font-medium">Pago</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* vitrine da afiliada no celular */}
        <div className="absolute -right-1 -bottom-10 w-[9.5rem] rotate-3 rounded-[1.6rem] border-[5px] border-petroleo bg-branco p-2.5 text-petroleo shadow-[0_24px_50px_-20px_rgba(0,0,0,0.8)] ring-1 ring-gelo/40 sm:right-4 sm:w-48 lg:-right-6">
          <div className="mx-auto h-1 w-10 rounded-full bg-petroleo/20" />
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ciano text-xs font-bold">A</span>
            <span className="text-xs font-bold">Vitrine da Ana</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {["#14D6C4", "#EEF6F5"].map((c) => (
              <div key={c} className="rounded-lg bg-gelo p-1.5">
                <div className="h-12 rounded-md sm:h-16" style={{ background: c }} />
                <div className="mt-1.5 h-1.5 w-4/5 rounded bg-petroleo/30" />
                <div className="mt-1 h-1.5 w-1/2 rounded bg-petroleo/20" />
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-full bg-petroleo py-1.5 text-center text-xs font-medium text-branco">Comprar</div>
        </div>
      </div>
    </figure>
  );
}

// ---------- visuais das seções alternadas ----------
const Cartao = ({ children, rotulo }: { children: ReactNode; rotulo: string }) => (
  <figure role="img" aria-label={rotulo} className="mx-auto w-full max-w-md">
    <div aria-hidden="true" className="rounded-3xl bg-branco p-5 text-petroleo shadow-[0_24px_60px_-28px_rgba(6,44,48,0.45)] ring-1 ring-petroleo/10 sm:p-6">
      <div className="mb-4 flex justify-end"><Exemplo /></div>
      {children}
    </div>
  </figure>
);

export function VisualLoja() {
  return (
    <Cartao rotulo="Exemplo: cadastro de produto com preço, estoque, comissão do afiliado e modelos de loja oficial.">
      <p className="text-lg font-bold">Novo produto</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {[["Nome", "Tênis Runner"], ["Preço", "R$ 250,00"], ["Estoque", "40 un."], ["Comissão", "Definida por você"]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-gelo p-3">
            <p className="text-xs text-petroleo/75">{k}</p>
            <p className="font-medium">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium">Modelos da loja oficial</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {["#062C30", "#14D6C4", "#EEF6F5", "#FFFFFF"].map((c, i) => (
          <div key={c} className={`h-14 rounded-lg ring-1 ring-petroleo/20 ${i === 1 ? "outline-2 outline-offset-2 outline-petroleo" : ""}`} style={{ background: c }} />
        ))}
      </div>
    </Cartao>
  );
}

export function VisualAfiliado({ host }: { host: string }) {
  return (
    <Cartao rotulo="Exemplo: link curto de afiliada, código de indicação e comissão do produto.">
      <p className="text-sm text-petroleo/75">Seu link para o Tênis Runner</p>
      <p className="mt-1 rounded-xl bg-gelo px-3 py-3 font-mono text-sm break-all">
        {host}/@ana/tenis-runner
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-gelo p-3">
          <p className="text-xs text-petroleo/75">Comissão</p>
          <p className="font-medium">Mostrada antes de divulgar</p>
        </div>
        <div className="rounded-xl bg-gelo p-3">
          <p className="text-xs text-petroleo/75">Código de indicação</p>
          <p className="font-medium">Seu, só seu</p>
        </div>
      </div>
      <div className="mt-4 rounded-full bg-ciano py-3 text-center text-sm font-medium">Copiar link</div>
    </Cartao>
  );
}

export function VisualVendedor() {
  return (
    <Cartao rotulo="Exemplo: convite de uma loja para um vendedor, com a comissão combinada e as vendas do vendedor.">
      <p className="text-sm text-petroleo/75">Convite da Lia Calçados</p>
      <p className="text-lg font-bold">Vender pela loja</p>
      <div className="mt-3 rounded-xl bg-gelo p-3 text-sm">
        <p className="text-xs text-petroleo/75">Comissão combinada</p>
        <p className="font-medium">Definida pela loja para você</p>
      </div>
      <ul className="mt-3 divide-y divide-petroleo/10 text-sm">
        {["Venda pelo seu link", "Venda pelo seu link"].map((t, i) => (
          <li key={i} className="flex items-center justify-between py-2.5">
            <span>{t}</span>
            <span className="rounded-full bg-gelo px-2 py-0.5 text-xs font-medium">Pago</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-full bg-petroleo py-3 text-center text-sm font-medium text-branco">Aceitar convite</div>
    </Cartao>
  );
}

export function VisualComprador() {
  return (
    <Cartao rotulo="Exemplo: pagamento na loja oficial com Pix ou cartão, CNPJ ativo, 7 dias para desistir e pagamento processado pela Lytex.">
      <p className="text-lg font-bold">Tênis Runner</p>
      <p className="text-sm text-petroleo/75">Lia Calçados, loja oficial</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-medium">
        <span className="rounded-xl bg-petroleo py-3 text-center text-branco">Pix</span>
        <span className="rounded-xl bg-gelo py-3 text-center">Cartão</span>
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {["Loja com CNPJ ativo e nota fiscal", "7 dias para desistir", "Pagamento processado pela Lytex"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="9" fill="#14D6C4" />
              <path d="M5 9.2l2.6 2.6L13 6.4" stroke="#062C30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t}
          </li>
        ))}
      </ul>
    </Cartao>
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
