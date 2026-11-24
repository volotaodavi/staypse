// Geocódigo de CEP para a entrega própria: BrasilAPI CEP v2 (gratuita), com cache na tabela cep_geo.
// Só o servidor chama (service_role). Sem coordenadas na resposta, guarda só cidade/bairro:
// a zona por km então cai para o preço fixo ou não vale (nunca inventamos distância).
import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const VALIDADE_DIAS = 180;

export async function garantirGeoCep(cepEntrada: string): Promise<void> {
  const cep = cepEntrada.replace(/\D/g, "");
  if (cep.length !== 8) return;
  const admin = criarClienteAdmin();
  const { data: atual } = await admin.from("cep_geo").select("atualizado_em").eq("cep", cep).maybeSingle();
  if (atual && Date.now() - new Date(atual.atualizado_em as string).getTime() < VALIDADE_DIAS * 86_400_000) return;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return;
    const d = (await r.json()) as {
      city?: string;
      state?: string;
      neighborhood?: string;
      street?: string;
      location?: { coordinates?: { latitude?: string | number; longitude?: string | number } };
    };
    const lat = Number(d.location?.coordinates?.latitude);
    const lng = Number(d.location?.coordinates?.longitude);
    const temCoord = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
    await admin.from("cep_geo").upsert({
      cep,
      cidade: d.city ?? null,
      uf: d.state?.toUpperCase() ?? null,
      bairro: d.neighborhood || null,
      rua: d.street || null,
      latitude: temCoord ? lat : null,
      longitude: temCoord ? lng : null,
      atualizado_em: new Date().toISOString(),
    });
  } catch {
    // BrasilAPI fora do ar: segue sem cache (a entrega própria só vale por faixa de CEP)
  }
}

// CEP do endereço comercial da loja (origem da distância)
export async function garantirGeoDaLoja(producerId: string): Promise<void> {
  const { data } = await criarClienteAdmin().from("producers").select("cep").eq("id", producerId).maybeSingle();
  if (data?.cep) await garantirGeoCep(data.cep as string);
}
