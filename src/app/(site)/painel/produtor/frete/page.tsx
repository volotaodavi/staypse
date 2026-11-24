// Frete da loja (sem serviço externo): valor fixo por pedido, grátis acima de
// um valor e prazo de entrega. Retirada no local é marcada em cada produto.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormFrete } from "./FormFrete";

export const metadata = { title: "Frete da loja" };
export const instant = false;

const reais = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export default async function Frete() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data: p } = await supabase
    .from("producers")
    .select("frete_fixo_centavos, frete_gratis_acima_centavos, frete_prazo_dias, frete_quem_paga")
    .eq("user_id", usuario.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Link href="/painel/produtor" className="inline-block w-fit py-2 text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="text-3xl">Frete da loja</h1>
      <p className="text-petroleo/80">
        Você decide quem paga o frete: a loja (o comprador vê &quot;Frete grátis&quot;) ou o comprador (valor fixo por pedido, com a opção de frete grátis acima de um valor). O comprador vê o frete e o total no resumo,
        antes de pagar. A retirada no local é marcada em cada produto.
      </p>
      <Link href="/painel/produtor/frete/entrega-propria" className="inline-flex min-h-11 w-fit items-center rounded-full border border-petroleo px-5 text-sm font-medium">
        Entrega própria (motoboy ou motorista)
      </Link>
      {!p ? (
        <p className="rounded-2xl bg-branco p-4">Cadastre sua empresa primeiro.</p>
      ) : (
        <section className="rounded-2xl bg-branco p-6">
          <FormFrete
            inicial={{
              envia: p.frete_fixo_centavos != null ? "sim" : "nao",
              quem: p.frete_quem_paga === "loja" ? "loja" : "comprador",
              fixo: reais(p.frete_fixo_centavos),
              gratis: reais(p.frete_gratis_acima_centavos),
              prazo: p.frete_prazo_dias ? String(p.frete_prazo_dias) : "",
            }}
          />
        </section>
      )}
    </div>
  );
}
