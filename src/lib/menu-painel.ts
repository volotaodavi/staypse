// Mapa do menu dos painéis: as seções de cada área (loja, afiliado, vendedor,
// admin). Só dados, sem React, para o servidor montar e o cliente marcar a atual.
import type { Papel } from "@/lib/papeis";

export type IconeNome =
  | "resumo" | "pedidos" | "produtos" | "afiliados" | "vendedores" | "recebimentos" | "loja"
  | "catalogo" | "links" | "vitrine" | "dados" | "denuncias" | "atendimentos" | "usuarios"
  | "lista" | "auditoria" | "erros" | "config" | "mais" | "inscritos";

export type ItemMenu = {
  href: string;
  rotulo: string;
  // rótulo curto para a barra de baixo, quando o normal não cabe
  curto?: string;
  icone: IconeNome;
  // outros caminhos que contam como "estou nesta seção"
  prefixos?: string[];
  grupo?: string;
};

export type AreaMenu = {
  chave: string;
  papel: Papel;
  caminho: string; // destino ao trocar de área
  titulo: string;
  // caminhos que pertencem a esta área
  raizes: string[];
  itens: ItemMenu[];
};

export const MEUS_DADOS: ItemMenu = { href: "/painel/meus-dados", rotulo: "Meus dados", icone: "dados" };
// preferências da própria conta (avisos por e-mail e contato); para todos os papéis.
// No admin o rótulo muda para não confundir com as configurações da plataforma.
export const CONFIGURACOES: ItemMenu = { href: "/painel/configuracoes", rotulo: "Configurações", icone: "config" };
const CONFIGURACOES_ADMIN: ItemMenu = { ...CONFIGURACOES, rotulo: "Minhas configurações", curto: "Minha conta" };

// itens fixos da conta (fora das seções da área)
export function itensDaConta(areaChave: string): ItemMenu[] {
  return [areaChave === "admin" ? CONFIGURACOES_ADMIN : CONFIGURACOES, MEUS_DADOS];
}

export const AREAS_MENU: AreaMenu[] = [
  {
    chave: "admin",
    papel: "admin",
    caminho: "/admin",
    titulo: "Administração",
    raizes: ["/admin"],
    itens: [
      { href: "/admin", rotulo: "Visão geral", curto: "Início", icone: "resumo" },
      { href: "/admin/produtores", rotulo: "Lojas", icone: "loja", grupo: "Análise" },
      { href: "/admin/itens", rotulo: "Itens", icone: "produtos", grupo: "Análise" },
      { href: "/admin/recebedores", rotulo: "Recebedores", icone: "recebimentos", grupo: "Análise" },
      { href: "/admin/denuncias", rotulo: "Denúncias", icone: "denuncias", grupo: "Análise" },
      { href: "/admin/financeiro", rotulo: "Financeiro", icone: "recebimentos", grupo: "Finanças" },
      { href: "/admin/pedidos", rotulo: "Pedidos", icone: "pedidos", grupo: "Operação" },
      { href: "/admin/atendimentos", rotulo: "Atendimentos", icone: "atendimentos", grupo: "Operação" },
      { href: "/admin/usuarios", rotulo: "Usuários", icone: "usuarios", grupo: "Operação" },
      { href: "/admin/lista-espera", rotulo: "Lista de espera", icone: "lista", grupo: "Operação" },
      { href: "/admin/lista", rotulo: "Inscritos da lista", icone: "inscritos", grupo: "Operação" },
      { href: "/admin/auditoria", rotulo: "Log de auditoria", icone: "auditoria", grupo: "Sistema" },
      { href: "/admin/erros", rotulo: "Erros", icone: "erros", grupo: "Sistema" },
      { href: "/admin/configuracoes", rotulo: "Configurações", icone: "config", grupo: "Sistema" },
    ],
  },
  {
    chave: "loja",
    papel: "produtor",
    caminho: "/painel/loja",
    titulo: "Loja",
    raizes: ["/painel/loja", "/painel/produtor"],
    itens: [
      { href: "/painel/loja", rotulo: "Resumo", icone: "resumo" },
      { href: "/painel/loja/pedidos", rotulo: "Pedidos", icone: "pedidos" },
      { href: "/painel/loja/produtos", rotulo: "Produtos", icone: "produtos", prefixos: ["/painel/produtor/itens"] },
      { href: "/painel/loja/afiliados", rotulo: "Afiliados", icone: "afiliados" },
      { href: "/painel/loja/vendedores", rotulo: "Vendedores", icone: "vendedores", prefixos: ["/painel/produtor/vendedores"] },
      { href: "/painel/loja/recebimentos", rotulo: "Recebimentos", icone: "recebimentos" },
      { href: "/painel/loja/minha-loja", rotulo: "Minha loja", icone: "loja", prefixos: ["/painel/produtor"] },
    ],
  },
  {
    chave: "afiliado",
    papel: "revendedor",
    caminho: "/painel/afiliado",
    titulo: "Afiliado",
    raizes: ["/painel/afiliado", "/painel/revendedor"],
    itens: [
      { href: "/painel/afiliado", rotulo: "Resumo", icone: "resumo", prefixos: ["/painel/revendedor"] },
      { href: "/painel/revendedor/catalogo", rotulo: "Catálogo", icone: "catalogo" },
      { href: "/painel/revendedor/vitrine", rotulo: "Vitrine", icone: "vitrine" },
      { href: "/painel/revendedor/links", rotulo: "Links externos", curto: "Links", icone: "links" },
      { href: "/painel/afiliado/recebimentos", rotulo: "Recebimentos", icone: "recebimentos" },
    ],
  },
  {
    chave: "vendedor",
    papel: "vendedor_proprio",
    caminho: "/painel/vendedor",
    titulo: "Vendedor da loja",
    raizes: ["/painel/vendedor"],
    itens: [
      { href: "/painel/vendedor", rotulo: "Resumo", icone: "resumo" },
      { href: "/painel/revendedor/vitrine", rotulo: "Minha vitrine", curto: "Vitrine", icone: "vitrine" },
    ],
  },
];

const dentro = (caminho: string, raiz: string) => caminho === raiz || caminho.startsWith(`${raiz}/`);

// A área em que a pessoa está, pelo endereço; se o endereço não for de nenhuma
// área dela (ex.: Meus dados), usa a primeira que ela tem.
export function areaAtual(caminho: string, areas: AreaMenu[]): AreaMenu {
  return areas.find((a) => a.raizes.some((r) => dentro(caminho, r))) ?? areas[0];
}

// Qual item da área está ativo: vence o endereço mais específico (mais longo).
export function itemAtivo(caminho: string, itens: ItemMenu[]): string | null {
  let melhor: { href: string; tam: number } | null = null;
  for (const i of itens) {
    for (const p of [i.href, ...(i.prefixos ?? [])]) {
      // o primeiro item (resumo da área) só vale em correspondência exata
      const bate = i === itens[0] ? caminho === p : dentro(caminho, p);
      if (bate && (!melhor || p.length > melhor.tam)) melhor = { href: i.href, tam: p.length };
    }
  }
  return melhor?.href ?? null;
}
