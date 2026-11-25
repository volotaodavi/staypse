// Rodapé legal, regra de conformidade 3.
// Mostra nome empresarial, CNPJ, endereço e contatos lidos de
// src/config/empresa.ts (para trocar os dados, edite só aquele arquivo).
import Link from "next/link";
import { EMPRESA, contatoEmLinha } from "@/config/empresa";
import { Logo } from "./Logo";

export function Rodape() {
  return (
    <footer className="bg-petroleo text-gelo">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-3">
          <Logo variante="negativo" className="h-7 w-auto self-start" />
          <address className="text-sm not-italic leading-relaxed text-gelo/80">
            <strong className="font-medium text-gelo">{EMPRESA.nomeEmpresarial}</strong>
            <br />
            CNPJ {EMPRESA.cnpj}
            <br />
            {EMPRESA.endereco}
            <br />
            {contatoEmLinha() || (
              <Link href="/atendimento" className="underline hover:text-ciano">
                Fale conosco pelo atendimento
              </Link>
            )}
          </address>
          {/* Instagram oficial: só o ícone, com nome acessível */}
          <a
            href="https://www.instagram.com/staypse/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram da Staypse"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gelo/30 hover:border-ciano hover:text-ciano"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>

        <nav aria-label="Informações legais" className="flex flex-col gap-2 text-sm">
          <Link href="/atendimento" className="inline-flex min-h-11 items-center hover:text-ciano">
            Atendimento
          </Link>
          <Link href="/pedido" className="inline-flex min-h-11 items-center hover:text-ciano">
            Meu pedido
          </Link>
          <Link href="/reembolso" className="inline-flex min-h-11 items-center hover:text-ciano">
            Reembolso e arrependimento
          </Link>
          <Link href="/taxas" className="inline-flex min-h-11 items-center hover:text-ciano">
            Taxas
          </Link>
          <Link href="/termos" className="inline-flex min-h-11 items-center hover:text-ciano">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="inline-flex min-h-11 items-center hover:text-ciano">
            Política de privacidade
          </Link>
          <Link href="/privacidade#canal-lgpd" className="inline-flex min-h-11 items-center hover:text-ciano">
            Canal de privacidade (LGPD)
          </Link>
          <Link href="/cookies" className="inline-flex min-h-11 items-center hover:text-ciano">
            Política de cookies
          </Link>
          <Link href="/produtos-proibidos" className="inline-flex min-h-11 items-center hover:text-ciano">
            Produtos proibidos
          </Link>
        </nav>
      </div>
      <p className="border-t border-gelo/10 px-4 py-4 text-center text-xs text-gelo/60">
        A Staypse não recebe nem guarda o dinheiro das vendas: o pagamento é processado e
        dividido diretamente pela instituição de pagamento parceira.
      </p>
    </footer>
  );
}
