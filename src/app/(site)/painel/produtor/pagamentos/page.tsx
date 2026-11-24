// Pagamentos da loja: política de parcelamento (até quantas vezes e quantas sem juros).
import Link from "next/link";
import { POLITICA_PADRAO, politicaDoBanco } from "@/lib/pagamentos/juros";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormParcelamento } from "./FormParcelamento";

export const metadata = { title: "Pagamentos da loja" };
export const instant = false;

export default async function Pagamentos() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: p } = await supabase.from("producers").select("parcelas_max, parcelas_sem_juros").eq("user_id", usuario.id).maybeSingle();
  const politica = p ? politicaDoBanco(p) : POLITICA_PADRAO;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Link href="/painel/produtor" className="inline-block w-fit py-2 text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="text-3xl">Pagamentos da loja</h1>
      <p className="text-petroleo/80">
        Você decide como a sua loja parcela no cartão: até quantas vezes e até quantas vezes sem juros para o comprador. Pix e boleto não têm parcelas. O
        comprador vê só o valor de cada parcela, se é &quot;sem juros&quot; ou &quot;com juros&quot;, e o total. Veja as{" "}
        <Link href="/taxas" className="font-medium underline">
          taxas para lojas
        </Link>
        .
      </p>
      {!p ? (
        <p className="rounded-2xl bg-branco p-4">Cadastre sua empresa primeiro.</p>
      ) : (
        <section className="rounded-2xl bg-branco p-6">
          <FormParcelamento inicial={{ max: politica.parcelasMax, semJuros: politica.parcelasSemJuros }} />
        </section>
      )}
    </div>
  );
}
