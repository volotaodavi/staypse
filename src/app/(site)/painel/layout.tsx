// Moldura de todas as páginas do painel (área logada).
import type { Metadata } from "next";
import { MolduraPainel } from "@/components/MolduraPainel";

// área logada: nunca no Google
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return <MolduraPainel>{children}</MolduraPainel>;
}
