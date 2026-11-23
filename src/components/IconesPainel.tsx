// Ícones de linha do menu dos painéis: SVG inline, 24x24, traço 1.5, todos da
// mesma família (cor vem do texto: currentColor). Sem dependência.
import type { IconeNome } from "@/lib/menu-painel";

const D: Record<IconeNome, React.ReactNode> = {
  resumo: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  pedidos: <path d="M21 8l-9-5-9 5v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8" />,
  produtos: (
    <>
      <path d="M3 12V4h8l9 9-8 8-9-9Z" />
      <path d="M7.5 8.5h.01" />
    </>
  ),
  afiliados: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .6 3.5 2.3 3.5 5.2" />
    </>
  ),
  vendedores: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  recebimentos: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6" />,
  loja: <path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M10 20v-5h4v5" />,
  catalogo: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
  links: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  vitrine: <path d="M3 5h18v14H3V5Zm0 4.5h18M7 14h4" />,
  dados: <path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3Zm-3 9l2.2 2.2L15 10" />,
  denuncias: <path d="M5 21V4m0 0h12l-2 4 2 4H5" />,
  atendimentos: <path d="M4 5h16v11H9l-5 4V5Z" />,
  usuarios: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  lista: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  inscritos: <path d="M9 6h12M9 12h12M9 18h12M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />,
  auditoria: <path d="M7 3h8l4 4v14H7V3Zm8 0v4h4M10 12h6M10 16h6" />,
  erros: <path d="M12 3l10 18H2L12 3Zm0 7v5m0 3h.01" />,
  config: <path d="M4 7h9m4 0h3M4 17h3m4 0h9M15 4.5v5M9 14.5v5" />,
  mais: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} />,
};

export function Icone({ nome, className = "size-5" }: { nome: IconeNome; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {D[nome]}
    </svg>
  );
}
