// Aviso prévio das taxas no painel da loja: "Novas taxas a partir de DATA" (link para /taxas).
// A data vem de configuracoes.taxas_vigencia_em (via aviso_taxas_loja); o aviso some 7 dias depois da vigência.
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export async function AvisoTaxas() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("aviso_taxas_loja").maybeSingle<{ vigencia_em: string; em_vigor: boolean }>();
  if (!data) return null;
  const dia = new Date(data.vigencia_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-aviso-taxas role="note">
      {data.em_vigor ? `Novas taxas em vigor desde ${dia}.` : `Novas taxas a partir de ${dia}. Até lá valem as taxas atuais.`}{" "}
      <Link href="/taxas" className="font-medium underline">
        Ver as taxas
      </Link>
    </p>
  );
}
