// Denúncias: o que se pode denunciar e os motivos aceitos (iguais aos do banco).
export const ALVOS_DENUNCIA = { item: "produto", loja: "loja", vitrine: "vitrine" } as const;
export type AlvoDenuncia = keyof typeof ALVOS_DENUNCIA;

export const MOTIVOS_DENUNCIA: Record<string, string> = {
  produto_proibido: "Produto proibido",
  golpe_ou_fraude: "Golpe ou fraude",
  conteudo_enganoso: "Conteúdo enganoso",
  direito_autoral: "Direito autoral",
  conteudo_ofensivo: "Conteúdo ofensivo",
  outro: "Outro motivo",
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// link do botão "Denunciar" das páginas públicas
export const linkDenuncia = (tipo: AlvoDenuncia, id: string) => `/denunciar?tipo=${tipo}&id=${id}`;
