"use client";
// Formulário do cadastro de recebimento: documento (afiliado/vendedor), celular, endereço (CEP
// preenche pela BrasilAPI, como no checkout) e tipo de empresa quando o documento é CNPJ.
// Esses dados só vão para a Lytex; a Staypse não os guarda.
import { useRef, useState } from "react";
import { completarRecebimento } from "@/app/(site)/painel/recebimento/acoes";
import { TIPOS_EMPRESA } from "@/lib/pagamentos/dados-recebedor";

export type Sugestao = Partial<Record<"documento" | "razaoSocial" | "celular" | "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf", string>>;

const campo = "min-h-11 rounded-xl border border-petroleo/60 bg-branco px-3 text-base font-normal";

export function FormRecebimento({ papel, pedeDocumento, sugestao, rotuloBotao, cnpjFixo }: { papel: string; pedeDocumento: boolean; sugestao: Sugestao; rotuloBotao: string; cnpjFixo?: string }) {
  const [doc, setDoc] = useState(sugestao.documento ?? "");
  const [aviso, setAviso] = useState("");
  const cnpj = doc.replace(/\W/g, "").length === 14 || !pedeDocumento;
  const ultimoCnpj = useRef("");

  const preencher = (form: HTMLFormElement, campos: Record<string, string | undefined>) => {
    for (const [nome, v] of Object.entries(campos)) {
      const el = form.elements.namedItem(nome) as HTMLInputElement | HTMLSelectElement | null;
      if (el && v && !el.value) el.value = v;
    }
  };

  // CNPJ completo: dados públicos da Receita (BrasilAPI, pela rota do servidor). Falhou? Segue manual.
  async function buscarCnpj(valor: string, form: HTMLFormElement | null) {
    const n = valor.replace(/\D/g, "");
    if (n.length !== 14 || !form || n === ultimoCnpj.current) return;
    ultimoCnpj.current = n;
    try {
      const r = await fetch(`/api/cnpj/${n}`);
      if (r.status !== 200) return;
      const d = (await r.json()) as Record<string, string>;
      preencher(form, d);
      setAviso("Dados da empresa preenchidos pela Receita (via BrasilAPI). Confira e corrija se precisar.");
    } catch {
      /* silencioso */
    }
  }

  async function buscarCep(cep: string, form: HTMLFormElement | null) {
    const n = cep.replace(/\D/g, "");
    if (n.length !== 8 || !form) return;
    setAviso("Buscando endereço...");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v1/${n}`);
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { street?: string; neighborhood?: string; city?: string; state?: string };
      const definir = (nome: string, v?: string) => {
        const el = form.elements.namedItem(nome) as HTMLInputElement | null;
        if (el && v && !el.value) el.value = v;
      };
      definir("logradouro", d.street);
      definir("bairro", d.neighborhood);
      definir("cidade", d.city);
      definir("uf", d.state);
      setAviso("Endereço preenchido pelo CEP. Confira e informe o número.");
    } catch {
      setAviso("Não achamos esse CEP agora. Preencha o endereço à mão.");
    }
  }

  const input = (nome: string, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 font-medium">
      {rotulo}
      <input name={nome} defaultValue={sugestao[nome as keyof Sugestao] ?? ""} className={campo} {...extra} />
    </label>
  );

  return (
    <form action={completarRecebimento} className="flex flex-col gap-3 text-sm" data-form-recebimento>
      <input type="hidden" name="papel" value={papel} />
      {pedeDocumento && (
        <label className="flex flex-col gap-1 font-medium">
          CPF ou CNPJ de quem recebe
          <input name="documento" inputMode="numeric" required maxLength={18} value={doc} className={campo}
            onChange={(e) => { setDoc(e.target.value); void buscarCnpj(e.target.value, e.currentTarget.form); }} />
        </label>
      )}
      {cnpj && (
        <div ref={(el) => { if (el && cnpjFixo) void buscarCnpj(cnpjFixo, el.closest("form")); }} className="flex flex-col gap-3">
          {input("razaoSocial", "Razão social", { required: true, maxLength: 200, defaultValue: sugestao.razaoSocial ?? "" })}
          {input("nomeFantasia", "Nome fantasia", { maxLength: 200 })}
        </div>
      )}
      {input("celular", "Celular com DDD", { inputMode: "tel", required: true, maxLength: 16, autoComplete: "tel" })}
      <label className="flex flex-col gap-1 font-medium">
        CEP
        <input name="cep" defaultValue={sugestao.cep ?? ""} inputMode="numeric" required maxLength={9} autoComplete="postal-code" className={campo}
          onChange={(e) => buscarCep(e.currentTarget.value, e.currentTarget.form)} />
      </label>
      <p role="status" className="text-xs text-petroleo/75">{aviso || "Ao sair do CEP, o número vai ao serviço gratuito BrasilAPI para preencher o endereço. Se preferir, preencha à mão."}</p>
      {input("logradouro", "Rua", { required: true, maxLength: 200, autoComplete: "address-line1" })}
      <div className="grid grid-cols-2 gap-2">
        {input("numero", "Número", { required: true, maxLength: 20 })}
        {input("complemento", "Complemento (opcional)", { maxLength: 100 })}
      </div>
      {input("bairro", "Bairro", { required: true, maxLength: 100 })}
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        {input("cidade", "Cidade", { required: true, maxLength: 120 })}
        {input("uf", "UF", { required: true, maxLength: 2, autoComplete: "address-level1" })}
      </div>
      {cnpj && (
        <label className="flex flex-col gap-1 font-medium">
          Tipo de empresa
          <select name="tipoEmpresa" required defaultValue="" className={campo}>
            <option value="" disabled>Escolha</option>
            {Object.entries(TIPOS_EMPRESA).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </label>
      )}
      <button className="inline-flex min-h-11 w-fit items-center rounded-full bg-petroleo px-5 font-medium text-branco">{rotuloBotao}</button>
    </form>
  );
}
