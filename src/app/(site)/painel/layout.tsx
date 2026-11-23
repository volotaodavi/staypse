// Moldura de todas as páginas do painel (área logada).
import { MolduraPainel } from "@/components/MolduraPainel";

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return <MolduraPainel>{children}</MolduraPainel>;
}
