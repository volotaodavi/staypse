// Navegação entre as áreas do painel, para quem tem mais de um papel
// (ex.: produtor e revendedor). Com um papel só, não aparece.
// Fica num <Suspense> no layout: lê a sessão sem travar o resto da página.
import { AREAS, usuarioAtual } from "@/lib/papeis";
import { LinksAreas } from "./LinksAreas";

export async function NavPainel() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  const areas = AREAS.filter((a) => usuario.papeis.includes(a.papel)).map((a) => ({ caminho: a.caminho, titulo: a.titulo }));
  if (usuario.papeis.includes("admin")) areas.unshift({ caminho: "/admin", titulo: "Administração" });
  if (areas.length < 2) return null;
  return <LinksAreas areas={areas} />;
}
