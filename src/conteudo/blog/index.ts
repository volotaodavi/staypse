import type { Artigo } from "./tipos";
import { artigo as a1 } from "./vender-com-afiliados-loja-fisica";
import { artigo as a2 } from "./programa-de-afiliados-para-lojas";
import { artigo as a3 } from "./o-que-e-split-de-pagamento";
import { artigo as a4 } from "./divulgar-produtos-como-afiliado-instagram-whatsapp";
import { artigo as a5 } from "./vendedor-de-loja-com-link-proprio-comissao";
import { artigo as a6 } from "./quanto-custa-vender-pela-internet";

export type { Artigo, Bloco } from "./tipos";
export const ARTIGOS: Artigo[] = [a1, a2, a3, a4, a5, a6];
export const artigoPorSlug = (slug: string) => ARTIGOS.find((a) => a.slug === slug);
