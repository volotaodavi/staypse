// Pequenos utilitários do simulador de pagamentos (sem dependência de servidor).

// O simulador só devolve o comprador para o link do pedido (caminho do nosso site, com o
// token de 64 letras e números) — nunca para um endereço qualquer vindo da URL.
export const VOLTA_VALIDA = /^\/pedido\/[A-Z0-9]{10}\?t=[0-9a-f]{64}(&novo=1)?$/;
