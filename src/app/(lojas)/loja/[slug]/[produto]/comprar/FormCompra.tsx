"use client";
// Formulário de compra: dados + entrega → resumo do pedido (regra 4) → confirmar.
// O CEP preenche o endereço pela BrasilAPI (grátis, sem chave). Se ela falhar,
// a pessoa digita à mão — nada trava.
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatarCnpj, formatarPreco } from "@/lib/produtor";
import { ROTULO_ENTREGA, type ModoEntrega } from "@/lib/pedidos";
import { comprar, type EstadoCompra } from "./acoes";

type Opcoes = {
  envio: boolean;
  retirada: boolean;
  digital: boolean;
  frete_fixo_centavos: number | null;
  frete_gratis_acima_centavos: number | null;
  frete_prazo_dias: number | null;
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

function Mensagem({ texto }: { texto?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (texto) ref.current?.focus();
  }, [texto]);
  if (!texto) return null;
  return (
    <p ref={ref} tabIndex={-1} role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
      {texto}
    </p>
  );
}

export function FormCompra({
  item,
  loja,
  produto,
  opcoes,
  inicial,
}: {
  item: string;
  loja: string;
  produto: string;
  opcoes: Opcoes;
  inicial: { nome: string; email: string };
}) {
  const [estado, acao] = useActionState<EstadoCompra, FormData>(comprar, undefined);
  const v = estado?.valores ?? {};
  const modos = (["envio", "retirada", "digital"] as ModoEntrega[]).filter((m) => opcoes[m]);
  const [modo, setModo] = useState<ModoEntrega>((v.entrega as ModoEntrega) || modos[0]);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  const tituloResumo = useRef<HTMLHeadingElement>(null);

  // ao chegar no resumo, o foco vai para o título (leitor de tela e celular)
  useEffect(() => {
    if (estado?.etapa === "resumo") tituloResumo.current?.focus();
  }, [estado]);

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
    return (
      <form action={acao} className="flex flex-col gap-6">
        {fixos}
        {Object.entries(estado.valores).map(([k, valor]) =>
          ["item", "loja", "produto"].includes(k) ? null : <input key={k} type="hidden" name={k} value={valor} />,
        )}
        <section aria-labelledby="titulo-resumo" className="flex flex-col gap-4">
          <h2 id="titulo-resumo" ref={tituloResumo} tabIndex={-1} className="text-xl font-semibold outline-none">
            Resumo do pedido
          </h2>
          <dl className="divide-y divide-neutral-200 rounded-md border border-neutral-300 text-sm">
            <Linha nome="Produto" valor={`${r.nome} × ${r.quantidade}`} />
            <Linha nome="Preço unitário" valor={formatarPreco(r.preco_unitario_centavos)} />
            <Linha nome="Subtotal" valor={formatarPreco(r.subtotal_centavos)} />
            <Linha nome="Frete" valor={r.frete_centavos === 0 ? "Grátis" : formatarPreco(r.frete_centavos)} />
            <Linha nome="Total a pagar" valor={formatarPreco(r.total_centavos)} forte />
          </dl>

          <dl className="grid gap-3 text-sm text-neutral-800">
            <Bloco titulo="Entrega">
              {ROTULO_ENTREGA[estado.valores.entrega as ModoEntrega]}
              {estado.valores.entrega === "envio" && (
                <>
                  <br />
                  {estado.valores.logradouro}, {estado.valores.numero}
                  {estado.valores.complemento ? ` — ${estado.valores.complemento}` : ""} · {estado.valores.bairro} ·{" "}
                  {estado.valores.cidade}/{estado.valores.uf} · CEP {estado.valores.cep}
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
              {estado.valores.nome} · {estado.valores.email}
            </Bloco>
            <Bloco titulo="Quem vende">
              {r.razao_social} · CNPJ {formatarCnpj(r.cnpj)}. A loja emite a nota fiscal.
            </Bloco>
            {estado.indicadoPor && (
              <Bloco titulo="Indicação">
                Indicado por @{estado.indicadoPor}. Quem indicou recebe uma comissão; o preço é o mesmo.
              </Bloco>
            )}
            <Bloco titulo="Pagamento">
              Processado pela instituição de pagamento parceira, que divide o valor automaticamente entre a loja, quem
              indicou e a Staypse. A Staypse não recebe nem guarda o dinheiro.
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
          <Enviar intencao="confirmar">Confirmar pedido · {formatarPreco(r.total_centavos)}</Enviar>
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
      </form>
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

  return (
    <form action={acao} className="flex flex-col gap-6">
      {fixos}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">1. Quantidade e entrega</legend>
        <label className={rotulo}>
          Quantidade
          <input name="quantidade" type="number" inputMode="numeric" min={1} max={99} required defaultValue={v.quantidade || "1"} className={`${campo} w-28`} />
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
                    {opcoes.frete_gratis_acima_centavos ? ` · grátis acima de ${formatarPreco(opcoes.frete_gratis_acima_centavos)}` : ""}
                    {opcoes.frete_prazo_dias ? ` · chega em até ${opcoes.frete_prazo_dias} dia(s) útil(eis) após a postagem` : ""}
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
          <legend className="mb-2 text-lg font-semibold">2. Endereço de entrega</legend>
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
              aria-describedby="aviso-cep"
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
            <input name="logradouro" autoComplete="address-line1" required maxLength={200} defaultValue={v.logradouro} className={campo} />
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
        <legend className="mb-2 text-lg font-semibold">{modo === "envio" ? "3" : "2"}. Seus dados</legend>
        <label className={rotulo}>
          Nome completo
          <input name="nome" autoComplete="name" required minLength={2} maxLength={120} defaultValue={v.nome ?? inicial.nome} className={campo} />
        </label>
        <label className={rotulo}>
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={v.email ?? inicial.email} className={campo} aria-describedby="dica-email" />
          <span id="dica-email" className="text-xs font-normal text-neutral-700">
            Para acompanhar o pedido e receber o acesso.
          </span>
        </label>
        <label className={rotulo}>
          CPF
          <input name="cpf" inputMode="numeric" required maxLength={14} placeholder="000.000.000-00" defaultValue={v.cpf} className={campo} aria-describedby="dica-cpf" />
          <span id="dica-cpf" className="text-xs font-normal text-neutral-700">
            Usado só para a nota fiscal da loja e para o pagamento.
          </span>
        </label>
        <label className={rotulo}>
          Celular com DDD (opcional)
          <input name="telefone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} defaultValue={v.telefone} className={campo} />
        </label>
      </fieldset>

      <Mensagem texto={estado?.erro} />
      <Enviar intencao="revisar">Revisar pedido</Enviar>
      <p className="text-xs text-neutral-700">
        Você vê o resumo completo, com frete e total, antes de confirmar. Usamos seus dados só para este pedido, conforme a{" "}
        <Link href="/privacidade" target="_blank" className="font-semibold underline">
          Política de Privacidade
          <span className="sr-only"> (abre em nova aba)</span>
        </Link>
        .
      </p>
    </form>
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
