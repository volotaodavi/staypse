// Editar item. Mostra o motivo se o item foi recusado.
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_ITEM } from "@/lib/produtor";
import { supabaseUrl } from "@/lib/supabase/env";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormItem, type ItemInicial } from "../FormItem";

export const metadata = { title: "Editar item" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

export default async function EditarItem({ params }: PageProps<"/painel/produtor/itens/[id]">) {
  const usuario = await exigirPapel("produtor");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await criarClienteServidor();
  // itens_privados(): só devolve itens da própria loja (inclui o conteúdo digital)
  const { data: item } = await supabase
    .rpc("itens_privados")
    .select(
      "id, slug, nome, descricao, fotos, preco_centavos, comissao_percentual, aprovacao_afiliacao, categoria, tipo, estoque, peso_gramas, altura_cm, largura_cm, comprimento_cm, prazo_postagem_dias, retirada_local, tipo_digital, arquivo_path, link_acesso, instrucoes_pos_compra, declaracao_nf, status_aprovacao, motivo_rejeicao, producers!inner(user_id)",
    )
    .eq("id", id)
    .eq("producers.user_id", usuario.id)
    .maybeSingle<ItemInicial & { motivo_rejeicao: string | null }>();
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-md">
      <Link href="/painel/produtor" className="text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="mt-2 text-3xl">Editar item</h1>
      <p className="mt-1 mb-5 text-sm text-petroleo/75">Situação: {STATUS_ITEM[item.status_aprovacao]}</p>
      {item.status_aprovacao === "recusado" && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong className="font-medium">Item recusado:</strong> {item.motivo_rejeicao}
        </p>
      )}
      <section className="rounded-3xl bg-branco p-5 sm:p-6">
        <FormItem item={item} uid={usuario.id} supabaseUrl={supabaseUrl()} />
      </section>
    </div>
  );
}
