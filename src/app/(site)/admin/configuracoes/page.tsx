// Admin: configurações da plataforma. Valores guardados na tabela configuracoes;
// cada mudança grava o antes e o depois no log de auditoria.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { dataHora } from "@/lib/pedidos";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { MODALIDADES, type Modalidade } from "@/lib/pagamentos/taxas";
import { FormConfiguracoes, type ValoresIniciais } from "./FormConfiguracoes";

export const metadata = { title: "Configurações" };
export const instant = false;

export default async function AdminConfiguracoes() {
  await exigirPapel("admin");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("configuracoes").select("chave, valor, atualizado_em");
  if (error) throw new Error(`Configurações indisponíveis: ${error.message}`);
  const v = new Map((data ?? []).map((c) => [c.chave, c.valor as unknown]));
  const meios = (v.get("meios_pagamento") ?? {}) as { pix?: boolean; cartao?: boolean; boleto?: boolean };
  const palavras = (v.get("palavras_proibidas") ?? []) as string[];
  const ultima = (data ?? []).map((c) => c.atualizado_em as string).sort().at(-1);

  const reais = (c: unknown) => (Number((c as { fixo_centavos?: number } | undefined)?.fixo_centavos ?? 0) / 100).toFixed(2).replace(".", ",");
  const pct = (c: unknown) => String((c as { percentual?: number } | undefined)?.percentual ?? "").replace(".", ",");
  const lerTaxas = (prefixo: string) =>
    Object.fromEntries(MODALIDADES.map((m) => [m, { pct: pct(v.get(`${prefixo}_${m}`)), fixo: reais(v.get(`${prefixo}_${m}`)) }])) as Record<Modalidade, { pct: string; fixo: string }>;
  const sp = (v.get("custo_lytex_split") ?? {}) as { percentual?: number; minimo_centavos?: number; maximo_centavos?: number };
  const taxas: ValoresIniciais["taxas"] = {
    taxaTotal: lerTaxas("taxa_total"),
    custoLytex: lerTaxas("custo_lytex"),
    split: { pct: pct(sp), min: reais({ fixo_centavos: sp.minimo_centavos }), max: reais({ fixo_centavos: sp.maximo_centavos }) },
  };

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <h1 className="text-3xl">Configurações</h1>
      <p className="text-sm text-petroleo/80">
        Regras da plataforma. Última alteração: {ultima ? dataHora(ultima) : "nunca"}.{" "}
        <Link href="/admin/auditoria?entidade=configuracao" className="inline-flex min-h-11 items-center underline">
          Ver o histórico
        </Link>
      </p>
      <FormConfiguracoes
        inicial={{
          taxas,
          comissaoMin: String(v.get("comissao_min_percentual") ?? ""),
          comissaoMax: String(v.get("comissao_max_percentual") ?? ""),
          prazoNf: String(v.get("prazo_nf_dias") ?? ""),
          palavras: [...palavras].sort().join("\n"),
          pix: Boolean(meios.pix),
          cartao: Boolean(meios.cartao),
          boleto: Boolean(meios.boleto),
        }}
      />
    </div>
  );
}
