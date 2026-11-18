// Navegação do painel: as áreas da pessoa (produtor, revendedor...) e
// "Meus dados" (LGPD), sempre à mão para quem está logado.
// Fica num <Suspense> no layout: lê a sessão sem travar o resto da página.
import { AREAS, usuarioAtual } from "@/lib/papeis";
import { LinksAreas } from "./LinksAreas";

export async function NavPainel() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const areas = AREAS.filter((a) => usuario.papeis.includes(a.papel)).map((a) => ({ caminho: a.caminho, titulo: a.titulo }));
  if (usuario.papeis.includes("admin")) areas.unshift({ caminho: "/admin", titulo: "Administração" });
  // com uma área só, o atalho dela fica junto de "Meus dados"
  areas.push({ caminho: "/painel/meus-dados", titulo: "Meus dados" });
  return <LinksAreas areas={areas} />;
}
