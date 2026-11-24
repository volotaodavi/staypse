// Peças das páginas públicas (vitrine, loja e produto). Rodam no servidor.
import Image from "next/image";
import { urlFoto } from "@/lib/produtor";
import { supabaseUrl } from "@/lib/supabase/env";

// ---------- foto do item (next/image: tamanho certo para cada tela) ----------
export function FotoItem({
  caminho,
  alt,
  prioridade = false,
  sizes = "(min-width: 768px) 33vw, 50vw",
}: {
  caminho: string | undefined;
  alt: string;
  prioridade?: boolean;
  sizes?: string;
}) {
  if (!caminho) {
    return <div className="flex aspect-square w-full items-center justify-center bg-gelo text-sm text-petroleo/75">Sem foto</div>;
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gelo">
      <Image src={urlFoto(supabaseUrl(), caminho)} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
    </div>
  );
}

// ---------- compartilhar no WhatsApp ----------
export function linkWhatsapp(texto: string) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export function BotaoWhatsapp({ texto, rotulo = "Compartilhar no WhatsApp", className }: { texto: string; rotulo?: string; className?: string }) {
  return (
    <a
      href={linkWhatsapp(texto)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-full bg-petroleo px-5 py-3 text-sm font-medium text-branco hover:bg-petroleo/90"
      }
    >
      <IconeWhatsapp />
      {rotulo}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

export function IconeWhatsapp({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
    </svg>
  );
}
