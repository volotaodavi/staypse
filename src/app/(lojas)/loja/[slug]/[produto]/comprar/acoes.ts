"use server";
// Checkout em duas etapas:
//  1. "revisar": confere os dados e pede ao BANCO o preço, o frete e o total;
//  2. "confirmar": com o resumo aceito (regra 4), o SERVIDOR cria o pedido.
// A indicação (afiliado) vem de duas fontes, ambas conferidas pelo BANCO:
//  * o cookie assinado do link curto (origem "link");
//  * o CÓDIGO de indicação digitado pelo comprador (origem "codigo") — para quem clicou
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
import { criarClienteAdmin } from "@/lib/supabase/admin";
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
  loja_nome: string;
  razao_social: string;
  cnpj: string;
};

export type EstadoCompra =
  | { etapa: "dados" | "resumo"; erro?: string; resumo?: Resumo; indicadoPor?: string | null; indicadoPorCodigo?: boolean; valores: Record<string, string> }
  | undefined;

const CAMPOS = [
  "item", "loja", "produto", "quantidade", "entrega", "nome", "email", "cpf", "telefone",
  "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "codigo",
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
  if (!["envio", "retirada", "digital"].includes(modo)) return dados("Escolha a forma de entrega.");
  if (valores.nome.length < 2) return dados("Informe seu nome completo.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) return dados("Informe um e-mail válido.");
  if (valores.cpf.replace(/\D/g, "").length !== 11) return dados("Informe seu CPF (11 números). A loja precisa dele para a nota fiscal.");
  if (!cpfValido(valores.cpf)) return dados("CPF inválido. Confira os números.");
  if (modo === "envio") {
    if (valores.cep.replace(/\D/g, "").length !== 8) return dados("Informe o CEP (8 números).");
    if (!valores.logradouro || !valores.numero || !valores.bairro || !valores.cidade || !/^[A-Z]{2}$/.test(valores.uf)) {
      return dados("Endereço incompleto. Confira rua, número, bairro, cidade e UF.");
    }
  }

  // preço, frete e total: sempre do banco
  const supabase = await criarClienteServidor();
  const { data: cotacao, error: erroCotacao } = await supabase
    .rpc("cotar_pedido", { p_item: valores.item, p_quantidade: quantidade, p_modo: modo })
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
  const resumo = (erro?: string) => ({ etapa: "resumo" as const, resumo: cotacao, indicadoPor, indicadoPorCodigo: Boolean(valores.codigo), valores, erro });

  if (intencao !== "confirmar") return resumo();

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
        modo === "envio"
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
  redirect(`/pedido/${pedido.codigo}?t=${pedido.token}&novo=1`);
}
