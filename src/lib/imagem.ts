"use client";
// Compressão de fotos no próprio celular, antes do envio:
// reduz para no máximo 1600 px no maior lado e converte para WebP.
// Uma foto de 4 MB do celular costuma virar ~200 KB, envio rápido no 4G.

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;

export async function comprimirImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", QUALIDADE));
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  return blob;
}
