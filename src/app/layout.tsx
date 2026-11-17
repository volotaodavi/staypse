import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Rodape } from "@/components/Rodape";
import { urlDoSite } from "@/lib/supabase/env";
import "./globals.css";

// Fonte da marca: 400/500 para textos, 800 (ExtraBold) para títulos.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "800"],
  display: "swap",
});

// SEO + prévia de compartilhamento (WhatsApp/Instagram).
// A imagem de prévia é gerada por src/app/opengraph-image.tsx.
const descricao =
  "Plataforma de afiliados para produtos físicos e digitais. Produtores cadastram, revendedores indicam pelo próprio link e o pagamento é dividido na hora da venda. Entre na lista de espera.";

export const metadata: Metadata = {
  title: {
    default: "Staypse — plataforma de afiliados para produtos físicos e digitais",
    template: "%s | Staypse",
  },
  description: descricao,
  // endereço do site (domínio próprio ou, enquanto não houver, o da Vercel)
  metadataBase: new URL(urlDoSite()),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Staypse",
    title: "Staypse — plataforma de afiliados para produtos físicos e digitais",
    description: descricao,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#062c30",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="flex flex-1 flex-col">{children}</div>
        {/* Regra de conformidade 3: rodapé legal em TODAS as páginas */}
        <Rodape />
      </body>
    </html>
  );
}
