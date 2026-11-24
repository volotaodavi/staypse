"use server";
// Entrega própria: zonas e entregadores da loja. Tudo com o cliente da PRÓPRIA pessoa (RLS):
// o banco só deixa mexer nas zonas e entregadores da própria loja e confere os limites de novo.
import { revalidatePath, updateTag } from "next/cache";
import type { EstadoFormulario } from "@/components/formulario";
import { exigirPapel } from "@/lib/papeis";
import { lerPreco } from "@/lib/produtor";
import { ETIQUETA_VITRINES } from "@/lib/publico";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const texto = (f: FormData, c: string) => String(f.get(c) ?? "").trim();
const centavos = (v: string) => (/^0+([,.]0+)?$/.test(v) ? 0 : lerPreco(v));
const numero = (v: string) => Number(v.replace(",", "."));
const CAMINHO = "/painel/produtor/frete/entrega-propria";

async function minhaLojaId() {
  const usuario = await exigirPapel("produtor");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("producers").select("id").eq("user_id", usuario.id).maybeSingle();
  return { supabase, id: data?.id as string | undefined };
}

function atualizou() {
  updateTag(ETIQUETA_VITRINES); // a página do produto mostra se a loja tem entrega própria
  revalidatePath(CAMINHO);
}

export async function salvarZona(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const { supabase, id: loja } = await minhaLojaId();
  const nomes = ["nome", "cobertura", "cep_inicio", "cep_fim", "cidade", "uf", "bairros", "preco_tipo", "preco_fixo", "gratis_acima", "preco_km", "taxa_minima", "km_max", "fator_rota", "prazo_tipo", "prazo_valor", "hora_limite", "horario_inicio", "horario_fim"];
  const valores: Record<string, string> = Object.fromEntries(nomes.map((n) => [n, texto(f, n)]));
  valores.dias = f.getAll("dias").join(",");
  const volta = (erro: string) => ({ erro, valores });
  if (!loja) return volta("Cadastre sua empresa primeiro.");

  const v = valores;
  if (v.nome.length < 2 || v.nome.length > 80) return volta("Dê um nome à zona (2 a 80 letras). Ex.: Maricá.");
  const cobertura = v.cobertura;
  const linha: Record<string, unknown> = { producer_id: loja, nome: v.nome, cobertura, ativo: f.get("ativo") === "sim" };

  if (cobertura === "cep") {
    const ini = v.cep_inicio.replace(/\D/g, "");
    const fim = v.cep_fim.replace(/\D/g, "");
    if (ini.length !== 8 || fim.length !== 8) return volta("Informe o CEP inicial e o final com 8 números.");
    if (ini > fim) return volta("O CEP inicial precisa ser menor ou igual ao final.");
    Object.assign(linha, { cep_inicio: ini, cep_fim: fim });
  } else if (cobertura === "cidade" || cobertura === "bairro") {
    if (v.cidade.length < 2) return volta("Informe a cidade.");
    if (!/^[A-Za-z]{2}$/.test(v.uf)) return volta("Informe a UF (2 letras).");
    Object.assign(linha, { cidade: v.cidade, uf: v.uf.toUpperCase() });
    if (cobertura === "bairro") {
      const bairros = [...new Set(v.bairros.split(/[\n,;]/).map((b) => b.trim()).filter(Boolean))];
      if (!bairros.length || bairros.length > 100) return volta("Informe de 1 a 100 bairros, um por linha.");
      linha.bairros = bairros;
    }
  } else return volta("Escolha como a zona é definida: faixa de CEP, cidade ou bairros.");

  const fixo = v.preco_fixo ? centavos(v.preco_fixo) : null;
  if (v.preco_fixo && (fixo == null || fixo > 100000)) return volta("Preço fixo inválido. Ex.: 12,00 (até 1.000,00).");
  if (v.preco_tipo === "fixo") {
    if (fixo == null) return volta("Informe o preço fixo da zona.");
    linha.preco_fixo_centavos = fixo;
  } else if (v.preco_tipo === "gratis_acima") {
    const acima = centavos(v.gratis_acima);
    if (fixo == null) return volta("Informe o preço da entrega abaixo do valor de frete grátis.");
    if (!acima) return volta("Informe a partir de quanto a entrega é grátis.");
    Object.assign(linha, { preco_fixo_centavos: fixo, gratis_acima_centavos: acima });
  } else if (v.preco_tipo === "km") {
    const porKm = centavos(v.preco_km);
    const minima = centavos(v.taxa_minima || "0");
    const fator = v.fator_rota ? numero(v.fator_rota) : 1.3;
    if (porKm == null || porKm > 10000) return volta("Informe o preço por km (ex.: 2,00).");
    if (minima == null || minima > 100000) return volta("Informe a taxa mínima (ex.: 8,00; use 0 se não houver).");
    if (!(fator >= 1 && fator <= 3)) return volta("O fator de rota fica entre 1 e 3 (padrão 1,3).");
    const kmMax = v.km_max ? numero(v.km_max) : null;
    if (kmMax != null && !(kmMax > 0 && kmMax <= 5000)) return volta("O km máximo precisa ser maior que 0.");
    Object.assign(linha, { preco_km_centavos: porKm, taxa_minima_centavos: minima, fator_rota: fator, km_max: kmMax, preco_fixo_centavos: fixo });
  } else return volta("Escolha como o preço é calculado: fixo, por km ou grátis acima de um valor.");
  linha.preco_tipo = v.preco_tipo;

  if (v.prazo_tipo === "mesmo_dia") {
    if (!/^\d{2}:\d{2}$/.test(v.hora_limite)) return volta("Informe até que horas o pedido entra no mesmo dia.");
    linha.hora_limite = v.hora_limite;
  } else if (v.prazo_tipo === "horas" || v.prazo_tipo === "dias") {
    const n = Number(v.prazo_valor);
    if (!Number.isInteger(n) || n < 1 || n > 90) return volta("Informe o prazo (1 a 90).");
    linha.prazo_valor = n;
  } else return volta("Escolha o prazo: mesmo dia, horas ou dias.");
  linha.prazo_tipo = v.prazo_tipo;

  const dias = f.getAll("dias").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (!dias.length) return volta("Marque ao menos um dia de entrega.");
  if (!/^\d{2}:\d{2}$/.test(v.horario_inicio) || !/^\d{2}:\d{2}$/.test(v.horario_fim) || v.horario_inicio >= v.horario_fim) {
    return volta("O horário de início precisa ser antes do fim.");
  }
  Object.assign(linha, { dias_semana: dias, horario_inicio: v.horario_inicio, horario_fim: v.horario_fim });

  const zonaId = texto(f, "id");
  const { error } = zonaId
    ? await supabase.from("entrega_zonas").update(linha).eq("id", zonaId)
    : await supabase.from("entrega_zonas").insert(linha);
  if (error) console.error("salvarZona:", error.message);
  if (error) return volta(error.message.includes("limite_zonas") ? "Limite de 100 zonas por loja." : "Não foi possível salvar a zona. Confira os campos.");
  atualizou();
  return { sucesso: `Zona "${v.nome}" salva.` };
}

