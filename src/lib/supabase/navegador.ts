"use client";
// Cliente do Supabase para o NAVEGADOR. Usado só para enviar arquivos
// (fotos, documentos, arquivos digitais) direto ao storage, sem passar pelo
// servidor do site. A sessão vem do cookie; as regras do storage garantem que
// cada pessoa só grave na própria pasta.
import { createBrowserClient } from "@supabase/ssr";

export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
