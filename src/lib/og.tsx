// Cartão de prévia (1200x630) para WhatsApp/Instagram das páginas públicas:
// fundo petróleo, logo OFICIAL (arquivo em public/brand), foto do produto à
// direita, título e destaque (preço) — sempre nas cores da marca.
/* eslint-disable @next/next/no-img-element -- dentro do ImageResponse só existe <img> */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const tamanhoOg = { width: 1200, height: 630 };

const arquivo = (caminho: string) => readFile(join(process.cwd(), caminho));

// Baixa a foto (bucket público) e transforma em data URL; se falhar, sai sem foto.
async function fotoComoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!resposta.ok) return null;
    const tipo = resposta.headers.get("content-type") ?? "image/webp";
    const bytes = Buffer.from(await resposta.arrayBuffer());
    if (bytes.length > 4_000_000) return null;
    return `data:${tipo};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function cartaoOg({
  titulo,
  linha,
  destaque,
  fotoUrl,
}: {
  titulo: string;
  linha?: string;
  destaque?: string;
  fotoUrl?: string | null;
}) {
  const [logo, outfit400, outfit800, foto] = await Promise.all([
    arquivo("public/brand/staypse-logo-negativo.svg").then((b) => `data:image/svg+xml;base64,${b.toString("base64")}`),
    arquivo("node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff"),
    arquivo("node_modules/@fontsource/outfit/files/outfit-latin-800-normal.woff"),
    fotoComoDataUrl(fotoUrl ?? null),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#062c30", color: "#eef6f5", fontFamily: "Outfit" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, flex: 1 }}>
          <img src={logo} alt="staypse" height={56} style={{ objectFit: "contain", objectPosition: "left" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: titulo.length > 40 ? 52 : 64, fontWeight: 800, lineHeight: 1.08 }}>
              {titulo.length > 80 ? `${titulo.slice(0, 77)}...` : titulo}
            </div>
            {destaque && <div style={{ display: "flex", marginTop: 20, fontSize: 56, fontWeight: 800, color: "#14d6c4" }}>{destaque}</div>}
            {linha && <div style={{ display: "flex", marginTop: 16, fontSize: 30, color: "#eef6f5" }}>{linha}</div>}
          </div>
        </div>
        {foto && (
          <img src={foto} alt="" width={540} height={630} style={{ objectFit: "cover", width: 540, height: 630 }} />
        )}
      </div>
    ),
    {
      ...tamanhoOg,
      fonts: [
        { name: "Outfit", data: outfit400, weight: 400, style: "normal" },
        { name: "Outfit", data: outfit800, weight: 800, style: "normal" },
      ],
    },
  );
}
