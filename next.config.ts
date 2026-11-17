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
