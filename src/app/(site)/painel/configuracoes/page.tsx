// Configurações da própria conta (todos os papéis): contato e avisos por e-mail.
// As configurações da PLATAFORMA ficam em /admin/configuracoes (só admin).
import { exigirPapel } from "@/lib/papeis";
import { CAMPOS_EMAIL, PREFERENCIAS_PADRAO, camposDoPapel } from "@/lib/preferencias-notificacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { FormConta } from "./FormConta";

export const metadata = { title: "Configurações" };
export const instant = false;

// o que está gravado (sem linha salva = tudo ligado)
async function lerPreferencias(userId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("preferencias_notificacao")
    .select(CAMPOS_EMAIL.map((c) => c.campo).join(", "))
    .eq("user_id", userId)
    .maybeSingle();
  return { ...PREFERENCIAS_PADRAO, ...((data as Partial<typeof PREFERENCIAS_PADRAO> | null) ?? {}) };
}

export default async function Configuracoes() {
  const usuario = await exigirPapel();
  const supabase = await criarClienteServidor();
  const [{ data: perfil }, prefs] = await Promise.all([
    supabase.from("profiles").select("nome, telefone").eq("id", usuario.id).maybeSingle(),
    lerPreferencias(usuario.id),
  ]);
  const avisos = camposDoPapel(usuario.papeis).map((c) => ({ campo: c.campo, rotulo: c.rotulo, descricao: c.descricao, ligado: prefs[c.campo] }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-3xl">Configurações</h1>
        <p className="mt-1 text-petroleo/80">Seus dados de contato e quais avisos chegam por e-mail.</p>
      </div>
      <FormConta nome={perfil?.nome ?? usuario.nome} telefone={perfil?.telefone ?? ""} email={usuario.email} avisos={avisos} />
    </div>
  );
}
