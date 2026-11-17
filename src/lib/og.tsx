/* eslint-disable @next/next/no-img-element -- dentro do ImageResponse só existe <img> */
// Cartão de prévia (1200x630) para WhatsApp/Instagram das páginas públicas:
// foto do produto à direita; à esquerda a MARCA (logo/nome da loja, ou a logo
// oficial da Staypse), título e destaque (preço). Cores vêm do tema da loja.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PADRAO, textoSobre } from "./tema";

export const tamanhoOg = { width: 1200, height: 630 };

const arquivo = (caminho: string) => readFile(join(process.cwd(), caminho));

// Baixa uma imagem pública e transforma em data URL; se falhar, segue sem ela.
async function imagemComoDataUrl(url: string | null | undefined): Promise<string | null> {
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
  cor = PADRAO.principal,
  marca,
}: {
  titulo: string;
  linha?: string;
  destaque?: string;
  fotoUrl?: string | null;
  cor?: string;
  // marca da loja (nome + logo opcional); sem isso, usa a logo oficial da Staypse
  marca?: { nome: string; logoUrl?: string | null };
}) {
  const [logoStaypse, outfit400, outfit800, foto, logoLoja] = await Promise.all([
    marca ? null : arquivo("public/brand/staypse-logo-negativo.svg").then((b) => `data:image/svg+xml;base64,${b.toString("base64")}`),
    arquivo("node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff"),
    arquivo("node_modules/@fontsource/outfit/files/outfit-latin-800-normal.woff"),
    imagemComoDataUrl(fotoUrl),
    imagemComoDataUrl(marca?.logoUrl),
  ]);
  const texto = textoSobre(cor);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: cor, color: texto, fontFamily: "Outfit" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, flex: 1 }}>
          {marca ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {logoLoja && <img src={logoLoja} alt="" width={72} height={72} style={{ borderRadius: 8, objectFit: "cover" }} />}
              <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{marca.nome}</div>
            </div>
          ) : (
            logoStaypse && <img src={logoStaypse} alt="staypse" height={56} style={{ objectFit: "contain", objectPosition: "left" }} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: titulo.length > 40 ? 52 : 64, fontWeight: 800, lineHeight: 1.08 }}>
              {titulo.length > 80 ? `${titulo.slice(0, 77)}...` : titulo}
            </div>
            {destaque && <div style={{ display: "flex", marginTop: 20, fontSize: 56, fontWeight: 800 }}>{destaque}</div>}
            {linha && <div style={{ display: "flex", marginTop: 16, fontSize: 30, opacity: 0.85 }}>{linha}</div>}
          </div>
        </div>
        {foto && <img src={foto} alt="" width={540} height={630} style={{ objectFit: "cover", width: 540, height: 630 }} />}
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
