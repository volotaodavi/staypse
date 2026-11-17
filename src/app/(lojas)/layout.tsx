// Lojas (/loja/...) e vitrines de afiliados (/@...): cada uma com a própria cara.
// O rodapé é discreto, mas continua com os dados legais (regra 3) e deixa
// claro quem processa o pagamento.
import Link from "next/link";
import { EMPRESA } from "@/config/empresa";

export default function LayoutLojas({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col bg-white text-neutral-900">{children}</div>
      <footer className="border-t border-neutral-200 bg-white text-neutral-600">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs leading-relaxed">
          <p className="font-medium text-neutral-800">Pagamento processado via Staypse</p>
          <p>
            {EMPRESA.nomeEmpresarial} · CNPJ {EMPRESA.cnpj} · {EMPRESA.endereco} · {EMPRESA.email} · {EMPRESA.whatsapp}
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Informações legais">
            <Link href="/termos" className="underline">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="underline">
              Privacidade
            </Link>
            <Link href="/privacidade#canal-lgpd" className="underline">
              Seus dados (LGPD)
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
