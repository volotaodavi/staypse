// Registro de acesso à aplicação (Marco Civil da Internet, Lei 12.965/2014, art. 15):
// IP, data e hora do login, do cadastro, do link de e-mail e da criação de pedido.
// Guardado 6 meses na tabela registros_acesso e apagado pela limpeza diária.
// Melhor esforço: nunca derruba a ação da pessoa se o registro falhar.
// O IP puro só existe aqui (e é lido só pelo admin, para ordem judicial);
// em todos os outros lugares o IP vira hash (src/lib/ip.ts).
import "server-only";
import { headers } from "next/headers";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type EventoAcesso = "login" | "cadastro" | "link_email" | "pedido";

export async function registrarAcesso(evento: EventoAcesso, userId?: string | null): Promise<void> {
  try {
    if (!process.env.SUPABASE_SECRET_KEY) return;
    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido").slice(0, 64);
    const { error } = await criarClienteAdmin()
      .from("registros_acesso")
      .insert({ evento, user_id: userId ?? null, ip });
    if (error) console.error("registrarAcesso:", error.code);
  } catch {
    // o registro nunca pode impedir o login, o cadastro ou a compra
  }
}
