"use client";
// Formulário de compra: dados + entrega → resumo do pedido (regra 4) → confirmar.
// O CEP preenche o endereço pela BrasilAPI (grátis, sem chave). Se ela falhar,
// a pessoa digita à mão, nada trava.
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatarCnpj, formatarPreco } from "@/lib/produtor";
import { ROTULO_ENTREGA, type ModoEntrega } from "@/lib/pedidos";
import type { OpcaoParcela } from "@/lib/pagamentos/juros";
import { MEIOS, ROTULO_MEIO, type Meio } from "@/lib/pagamentos/parcelas";
import { comprar, type EstadoCompra } from "./acoes";

type Opcoes = {
  envio: boolean;
  retirada: boolean;
  digital: boolean;
  frete_fixo_centavos: number | null;
  frete_gratis_acima_centavos: number | null;
  frete_prazo_dias: number | null;
  frete_quem_paga?: "comprador" | "loja";
};

const campo =
  "w-full min-w-0 rounded-md border border-neutral-500 bg-white px-3 py-3 text-base text-neutral-900 focus:border-neutral-900 focus:ring-2 focus:ring-[var(--loja-principal)] focus:outline-none";
const rotulo = "flex min-w-0 flex-col gap-1 text-sm font-medium text-neutral-800";
const botao =
  "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--loja-principal)] px-6 py-3 text-base font-semibold text-[var(--loja-principal-texto)] hover:opacity-90 disabled:opacity-60";

function Enviar({ children, intencao }: { children: React.ReactNode; intencao: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intencao" value={intencao} disabled={pending} className={botao}>
      {pending ? "Aguarde..." : children}
    </button>
  );
}

// Qual campo o erro do servidor fala a respeito (para focar nele e marcar como inválido)
const CAMPOS_ERRO: [RegExp, string][] = [
  [/código/i, "codigo"],
  [/quantidade/i, "quantidade"],
  [/CEP/, "cep"],
  [/Endereço/, "logradouro"],
  [/e-mail/i, "email"],
  [/CPF/, "cpf"],
  [/nome/i, "nome"],
];
const campoDoErro = (erro?: string) => (erro ? (CAMPOS_ERRO.find(([re]) => re.test(erro))?.[1] ?? null) : null);
const ID_ERRO = "erro-compra";

// Mensagem de erro: o foco vai para o campo com problema (ou para a própria mensagem,
// se o erro não é de um campo); o leitor de tela anuncia o texto pelo role="alert".
function Mensagem({ texto, campo }: { texto?: string; campo?: string | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!texto) return;
    const el = campo ? document.querySelector<HTMLElement>(`form [name="${campo}"]`) : null;
    (el ?? ref.current)?.focus();
  }, [texto, campo]);
  if (!texto) return null;
  return (
    <p ref={ref} id={ID_ERRO} tabIndex={-1} role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none">
      {texto}
    </p>
  );
}

