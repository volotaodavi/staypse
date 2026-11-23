// Moldura da área administrativa (mesmo menu lateral / barra de baixo do painel).
import { MolduraPainel } from "@/components/MolduraPainel";

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return <MolduraPainel>{children}</MolduraPainel>;
}
