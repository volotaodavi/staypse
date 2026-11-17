// Peças das páginas públicas (vitrine, loja e produto). Rodam no servidor.
import Image from "next/image";
import Link from "next/link";
import { formatarPreco, urlFoto } from "@/lib/produtor";
import type { LinkExterno } from "@/lib/publico";
import { supabaseUrl } from "@/lib/supabase/env";
import { PLATAFORMAS } from "@/lib/vitrine";
import { LinkRastreado } from "./rastreio";

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
    return <div className="flex aspect-square w-full items-center justify-center bg-gelo text-sm text-petroleo/50">Sem foto</div>;
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gelo">
      <Image src={urlFoto(supabaseUrl(), caminho)} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
    </div>
  );
}

// ---------- cartão de um item vendido pela Staypse ----------
// Selo obrigatório: quem vende é o PRODUTOR; a Staypse só cuida do pagamento
// (com split). Nunca escrever "vendido pela Staypse".
export function CartaoItem({
  href,
  nome,
  foto,
  precoCentavos,
  produtorNome,
  prioridade,
}: {
  href: string;
  nome: string;
  foto?: string;
  precoCentavos: number;
  produtorNome?: string;
  prioridade?: boolean;
}) {
  return (
    <Link href={href} className="group flex w-full flex-col overflow-hidden rounded-2xl bg-branco ring-1 ring-petroleo/10 transition hover:ring-petroleo/30">
      <FotoItem caminho={foto} alt={nome} prioridade={prioridade} />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">{nome}</p>
        <p className="text-base font-extrabold">{formatarPreco(precoCentavos)}</p>
        {produtorNome && (
          <p className="mt-auto pt-1 text-[11px] leading-tight text-petroleo/70">
            Vendido por {produtorNome} · pagamento pela Staypse
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------- cartão de indicação externa (Shopee, Mercado Livre, TikTok Shop) ----------
// O href é EXATAMENTE o link colado pelo revendedor (sem encurtar ou reescrever).
export function CartaoLink({ link, vitrine }: { link: LinkExterno; vitrine: string }) {
  return (
    <LinkRastreado
      href={link.url}
      vitrine={vitrine}
      linkId={link.id}
      className="group flex items-center gap-3 rounded-2xl bg-branco p-3 ring-1 ring-petroleo/10 transition hover:ring-petroleo/30"
    >
      {link.imagem_url ? (
        // imagem de outro site: <img> simples (não passa pelo otimizador do Next)
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={link.imagem_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-20 w-20 shrink-0 rounded-xl bg-gelo object-cover"
        />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gelo text-xs font-medium text-petroleo/60">
          {PLATAFORMAS[link.plataforma] ?? "Link"}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">{link.titulo}</span>
        {link.preco_centavos != null && <span className="text-sm font-extrabold">{formatarPreco(link.preco_centavos)}</span>}
        <span className="text-[11px] leading-tight text-petroleo/70">
          Publicidade · a compra acontece em outro site ({PLATAFORMAS[link.plataforma] ?? "outro site"})
        </span>
      </span>
    </LinkRastreado>
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
