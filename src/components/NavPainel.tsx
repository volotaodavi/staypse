// Menu do painel: barra lateral (computador) e barra de baixo (celular) com as
// seções da área da pessoa. Quem tem 2+ papéis troca de área pelo próprio menu.
// Fica num <Suspense> no layout: lê a sessão sem travar o resto da página.
import { usuarioAtual } from "@/lib/papeis";
import { AREAS_MENU } from "@/lib/menu-painel";
import { MenuPainel } from "./MenuPainel";

export async function NavPainel() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  // só as áreas dos papéis da pessoa (papéis vêm do banco, nunca do navegador)
  const chaves = AREAS_MENU.filter((a) => usuario.papeis.includes(a.papel)).map((a) => a.chave);
  // quem ainda não tem papel (ex.: /painel/comecar) só enxerga "Meus dados" pelo cabeçalho do painel
  if (chaves.length === 0) return null;
  return <MenuPainel chaves={chaves} />;
}