// Os 3 passos da compra (a ordem é real: dados, revisão, pagamento)
function Passos({ atual }: { atual: 0 | 1 }) {
  const passos = ["Dados e entrega", "Pagamento e revisão", "Pagar"];
  return (
    <nav aria-label="Etapas da compra">
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {passos.map((nome, i) => (
          <li key={nome} aria-current={i === atual ? "step" : undefined} className={`flex items-center gap-2 ${i === atual ? "font-semibold text-neutral-900" : "text-neutral-700"}`}>
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums ${
                i <= atual ? "bg-[var(--loja-principal)] text-[var(--loja-principal-texto)]" : "border border-neutral-500 bg-white"
              }`}
            >
              {i + 1}
            </span>
            {nome}
            {i < atual && <span className="sr-only"> (concluída)</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function FormCompra({
  item,
  loja,
  produto,
  opcoes,
  inicial,
  vitrine,
}: {
  item: string;
  loja: string;
  produto: string;
  opcoes: Opcoes;
  inicial: { nome: string; email: string };
  // para o resumo ao lado: nome, foto, preço e nome da loja
  vitrine: { nome: string; foto: string | null; precoCentavos: number; lojaNome: string };
}) {
  const [estado, acao] = useActionState<EstadoCompra, FormData>(comprar, undefined);
  const v = estado?.valores ?? {};
  const modos = (["envio", "retirada", "digital"] as ModoEntrega[]).filter((m) => opcoes[m]);
  const [modo, setModo] = useState<ModoEntrega>((v.entrega as ModoEntrega) || modos[0]);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  const [quantidade, setQuantidade] = useState(v.quantidade || "1");
  const [meioEscolhido, setMeioEscolhido] = useState<string>(v.meio ?? "");
  const [parcelasEscolhidas, setParcelasEscolhidas] = useState<string>(v.parcelas || "1");
  const tituloResumo = useRef<HTMLHeadingElement>(null);
  const campoErro = estado?.etapa === "dados" ? campoDoErro(estado.erro) : null;
  // marca o campo com erro e liga à mensagem
  const invalido = (nome: string, outroId?: string) => ({
    "aria-invalid": campoErro === nome ? (true as const) : undefined,
    "aria-describedby": [outroId, campoErro === nome ? ID_ERRO : ""].filter(Boolean).join(" ") || undefined,
  });

  // ao chegar no resumo, o foco vai para o título (leitor de tela e celular)
  useEffect(() => {
    if (estado?.etapa === "resumo") tituloResumo.current?.focus();
  }, [estado]);

  // moldura da página: etapas, resumo do pedido ao lado (embaixo do título no celular) e o formulário
  const moldura = (filho: React.ReactNode) => {
    const r = estado?.etapa === "resumo" ? estado.resumo : undefined;
    const q = r ? r.quantidade : Math.min(99, Math.max(1, Math.trunc(Number(quantidade)) || 1));
    const sub = r ? r.subtotal_centavos : vitrine.precoCentavos * q;
    const comFrete = r ? r.frete_centavos > 0 || modo === "envio" : modo === "envio" && opcoes.frete_fixo_centavos != null;
    const frete = r
      ? r.frete_centavos
      : opcoes.frete_gratis_acima_centavos != null && sub >= opcoes.frete_gratis_acima_centavos
        ? 0
        : (opcoes.frete_fixo_centavos ?? 0);
    return (
      <div className="flex flex-col gap-6">
        <Passos atual={r ? 1 : 0} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <aside
            aria-label="Seu pedido"
            className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-300 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1"
          >
            <div className="-mx-4 -mt-4 h-1.5 bg-[var(--loja-principal)]" aria-hidden="true" />
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {vitrine.foto && <Image src={vitrine.foto} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm leading-5 font-medium">{vitrine.nome}</p>
                <p className="text-sm text-neutral-700">
                  {q} × <span className="tabular-nums">{formatarPreco(vitrine.precoCentavos)}</span>
                </p>
              </div>
            </div>
            <dl className="flex flex-col gap-2 border-t border-neutral-200 pt-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatarPreco(sub)}</dd>
              </div>
              {comFrete && (
                <div className="flex justify-between gap-4">
                  <dt>Frete</dt>
                  <dd className="tabular-nums">{frete === 0 ? "Grátis" : formatarPreco(frete)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatarPreco(sub + (comFrete ? frete : 0))}</dd>
              </div>
            </dl>
            {!r && <p className="text-xs text-neutral-700">Você confere o resumo final antes de confirmar.</p>}
            <ul className="flex flex-col gap-1 border-t border-neutral-200 pt-3 text-xs leading-5 text-neutral-700">
              <li>
                <span className="font-medium text-neutral-900">Loja oficial {vitrine.lojaNome}</span>
              </li>
              <li className="flex items-center gap-1.5" data-selo-lytex>
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-none stroke-current" strokeWidth="1.5">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                </svg>
                Pagamento processado pela Lytex
              </li>
              <li>
                Arrependimento em 7 dias.{" "}
                <Link href="/reembolso" target="_blank" className="inline-flex min-h-11 items-center font-semibold text-neutral-900 underline">
                  Política de reembolso
                  <span className="sr-only"> (abre em nova aba)</span>
                </Link>
              </li>
            </ul>
          </aside>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">{filho}</div>
        </div>
      </div>
    );
  };

  const fixos = (
    <>
      <input type="hidden" name="item" value={item} />
      <input type="hidden" name="loja" value={loja} />
      <input type="hidden" name="produto" value={produto} />
      {/* campo-armadilha para robôs (pessoas não veem) */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Não preencha
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );

  if (estado?.etapa === "resumo" && estado.resumo) {
    const r = estado.resumo;
    const meiosDisponiveis: Meio[] = estado.meios?.length ? estado.meios : [...MEIOS];
    const meio = (meiosDisponiveis.includes(meioEscolhido as Meio) ? meioEscolhido : meiosDisponiveis[0]) as Meio;
    // parcelas e totais calculados no servidor (política da loja); o comprador vê só parcela, "sem/com juros" e total
    const opcoes: OpcaoParcela[] = estado.parcelas?.length ? estado.parcelas : [{ parcelas: 1, parcelaCentavos: r.total_centavos, totalCentavos: r.total_centavos, semJuros: true }];
    const parcelas = String(Math.min(Number(parcelasEscolhidas) || 1, opcoes.length));
    const opcaoEscolhida = opcoes[Number(parcelas) - 1];
    const totalPago = meio === "cartao" ? opcaoEscolhida.totalCentavos : r.total_centavos;
    return moldura(
      <form action={acao} className="flex flex-col gap-6">
        {fixos}
        {Object.entries(estado.valores).map(([k, valor]) =>
          ["item", "loja", "produto", "meio", "parcelas"].includes(k) ? null : <input key={k} type="hidden" name={k} value={valor} />,
        )}
        <fieldset className="flex flex-col gap-3" data-escolha-pagamento>
          <legend className="mb-2 text-xl font-semibold">Como você quer pagar</legend>
          <div className="flex flex-col gap-2">
            {meiosDisponiveis.map((m) => (
              <label
                key={m}
                className="flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-neutral-400 bg-white px-4 py-3 text-sm has-[:checked]:border-[var(--loja-link)] has-[:checked]:bg-[color-mix(in_srgb,var(--loja-principal)_7%,white)] has-[:checked]:shadow-[inset_0_0_0_1px_var(--loja-link)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-900"
              >
                <input type="radio" name="meio" value={m} checked={meio === m} onChange={() => setMeioEscolhido(m)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--loja-link)]" />
                <span className="min-w-0">
                  <span className="block text-base font-semibold">{ROTULO_MEIO[m]}</span>
                  <span className="block text-neutral-700">{DICA_MEIO[m](opcoes)}</span>
                </span>
              </label>
            ))}
          </div>
          {meio === "cartao" && (
            <label className={rotulo}>
              Parcelas
              <select name="parcelas" value={parcelas} onChange={(e) => setParcelasEscolhidas(e.target.value)} className={`${campo} min-h-12`} data-parcelas>
                {opcoes.map((o) => (
                  <option key={o.parcelas} value={o.parcelas}>
                    {o.parcelas === 1
                      ? `À vista, ${formatarPreco(o.totalCentavos)}`
                      : `${o.parcelas}x de ${formatarPreco(o.parcelaCentavos)} ${o.semJuros ? "sem juros" : "com juros"} (total ${formatarPreco(o.totalCentavos)})`}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-neutral-700">Você digita os dados do cartão na página segura da Lytex.</span>
            </label>
          )}
        </fieldset>

        <section aria-labelledby="titulo-resumo" className="flex flex-col gap-4">
          <h2 id="titulo-resumo" ref={tituloResumo} tabIndex={-1} className="text-xl font-semibold outline-none">
            Resumo do pedido
          </h2>
          <dl className="divide-y divide-neutral-200 rounded-md border border-neutral-300 text-sm">
            <Linha nome="Produto" valor={`${r.nome} × ${r.quantidade}`} />
            <Linha nome="Preço unitário" valor={formatarPreco(r.preco_unitario_centavos)} />
            <Linha nome="Subtotal" valor={formatarPreco(r.subtotal_centavos)} />
            <Linha nome="Frete" valor={r.frete_centavos === 0 ? "Grátis" : formatarPreco(r.frete_centavos)} />
            {totalPago > r.total_centavos && <Linha nome="Juros do parcelamento" valor={formatarPreco(totalPago - r.total_centavos)} />}
            <Linha nome="Total a pagar" valor={formatarPreco(totalPago)} forte />
          </dl>

          <dl className="grid gap-3 text-sm text-neutral-800">
            <Bloco titulo="Entrega">
              {ROTULO_ENTREGA[estado.valores.entrega as ModoEntrega]}
              {estado.valores.entrega === "envio" && (
                <>
                  <br />
                  {estado.valores.logradouro}, {estado.valores.numero}
                  {estado.valores.complemento ? `, ${estado.valores.complemento}` : ""}, {estado.valores.bairro} ·{" "}
                  {estado.valores.cidade}/{estado.valores.uf}, CEP {estado.valores.cep}
                </>
              )}
              {r.prazo_postagem_dias != null && r.tipo === "fisico" && (
                <>
                  <br />
                  Postagem em até {r.prazo_postagem_dias} dia(s) útil(eis) após o pagamento
                  {r.prazo_entrega_dias ? `; entrega estimada em mais ${r.prazo_entrega_dias} dia(s) útil(eis)` : ""}.
                </>
              )}
            </Bloco>
            <Bloco titulo="Quem compra">
              {estado.valores.nome}, {estado.valores.email}
            </Bloco>
            <Bloco titulo="Quem vende">
              {r.razao_social}, CNPJ {formatarCnpj(r.cnpj)}. A loja emite a nota fiscal.
            </Bloco>
            {estado.indicadoPor && (
              <Bloco titulo="Indicação">
                Indicado por @{estado.indicadoPor}
                {estado.indicadoPorCodigo ? " (código que você digitou)" : ""}. Quem indicou recebe uma comissão; o preço é o mesmo.
              </Bloco>
            )}
            <Bloco titulo="Pagamento">
              Processado pela Lytex, instituição de pagamento parceira. A Staypse não recebe nem guarda o seu dinheiro, e dados de
              cartão nunca passam por aqui.
            </Bloco>
            <Bloco titulo="Seu direito de desistir">
              Você pode desistir em até 7 dias depois de receber
              {r.tipo === "digital" ? " o acesso" : " o produto"} e recebe de volta tudo o que pagou, inclusive o frete
              (Código de Defesa do Consumidor, art. 49). É só usar o botão &quot;Desistir da compra&quot; na página do pedido. Veja a{" "}
              <Link href="/reembolso" target="_blank" className="font-semibold underline">
                política de reembolso
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>
              .
            </Bloco>
          </dl>

          <label className="flex gap-3 rounded-md border border-neutral-400 p-4 text-sm text-neutral-800">
            <input type="checkbox" name="aceite" value="sim" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--loja-principal)]" />
            <span>
              Li o resumo do pedido, tenho 18 anos ou mais (ou compro com autorização do meu responsável legal) e concordo com os{" "}
              <Link href="/termos" target="_blank" className="font-semibold underline">
                Termos de Uso
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>
              , a{" "}
              <Link href="/reembolso" target="_blank" className="font-semibold underline">
                Política de Reembolso
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="font-semibold underline">
                Política de Privacidade
                <span className="sr-only"> (abre em nova aba)</span>
              </Link>
              .
            </span>
          </label>
          <Mensagem texto={estado.erro} />
          <Enviar intencao="confirmar">{rotuloConfirmar(meio, r.total_centavos, opcaoEscolhida)}</Enviar>
          <button
            type="submit"
            name="intencao"
            value="editar"
            formNoValidate
            className="min-h-11 text-sm font-semibold text-[var(--loja-link)] underline"
          >
            Voltar e corrigir os dados
          </button>
        </section>
      </form>,
    );
  }

  async function buscarCep(cep: string, form: HTMLFormElement | null) {
    const numeros = cep.replace(/\D/g, "");
    if (numeros.length !== 8 || !form) return;
    setBuscandoCep(true);
    setAvisoCep("");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v1/${numeros}`);
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { street?: string; neighborhood?: string; city?: string; state?: string };
      const definir = (nome: string, valor?: string) => {
        const el = form.elements.namedItem(nome) as HTMLInputElement | null;
        if (el && valor && !el.value) el.value = valor;
      };
      definir("logradouro", d.street);
      definir("bairro", d.neighborhood);
      definir("cidade", d.city);
      definir("uf", d.state);
      setAvisoCep("Endereço preenchido pelo CEP. Confira e informe o número.");
      (form.elements.namedItem("numero") as HTMLInputElement | null)?.focus();
    } catch {
      setAvisoCep("Não achamos esse CEP agora. Preencha o endereço à mão.");
    } finally {
      setBuscandoCep(false);
    }
  }

  return moldura(
    <form action={acao} className="flex flex-col gap-6">
      {fixos}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">Quantidade e entrega</legend>
        <label className={rotulo}>
          Quantidade
          <input
            name="quantidade"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            required
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className={`${campo} w-28`}
            {...invalido("quantidade")}
          />
        </label>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Forma de entrega">
          {modos.map((m) => (
            <label
              key={m}
              className="flex cursor-pointer gap-3 rounded-md border border-neutral-400 px-4 py-3 text-sm has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-900"
            >
              <input type="radio" name="entrega" value={m} checked={modo === m} onChange={() => setModo(m)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--loja-principal)]" />
              <span>
                <span className="block font-medium">{ROTULO_ENTREGA[m]}</span>
                {m === "envio" && opcoes.frete_fixo_centavos != null && (
                  <span className="block text-neutral-700">
                    Frete {opcoes.frete_fixo_centavos === 0 ? "grátis" : formatarPreco(opcoes.frete_fixo_centavos)}
                    {opcoes.frete_quem_paga === "loja" ? ", a loja paga o envio" : ""}
                    {opcoes.frete_gratis_acima_centavos ? `, grátis acima de ${formatarPreco(opcoes.frete_gratis_acima_centavos)}` : ""}
                    {opcoes.frete_prazo_dias ? `, chega em até ${opcoes.frete_prazo_dias} dia(s) útil(eis) após a postagem` : ""}
                  </span>
                )}
                {m === "retirada" && <span className="block text-neutral-700">Sem frete. A loja combina o local e o horário com você.</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {modo === "envio" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-lg font-semibold">Endereço de entrega</legend>
          <label className={rotulo}>
            CEP
            <input
              name="cep"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              maxLength={9}
              placeholder="00000-000"
              defaultValue={v.cep}
              onBlur={(e) => buscarCep(e.currentTarget.value, e.currentTarget.form)}
              className={`${campo} max-w-48`}
              {...invalido("cep", "aviso-cep")}
            />
          </label>
          <p id="aviso-cep" role="status" className="text-sm text-neutral-700">
            {buscandoCep ? "Buscando endereço..." : avisoCep}
          </p>
          <p className="text-xs text-neutral-700">
            Ao sair do campo CEP, o número é enviado ao serviço gratuito BrasilAPI para preencher o endereço. Se preferir, preencha à mão.
          </p>
          <label className={rotulo}>
            Rua
            <input name="logradouro" autoComplete="address-line1" required maxLength={200} defaultValue={v.logradouro} className={campo} {...invalido("logradouro")} />
          </label>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <label className={rotulo}>
              Número
              <input name="numero" required maxLength={20} defaultValue={v.numero} className={campo} />
            </label>
            <label className={rotulo}>
              Complemento (opcional)
              <input name="complemento" autoComplete="address-line2" maxLength={100} defaultValue={v.complemento} className={campo} />
            </label>
          </div>
          <label className={rotulo}>
            Bairro
            <input name="bairro" autoComplete="address-level3" required maxLength={100} defaultValue={v.bairro} className={campo} />
          </label>
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <label className={rotulo}>
              Cidade
              <input name="cidade" autoComplete="address-level2" required maxLength={120} defaultValue={v.cidade} className={campo} />
            </label>
            <label className={rotulo}>
              UF
              <input name="uf" autoComplete="address-level1" required maxLength={2} defaultValue={v.uf} className={`${campo} uppercase`} />
            </label>
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">Seus dados</legend>
        <label className={rotulo}>
          Nome completo
          <input name="nome" autoComplete="name" required minLength={2} maxLength={120} defaultValue={v.nome ?? inicial.nome} className={campo} {...invalido("nome")} />
        </label>
        <label className={rotulo}>
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={v.email ?? inicial.email} className={campo} {...invalido("email", "dica-email")} />
          <span id="dica-email" className="text-xs font-normal text-neutral-700">
            Para acompanhar o pedido e receber o acesso.
          </span>
        </label>
        <label className={rotulo}>
          CPF
          <input name="cpf" inputMode="numeric" required maxLength={14} placeholder="000.000.000-00" defaultValue={v.cpf} className={campo} {...invalido("cpf", "dica-cpf")} />
          <span id="dica-cpf" className="text-xs font-normal text-neutral-700">
            Usado só para a nota fiscal da loja e para o pagamento.
          </span>
        </label>
        <label className={rotulo}>
          Celular com DDD (opcional)
          <input name="telefone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} defaultValue={v.telefone} className={campo} />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">Indicação (opcional)</legend>
        <label className={rotulo}>
          Código de quem indicou (opcional)
          <input
            name="codigo"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={41}
            placeholder="@nome"
            defaultValue={v.codigo}
            className={`${campo} max-w-64`}
            {...invalido("codigo", "dica-codigo")}
          />
          <span id="dica-codigo" className="text-xs font-normal text-neutral-700">
            Se alguém indicou este produto, digite o @ dela(e). Útil se você abriu o link em outro aparelho. Não é cupom: o preço é o
            mesmo. Se você veio por um link de indicação, não precisa digitar. Se digitar um código, ele vale no lugar do link.
          </span>
        </label>
      </fieldset>

      <Mensagem texto={estado?.erro} campo={campoErro} />
      <Enviar intencao="revisar">Revisar pedido</Enviar>
      <p className="text-xs text-neutral-700">
        Você vê o resumo completo, com frete e total, antes de confirmar. Usamos seus dados só para este pedido, conforme a{" "}
        <Link href="/privacidade" target="_blank" className="font-semibold underline">
          Política de Privacidade
          <span className="sr-only"> (abre em nova aba)</span>
        </Link>
        .
      </p>
    </form>,
  );
}

function Linha({ nome, valor, forte = false }: { nome: string; valor: string; forte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 px-4 py-3 ${forte ? "text-base font-semibold" : ""}`}>
      <dt>{nome}</dt>
      <dd className="text-right">{valor}</dd>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold">{titulo}</dt>
      <dd className="mt-0.5 leading-relaxed">{children}</dd>
    </div>
  );
}

const DICA_MEIO: Record<Meio, (opcoes: OpcaoParcela[]) => string> = {
  pix: () => "Aprovação na hora, com QR Code ou copia e cola",
  boleto: () => "Compensa em até 2 dias úteis",
  cartao: (opcoes) => {
    const semJuros = opcoes.filter((o) => o.semJuros).length;
    if (opcoes.length === 1) return "À vista";
    return semJuros > 1 ? `Em até ${opcoes.length}x, sendo até ${semJuros}x sem juros` : `Em até ${opcoes.length}x com juros`;
  },
};

function rotuloConfirmar(meio: Meio, total: number, opcao: OpcaoParcela) {
  if (meio === "pix") return `Gerar Pix de ${formatarPreco(total)}`;
  if (meio === "boleto") return `Gerar boleto de ${formatarPreco(total)}`;
  return opcao.parcelas > 1
    ? `Pagar em ${opcao.parcelas}x de ${formatarPreco(opcao.parcelaCentavos)}`
    : `Pagar ${formatarPreco(opcao.totalCentavos)} no cartão`;
}
