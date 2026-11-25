// Conteúdo do blog em TypeScript simples. Corpo em blocos:
// ["h2", texto] | ["p", texto] | ["ul", [itens]] | ["ol", [itens]].
// Dentro do texto: [rótulo](/rota) vira link e **texto** vira negrito.
export type Bloco = ["h2" | "p", string] | ["ul" | "ol", string[]];

export type Artigo = {
  slug: string;
  titulo: string; // h1
  tituloSeo: string; // até 50 (o site acrescenta " | Staypse", total até 60)
  descricao: string; // até 155
  resumo: string; // abertura e card da lista
  publicadoEm: string; // AAAA-MM-DD
  atualizadoEm: string;
  minutos: number;
  corpo: Bloco[];
};
