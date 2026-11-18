"use server";
// "Completar cadastro de recebimento": cria o recebedor no provedor (Lytex ou
// simulador) e leva a pessoa para o onboarding. A Staypse não pede documentos
// nem dados bancários: só confere que o CPF/CNPJ é o mesmo do cadastro.
import { redirect } from "next/navigation";
import { iniciarRecebedor } from "@/lib/pagamentos/recebedores";
import { IntegracaoPendente, type PapelRecebedor } from "@/lib/pagamentos/tipos";
import { exigirPapel } from "@/lib/papeis";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const VOLTA: Record<PapelRecebedor, string> = {
  produtor: "/painel/loja/recebimentos",
  afiliado: "/painel/afiliado/recebimentos",
  vendedor: "/painel/vendedor",
};
const PAPEL_EXIGIDO = { produtor: "produtor", afiliado: "revendedor", vendedor: "vendedor_proprio" } as const;

export async function completarRecebimento(f: FormData) {
  const papel = String(f.get("papel") ?? "") as PapelRecebedor;
  if (!Object.hasOwn(VOLTA, papel)) redirect("/painel");
  const usuario = await exigirPapel(PAPEL_EXIGIDO[papel]);
  const volta = VOLTA[papel];
  const erro = (msg: string): never => redirect(`${volta}?${new URLSearchParams({ erro: msg }).toString()}`);

  const supabase = await criarClienteServidor();
  let documento = String(f.get("documento") ?? "").replace(/\W/g, "").toUpperCase();
  if (papel === "produtor") {
    const { data: p } = await supabase.from("producers").select("cnpj").eq("user_id", usuario.id).maybeSingle();
    if (!p) erro("Cadastre a empresa antes do recebimento.");
    documento = p!.cnpj;
  } else if (documento.length !== 11 && documento.length !== 14) {
    erro("Informe o CPF ou o CNPJ de quem vai receber (o mesmo que será usado na Lytex).");
  }

  let url: string | null | undefined;
  try {
    const r = await iniciarRecebedor({ userId: usuario.id, papel, documento, nome: usuario.nome, email: usuario.email });
    url = r.urlOnboarding;
  } catch (e) {
    if (e instanceof IntegracaoPendente) erro("O cadastro de recebimento abre quando a integração com a Lytex for concluída.");
    const m = e instanceof Error ? e.message : "";
    erro(m === "documento_diferente_do_cadastro" ? "O CNPJ precisa ser o mesmo do cadastro da empresa." : "Não foi possível iniciar agora. Tente de novo.");
  }
  if (url) redirect(url.startsWith("/") ? `${url}?volta=${encodeURIComponent(volta)}` : url);
  redirect(`${volta}?msg=${encodeURIComponent("Cadastro de recebimento iniciado. Acompanhe a análise da Lytex aqui.")}`);
}