export async function removerZona(f: FormData) {
  const { supabase } = await minhaLojaId();
  await supabase.from("entrega_zonas").delete().eq("id", texto(f, "id"));
  atualizou();
}

export async function alternarZona(f: FormData) {
  const { supabase } = await minhaLojaId();
  await supabase.from("entrega_zonas").update({ ativo: texto(f, "ativo") !== "sim" }).eq("id", texto(f, "id"));
  atualizou();
}

export async function salvarEntregador(_a: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const { supabase, id: loja } = await minhaLojaId();
  const valores = { nome: texto(f, "nome"), telefone: texto(f, "telefone") };
  const tel = valores.telefone.replace(/\D/g, "");
  if (!loja) return { erro: "Cadastre sua empresa primeiro.", valores };
  if (valores.nome.length < 2 || valores.nome.length > 80) return { erro: "Informe o nome do entregador.", valores };
  if (tel.length < 10 || tel.length > 11) return { erro: "Telefone com DDD (10 ou 11 números).", valores };
  const { error } = await supabase.from("entregadores").insert({ producer_id: loja, nome: valores.nome, telefone: tel });
  if (error) return { erro: "Não foi possível salvar o entregador.", valores };
  revalidatePath(CAMINHO);
  return { sucesso: `Entregador ${valores.nome} cadastrado.` };
}

export async function removerEntregador(f: FormData) {
  const { supabase } = await minhaLojaId();
  await supabase.from("entregadores").delete().eq("id", texto(f, "id"));
  revalidatePath(CAMINHO);
}
