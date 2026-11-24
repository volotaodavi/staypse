"use server";
// Checkout em duas etapas:
//  1. "revisar": confere os dados e pede ao BANCO o preço, o frete e o total;
//  2. "confirmar": com o resumo aceito (regra 4), o SERVIDOR cria o pedido e a cobrança no
//     provedor de pagamento, e leva o comprador à página de pagamento do provedor.
// A indicação (afiliado) vem de duas fontes, ambas conferidas pelo BANCO:
//  * o cookie assinado do link curto (origem "link");
//  * o CÓDIGO de indicação digitado pelo comprador (origem "codigo"), para quem clicou
//    no celular e compra no computador. O código digitado VENCE o cookie (intenção explícita).
// Código não é desconto: o preço é o mesmo. Código inválido barra o avanço, com mensagem
// neutra, e a pessoa pode apagar o campo para comprar sem indicação.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TERMOS_VERSAO } from "@/config/empresa";
import { COOKIE_ATRIBUICAO, atribuicaoDoItem } from "@/lib/atribuicao";
import { comprasAbertas, cpfValido, mensagemDeErro, type ModoEntrega } from "@/lib/pedidos";
import { hashDoIp } from "@/lib/ip";
import { registrarAcesso } from "@/lib/acesso";
import { usuarioAtual } from "@/lib/papeis";
import { iniciarCobranca } from "@/lib/pagamentos/cobrancas";
import { meiosAtivos } from "@/lib/pagamentos/meios";
import { opcoesParcelamento, parcelasPermitidas, type OpcaoParcela } from "@/lib/pagamentos/juros";
import { MEIOS, type Meio } from "@/lib/pagamentos/parcelas";
import { politicaParcelasDoItem, taxasVigentes } from "@/lib/pagamentos/politica";
import { mensagemDePagamento } from "@/lib/pagamentos/mensagens";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { garantirGeoCep, garantirGeoDaLoja } from "@/lib/entrega-propria-geo";
import { formatarPreco } from "@/lib/produtor";
import { urlDoSite } from "@/lib/supabase/env";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type Resumo = {
  nome: string;
  tipo: string;
  preco_unitario_centavos: number;
  quantidade: number;
  subtotal_centavos: number;
  frete_centavos: number;
  total_centavos: number;
  prazo_postagem_dias: number | null;
  prazo_entrega_dias: number | null;
  zona_nome?: string | null;
  prazo_texto?: string | null;
  loja_nome: string;
  razao_social: string;
  cnpj: string;
};

export type EstadoCompra =
  | { etapa: "dados" | "resumo"; erro?: string; resumo?: Resumo; indicadoPor?: string | null; indicadoPorCodigo?: boolean; meios?: Meio[]; parcelas?: OpcaoParcela[]; valores: Record<string, string> }
  | undefined;

const CAMPOS = [
  "item", "loja", "produto", "quantidade", "entrega", "nome", "email", "cpf", "telefone",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "codigo", "meio", "parcelas",
] as const;

const texto = (f: FormData, nome: string) => String(f.get(nome) ?? "").trim();

