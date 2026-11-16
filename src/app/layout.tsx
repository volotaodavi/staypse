import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Rodape } from "@/components/Rodape";
import "./globals.css";

// Fonte da marca: 400/500 para textos, 800 (ExtraBold) para títulos.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Staypse — indique produtos e ganhe por venda",
    template: "%s | Staypse",
  },
  description:
    "Produtores cadastram produtos, revendedores indicam pela própria vitrine e ganham comissão em cada venda. Sem estoque e sem precisar de seguidores.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://staypse.com.br"),
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
