import type { NextConfig } from "next";

// Fotos dos itens/lojas vêm do Storage público do Supabase (bucket fotos-itens).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: supabase ? [new URL(`${supabase}/storage/v1/object/public/**`)] : [],
    // Só liga quando o Supabase é o LOCAL (127.0.0.1 no computador); na Vercel fica desligado.
    dangerouslyAllowLocalIP: /^http:\/\/(127\.0\.0\.1|localhost)/.test(supabase ?? ""),
  },
  partialPrefetching: true,
  // não anuncia "X-Powered-By: Next.js"
  poweredByHeader: false,
  // Endereços antigos dos painéis (Etapa 5: um painel por papel)
  async redirects() {
    return [
      { source: "/painel/produtor/pedidos", destination: "/painel/loja/pedidos", permanent: true },
      { source: "/painel/produtor/afiliados", destination: "/painel/loja/afiliados", permanent: true },
      { source: "/painel/revendedor", destination: "/painel/afiliado", permanent: true },
    ];
  },
  // Cabeçalhos de segurança em todas as páginas
  headers() {
    const seguranca = [
      // o site não pode ser aberto dentro de outro (evita clique enganoso e "cookie stuffing")
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { key: "X-Frame-Options", value: "DENY" },
      // o navegador não "adivinha" o tipo dos arquivos
      { key: "X-Content-Type-Options", value: "nosniff" },
      // outros sites só ficam sabendo de onde a pessoa veio (o domínio), não a página
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // recursos do aparelho que o site não usa ficam desligados
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:caminho*", headers: seguranca },
      // o link do convite tem um código secreto: nunca é enviado a outros sites
      { source: "/convite/:token", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      // o convite de afiliação por produto também leva um código secreto
      { source: "/afiliar/:token", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      // o link do pedido e do atendimento também levam um código secreto (?t=...)
      { source: "/pedido/:codigo", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/atendimento/:protocolo", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