export async function comprar(_anterior: EstadoCompra, f: FormData): Promise<EstadoCompra> {
  if (!comprasAbertas()) return { etapa: "dados", erro: "As compras ainda não estão abertas.", valores: {} };
  // robô preenche o campo invisível: descarta sem dizer nada
  if (texto(f, "site")) return { etapa: "dados", valores: {} };

  const valores: Record<string, string> = {};
  for (const c of CAMPOS) valores[c] = texto(f, c);
  valores.uf = valores.uf.toUpperCase();
  // código de indicação: minúsculas, sem "@" nem espaços (o banco confere de novo)
  valores.codigo = valores.codigo.replace(/^@+/, "").trim().toLowerCase().slice(0, 40);
  const intencao = texto(f, "intencao");
  const dados = (erro: string) => ({ etapa: "dados" as const, erro, valores });

  if (intencao === "editar") return { etapa: "dados", valores };

  const quantidade = Number(valores.quantidade);
  const modo = valores.entrega as ModoEntrega;
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 99) return dados("Escolha uma quantidade entre 1 e 99.");
  if (!["envio", "retirada", "digital", "propria"].includes(modo)) return dados("Escolha a forma de entrega.");
  if (valores.nome.length < 2) return dados("Informe seu nome completo.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) return dados("Informe um e-mail válido.");
  if (valores.cpf.replace(/\D/g, "").length !== 11) return dados("Informe seu CPF (11 números). A loja precisa dele para a nota fiscal.");
  if (!cpfValido(valores.cpf)) return dados("CPF inválido. Confira os números.");
  const comEndereco = modo === "envio" || modo === "propria";
  if (comEndereco) {
    if (valores.cep.replace(/\D/g, "").length !== 8) return dados("Informe o CEP (8 números).");
    if (!valores.logradouro || !valores.numero || !valores.bairro || !valores.cidade || !/^[A-Z]{2}$/.test(valores.uf)) {
      return dados("Endereço incompleto. Confira rua, número, bairro, cidade e UF.");
    }
  }

  // entrega própria: o servidor guarda cidade/bairro/coordenadas do CEP (cache) antes de o banco cotar
  const cepNumeros = valores.cep.replace(/\D/g, "");
  if (modo === "propria") await Promise.all([garantirGeoCep(cepNumeros), garantirGeoDaLojaDoItem(valores.item)]);

  // preço, frete e total: sempre do banco
  const supabase = await criarClienteServidor();
  const { data: cotacao, error: erroCotacao } = await supabase
    .rpc("cotar_pedido", { p_item: valores.item, p_quantidade: quantidade, p_modo: modo, p_cep: modo === "propria" ? cepNumeros : null })
    .maybeSingle<Resumo>();
  if (erroCotacao || !cotacao) return dados(mensagemDeErro(erroCotacao, "Não foi possível calcular o pedido. Tente de novo."));

  const jar = await cookies();
  const indicacao = atribuicaoDoItem(jar.get(COOKIE_ATRIBUICAO)?.value, valores.item);
  const usuario = await usuarioAtual();

  // código digitado: conferido no banco (que também limita tentativas inválidas por IP).
  // A mensagem é a mesma para "não existe" e "não vale para este produto".
  let indicadoPor = indicacao?.h ?? null;
  if (valores.codigo) {
    const { data: conferido, error: erroCodigo } = await criarClienteAdmin()
      .rpc("validar_codigo_indicacao", {
        p_item: valores.item,
        p_codigo: valores.codigo,
        p_ip_hash: await hashDoIp(),
        p_comprador: usuario?.id ?? null,
      })
      .maybeSingle<{ valido: boolean; limitado: boolean; vitrine_slug: string | null }>();
    if (erroCodigo) console.error("validar_codigo_indicacao:", erroCodigo.message);
    if (conferido?.limitado) return dados("Muitas tentativas com código de indicação. Aguarde um pouco ou apague o campo para comprar sem indicação.");
    if (!conferido?.valido) return dados(mensagemDeErro({ message: "codigo_indicacao_invalido" }, "Este código não vale para este produto."));
    indicadoPor = conferido.vitrine_slug;
  }
  const meiosLigados = await meiosAtivos();
  // política de parcelas da LOJA e taxas em vigor: o servidor calcula parcela, "sem/com juros" e total de cada opção
  // (o comprador nunca recebe taxa, só estes valores)
  let taxas;
  let politica;
  try {
    [taxas, politica] = await Promise.all([taxasVigentes(), politicaParcelasDoItem(valores.item)]);
  } catch {
    return dados("Não foi possível calcular as parcelas agora. Tente de novo em alguns minutos.");
  }
  if (cotacao.total_centavos < taxas.pedidoMinimoCentavos) {
    return dados(`O pedido mínimo é de ${formatarPreco(taxas.pedidoMinimoCentavos)}. Aumente a quantidade para continuar.`);
  }
  const opcoes = opcoesParcelamento(cotacao.total_centavos, politica, taxas);
  const resumo = (erro?: string) => ({
    etapa: "resumo" as const,
    resumo: cotacao,
    indicadoPor,
    indicadoPorCodigo: Boolean(valores.codigo),
    valores,
    meios: MEIOS.filter((m) => meiosLigados[m]),
    parcelas: opcoes,
    erro,
  });

  if (intencao !== "confirmar") return resumo();

  // meio e parcelas: escolhidos ANTES de criar a cobrança (a taxa da loja depende da modalidade)
  const meio = valores.meio as Meio;
  if (!MEIOS.includes(meio) || !meiosLigados[meio]) return resumo("Escolha como você quer pagar.");
  const parcelas = meio === "cartao" ? Number(valores.parcelas || 1) : 1;
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > parcelasPermitidas(cotacao.total_centavos, politica)) {
    return resumo("Escolha um número de parcelas válido para este valor.");
  }

  // REGRA 4: só cria o pedido com o resumo aceito
  if (f.get("aceite") !== "sim") return resumo("Marque que leu o resumo do pedido.");

  const { data: pedido, error } = await criarClienteAdmin()
    .rpc("criar_pedido", {
      p_item: valores.item,
      p_quantidade: quantidade,
      p_modo: modo,
      p_afiliado: indicacao?.a ?? null,
      p_comprador_id: usuario?.id ?? null,
      p_nome: valores.nome,
      p_email: valores.email,
      p_documento: valores.cpf,
      p_telefone: valores.telefone || null,
      p_endereco:
        comEndereco
          ? {
              cep: valores.cep.replace(/\D/g, ""),
              logradouro: valores.logradouro,
              numero: valores.numero,
              complemento: valores.complemento,
              bairro: valores.bairro,
              cidade: valores.cidade,
              uf: valores.uf,
            }
          : null,
      p_termos_versao: TERMOS_VERSAO,
      p_codigo: valores.codigo || null,
    })
    .maybeSingle<{ id: string; codigo: string; token: string }>();
  if (error || !pedido) return resumo(mensagemDeErro(error, "Não foi possível criar o pedido. Tente de novo."));

  await registrarAcesso("pedido", usuario?.id);

  // pedido criado → o SERVIDOR pede a cobrança ao provedor (já com o split: loja, indicação e taxa da
  // Staypse) e leva o comprador à página de pagamento DELE. Nenhum dado de cartão passa por aqui.
  // Se o provedor não responder, o pedido fica guardado e a página do pedido oferece "Pagar agora".
  const caminho = `/pedido/${pedido.codigo}?t=${pedido.token}&novo=1`;
  let destino = caminho;
  try {
    const { url } = await iniciarCobranca(pedido.id, `${urlDoSite()}${caminho}`, { meio, parcelas });
    // cartão: a pessoa digita o cartão na página da Lytex (linkCheckout). Pix e boleto: o código aparece
    // na página do pedido, com o visual da loja.
    if (url && meio === "cartao") destino = url;
  } catch (e) {
    console.error("iniciarCobranca:", e instanceof Error ? e.message : e);
    destino = `${caminho}&${new URLSearchParams({ erro: mensagemDePagamento(e) }).toString()}`;
  }
  redirect(destino);
}

async function garantirGeoDaLojaDoItem(item: string) {
  const { data } = await criarClienteAdmin().from("items").select("producer_id").eq("id", item).maybeSingle();
  if (data?.producer_id) await garantirGeoDaLoja(data.producer_id as string);
}

export type CotacaoPropria = { zona_nome: string; frete_centavos: number; distancia_km: number | null; prazo_texto: string; loja_paga: boolean };

// Tela do checkout: "a entrega própria atende este CEP?" Preço e zona vêm do banco.
export async function cotarEntregaPropria(item: string, cep: string, quantidade: number): Promise<CotacaoPropria | null> {
  const numeros = cep.replace(/\D/g, "");
  if (numeros.length !== 8 || !/^[0-9a-f-]{36}$/.test(item)) return null;
  await Promise.all([garantirGeoCep(numeros), garantirGeoDaLojaDoItem(item)]);
  const { data } = await (await criarClienteServidor())
    .rpc("cotar_entrega_propria", { p_item: item, p_cep: numeros, p_quantidade: Math.min(99, Math.max(1, Math.trunc(quantidade) || 1)) })
    .maybeSingle<CotacaoPropria>();
  return data ?? null;
}
