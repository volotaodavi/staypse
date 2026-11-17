// Páginas da própria Staypse (início, painel, admin, termos...).
// Regra de conformidade 3: rodapé legal em TODAS as páginas.
import { Rodape } from "@/components/Rodape";

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <Rodape />
    </>
  );
}
