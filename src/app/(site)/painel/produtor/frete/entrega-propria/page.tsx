// Entrega própria da loja: zonas (por CEP, cidade ou bairros) e entregadores.
import Link from "next/link";
import { exigirPapel } from "@/lib/papeis";
import { formatarPreco } from "@/lib/produtor";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { alternarZona, removerEntregador, removerZona } from "./acoes";
import { FormEntregador } from "./FormEntregador";
import { FormZona, type ZonaForm } from "./FormZona";

export const metadata = { title: "Entrega própria" };
export const instant = false;

type Zona = {
  id: string; nome: string; ativo: boolean; cobertura: string; cep_inicio: string | null; cep_fim: string | null;
  cidade: string | null; uf: string | null; bairros: string[] | null; preco_tipo: string; preco_fixo_centavos: number | null;
  gratis_acima_centavos: number | null; preco_km_centavos: number | null; taxa_minima_centavos: number | null;
  km_max: number | null; fator_rota: number; prazo_tipo: string; prazo_valor: number | null; hora_limite: string | null;
  dias_semana: number[]; horario_inicio: string; horario_fim: string;
};

const reais = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
const hhmm = (t: string | null) => (t ?? "").slice(0, 5);
const botao = "inline-flex min-h-11 items-center justify-center rounded-full border border-petroleo px-4 text-sm font-medium";

function aFormulario(z?: Zona): ZonaForm {
  return {
    id: z?.id ?? "", nome: z?.nome ?? "", cobertura: z?.cobertura ?? "cidade", cep_inicio: z?.cep_inicio ?? "", cep_fim: z?.cep_fim ?? "",
    cidade: z?.cidade ?? "", uf: z?.uf ?? "", bairros: z?.bairros?.join("\n") ?? "", preco_tipo: z?.preco_tipo ?? "fixo",
    preco_fixo: reais(z?.preco_fixo_centavos ?? null), gratis_acima: reais(z?.gratis_acima_centavos ?? null),
    preco_km: reais(z?.preco_km_centavos ?? null), taxa_minima: reais(z?.taxa_minima_centavos ?? null),
    km_max: z?.km_max != null ? String(z.km_max).replace(".", ",") : "", fator_rota: z ? String(z.fator_rota).replace(".", ",") : "1,3",
    prazo_tipo: z?.prazo_tipo ?? "mesmo_dia", prazo_valor: z?.prazo_valor ? String(z.prazo_valor) : "", hora_limite: hhmm(z?.hora_limite ?? null),
    dias: (z?.dias_semana ?? [1, 2, 3, 4, 5, 6]).join(","), horario_inicio: hhmm(z?.horario_inicio ?? "09:00"),
    horario_fim: hhmm(z?.horario_fim ?? "18:00"), ativo: z && !z.ativo ? "nao" : "sim",
  };
}

function resumoPreco(z: Zona) {
  if (z.preco_tipo === "km") {
    return `Por km: ${formatarPreco(z.preco_km_centavos ?? 0)}/km, mínimo ${formatarPreco(z.taxa_minima_centavos ?? 0)}${z.km_max ? `, até ${String(z.km_max).replace(".", ",")} km` : ""}`;
  }
  if (z.preco_tipo === "gratis_acima") return `${formatarPreco(z.preco_fixo_centavos ?? 0)}, grátis acima de ${formatarPreco(z.gratis_acima_centavos ?? 0)}`;
  return `Fixo: ${z.preco_fixo_centavos === 0 ? "grátis" : formatarPreco(z.preco_fixo_centavos ?? 0)}`;
}

function resumoCobertura(z: Zona) {
  if (z.cobertura === "cep") return `CEP de ${z.cep_inicio} a ${z.cep_fim}`;
  if (z.cobertura === "bairro") return `${z.bairros?.length ?? 0} bairro(s) de ${z.cidade}/${z.uf}`;
  return `Cidade de ${z.cidade}/${z.uf}`;
}

