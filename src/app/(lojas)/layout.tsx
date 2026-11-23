// Lojas (/loja/...) e vitrines de afiliados (/@...): cada uma com a própria cara.
// O rodapé é discreto, mas continua com os dados legais (regra 3) e deixa
// claro quem processa o pagamento.
import type { Viewport } from "next";
import Link from "next/link";
import { AvisoCookies } from "@/components/AvisoCookies";
import { EMPRESA, contatoEmLinha } from "@/config/empresa";

// "cover" deixa a loja usar a área segura do aparelho (barra de compra e bordas)
export const viewport: Viewport = { themeColor: "#062c30", viewportFit: "cover" };

export default function LayoutLojas({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AvisoCookies />
      <div className="flex flex-1 flex-col bg-white pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-neutral-900">{children}</div>
      <footer className="border-t border-neutral-200 bg-white text-neutral-600">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs leading-relaxed">
          {/* regra de copy: quem processa o pagamento é a Lytex; a Staypse não recebe o dinheiro */}
          <p className="font-medium text-neutral-800">Pagamentos processados pela Lytex, loja na Staypse</p>
          <p>
            {EMPRESA.nomeEmpresarial}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}, {contatoEmLinha() || "contato pelo atendimento"}
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Informações legais">
            <Link href="/termos" className="inline-block py-1 underline">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="inline-block py-1 underline">
              Privacidade
            </Link>
            <Link href="/privacidade#canal-lgpd" className="inline-block py-1 underline">
              Seus dados (LGPD)
            </Link>
            <Link href="/cookies" className="inline-block py-1 underline">
              Cookies
            </Link>
            <Link href="/reembolso" className="inline-block py-1 underline">
              Reembolso e arrependimento
            </Link>
            <Link href="/pedido" className="inline-block py-1 underline">
              Meu pedido
            </Link>
            <Link href="/atendimento" className="inline-block py-1 underline">
              Atendimento
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
