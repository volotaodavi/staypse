// Imagem de prévia (1200x630) que aparece quando o link é colado no
// WhatsApp, Instagram, Facebook etc. Fundo petróleo + logo OFICIAL.
// A logo vem do arquivo public/brand/staypse-logo-negativo.svg (nunca
// redesenhada). Enquanto o arquivo não existir, a imagem sai só com o texto.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Staypse — plataforma de afiliados para produtos físicos e digitais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function logoOficial(): Promise<string | null> {
  try {
    const svg = await readFile(join(process.cwd(), "public/brand/staypse-logo-negativo.svg"));
    return `data:image/svg+xml;base64,${svg.toString("base64")}`;
  } catch {
    return null; // logo ainda não colocada em public/brand/
  }
}

// Fonte da marca (Outfit), lida dos arquivos locais do pacote @fontsource:
// o build não depende de baixar nada da internet.
const fonte = (peso: 400 | 800) =>
  readFile(join(process.cwd(), `node_modules/@fontsource/outfit/files/outfit-latin-${peso}-normal.woff`));

export default async function Image() {
  const [logo, outfit400, outfit800] = await Promise.all([logoOficial(), fonte(400), fonte(800)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#062c30",
          color: "#eef6f5",
          fontFamily: "Outfit",
        }}
      >
        {logo && (
          <img src={logo} alt="staypse" height={110} style={{ marginBottom: 48, objectFit: "contain", objectPosition: "left" }} />
        )}
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>
          Plataforma de afiliados para produtos físicos e digitais
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#14d6c4" }}>
          Lista de espera aberta
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Outfit", data: outfit400, weight: 400, style: "normal" },
        { name: "Outfit", data: outfit800, weight: 800, style: "normal" },
      ],
    },
  );
}
