// Moldura da área administrativa (mesmo menu lateral / barra de baixo do painel).
import type { Metadata } from "next";
import { MolduraPainel } from "@/components/MolduraPainel";

// área logada: nunca no Google
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return <MolduraPainel>{children}</MolduraPainel>;
}