export default async function EntregaPropria({ searchParams }: PageProps<"/painel/produtor/frete/entrega-propria">) {
  const usuario = await exigirPapel("produtor");
  const sp = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: loja } = await supabase.from("producers").select("id, cep").eq("user_id", usuario.id).maybeSingle();
  const [{ data: zonas }, { data: entregadores }] = loja
    ? await Promise.all([
        supabase.from("entrega_zonas").select("*").eq("producer_id", loja.id).order("criado_em"),
        supabase.from("entregadores").select("id, nome, telefone").eq("producer_id", loja.id).order("nome"),
      ])
    : [{ data: [] }, { data: [] }];
  const lista = (zonas ?? []) as Zona[];
  const editar = typeof sp.editar === "string" ? lista.find((z) => z.id === sp.editar) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link href="/painel/produtor/frete" className="inline-block w-fit py-2 text-sm underline">
        ← Frete da loja
      </Link>
      <h1 className="text-3xl">Entrega própria</h1>
      <p className="text-petroleo/80">
        Entregue com seu motoboy ou motorista em regiões que você escolher. O comprador vê esta opção no checkout quando o CEP dele cai em uma zona. Ela convive com o envio por correio: o comprador escolhe a que estiver disponível.
        Quando mais de uma zona cobre o CEP, vale a mais específica: bairro, depois faixa de CEP, depois cidade.
      </p>
      {!loja ? (
        <p className="rounded-2xl bg-branco p-4">Cadastre sua empresa primeiro.</p>
      ) : (
        <>
          {!loja.cep && (
            <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              Falta o CEP do endereço comercial da loja. Sem ele, o preço por km usa só o preço fixo de reserva.
            </p>
          )}
          <section className="flex flex-col gap-3" aria-labelledby="t-zonas">
            <h2 id="t-zonas" className="text-xl">
              Zonas da loja
            </h2>
            {lista.length === 0 && <p className="rounded-2xl bg-branco p-4 text-sm">Nenhuma zona ainda. Crie a primeira abaixo.</p>}
            <ul className="flex flex-col gap-3">
              {lista.map((z) => (
                <li key={z.id} className="flex flex-col gap-2 rounded-2xl bg-branco p-4 text-sm">
                  <p className="font-medium">
                    {z.nome} <span className="font-normal text-petroleo/75">({z.ativo ? "ativa" : "desligada"})</span>
                  </p>
                  <p>{resumoCobertura(z)}</p>
                  <p>{resumoPreco(z)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/painel/produtor/frete/entrega-propria?editar=${z.id}#zona`} className={botao}>
                      Editar
                    </Link>
                    <form action={alternarZona}>
                      <input type="hidden" name="id" value={z.id} />
                      <input type="hidden" name="ativo" value={z.ativo ? "sim" : "nao"} />
                      <button className={botao}>{z.ativo ? "Desligar" : "Ligar"}</button>
                    </form>
                    <form action={removerZona}>
                      <input type="hidden" name="id" value={z.id} />
                      <button className={`${botao} text-red-800`}>Apagar</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section id="zona" className="rounded-2xl bg-branco p-6" aria-labelledby="t-nova">
            <h2 id="t-nova" className="mb-4 text-xl">
              {editar ? `Editar zona ${editar.nome}` : "Nova zona"}
            </h2>
            <FormZona key={editar?.id ?? "nova"} inicial={aFormulario(editar)} />
            {editar && (
              <Link href="/painel/produtor/frete/entrega-propria" className="mt-3 inline-flex min-h-11 items-center text-sm underline">
                Cancelar edição
              </Link>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl bg-branco p-6" aria-labelledby="t-entregadores">
            <h2 id="t-entregadores" className="text-xl">
              Entregadores (opcional)
            </h2>
            <p className="text-sm text-petroleo/80">Cadastre quem entrega para escolher com um toque em cada pedido. O telefone fica só com a loja; o comprador só o vê se você marcar no pedido.</p>
            <ul className="flex flex-col gap-2 text-sm">
              {(entregadores ?? []).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-t border-petroleo/10 pt-2 first:border-0 first:pt-0">
                  <span>
                    {e.nome}, {e.telefone}
                  </span>
                  <form action={removerEntregador}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className={`${botao} text-red-800`}>Remover</button>
                  </form>
                </li>
              ))}
            </ul>
            <FormEntregador />
          </section>
        </>
      )}
    </div>
  );
}
