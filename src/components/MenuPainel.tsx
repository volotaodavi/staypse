"use client";
// Menu dos painéis. No computador (>= 1024px): barra lateral fixa com as seções
// da área atual. No celular: barra fixa embaixo com até 4 seções + "Mais".
// O item atual leva aria-current="page" (leitor de tela diz "página atual").
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Icone } from "./IconesPainel";
import { AREAS_MENU, areaAtual, itemAtivo, itensDaConta, type AreaMenu, type ItemMenu } from "@/lib/menu-painel";

export function MenuPainel({ chaves }: { chaves: string[] }) {
  const caminho = usePathname();
  const areas = AREAS_MENU.filter((a) => chaves.includes(a.chave));
  if (areas.length === 0) return null;
  const area = areaAtual(caminho, areas);
  const conta = itensDaConta(area.chave);
  // a seção da área vale primeiro; senão, uma das páginas da conta (Configurações, Meus dados, Notificações)
  const ativo = itemAtivo(caminho, area.itens) ?? conta.find((i) => caminho === i.href || caminho.startsWith(`${i.href}/`))?.href ?? null;
  return (
    <>
      <BarraLateral area={area} areas={areas} ativo={ativo} />
      <BarraInferior area={area} areas={areas} ativo={ativo} />
    </>
  );
}

// ---------- computador ----------

function LinkLateral({ item, ativo }: { item: ItemMenu; ativo: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
        ativo ? "bg-gelo font-medium text-petroleo" : "text-petroleo/80 hover:bg-gelo/70 hover:text-petroleo"
      }`}
    >
      {/* marca da seção atual: barra ciano (só decoração, o texto segue petróleo) */}
      {ativo && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-ciano" />}
      <Icone nome={item.icone} />
      {item.rotulo}
    </Link>
  );
}

function BarraLateral({ area, areas, ativo }: { area: AreaMenu; areas: AreaMenu[]; ativo: string | null }) {
  // seções agrupadas (admin) mantêm a ordem em que aparecem
  const grupos: { nome: string | null; itens: ItemMenu[] }[] = [];
  for (const i of area.itens) {
    const nome = i.grupo ?? null;
    const g = grupos.at(-1);
    if (g && g.nome === nome) g.itens.push(i);
    else grupos.push({ nome, itens: [i] });
  }
  return (
    <aside className="sticky top-[4.3125rem] hidden h-[calc(100dvh-4.3125rem)] w-64 shrink-0 flex-col gap-6 self-start overflow-y-auto border-r border-petroleo/10 bg-branco px-4 py-6 lg:flex">
      {areas.length > 1 ? (
        <nav aria-label="Trocar de área">
          <ul className="flex gap-1 rounded-xl bg-gelo p-1">
            {areas.map((a) => (
              <li key={a.chave} className="min-w-0 flex-1">
                <Link
                  href={a.caminho}
                  aria-current={a.chave === area.chave ? "true" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-sm transition-colors ${
                    a.chave === area.chave ? "bg-petroleo font-medium text-branco" : "text-petroleo/80 hover:text-petroleo"
                  }`}
                >
                  {a.titulo === "Administração" ? "Admin" : a.titulo === "Vendedor da loja" ? "Vendedor" : a.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <p className="px-3 text-sm text-petroleo/75">{area.titulo}</p>
      )}

      <nav aria-label={`Seções: ${area.titulo}`} className="flex flex-1 flex-col gap-6">
        {grupos.map((g, n) => (
          <div key={g.nome ?? n} className="flex flex-col gap-1">
            {g.nome && <p className="px-3 pb-1 text-xs font-medium text-petroleo/75">{g.nome}</p>}
            <ul className="flex flex-col gap-0.5">
              {g.itens.map((i) => (
                <li key={i.href}>
                  <LinkLateral item={i} ativo={ativo === i.href} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <nav aria-label="Conta" className="border-t border-petroleo/10 pt-3">
        <ul className="flex flex-col gap-0.5">
          {itensDaConta(area.chave).map((i) => (
            <li key={i.href}>
              <LinkLateral item={i} ativo={ativo === i.href} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// ---------- celular ----------

function BarraInferior({ area, areas, ativo }: { area: AreaMenu; areas: AreaMenu[]; ativo: string | null }) {
  const caminho = usePathname();
  // guarda em qual página o "Mais" foi aberto: ao navegar ele fecha sozinho
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === caminho;
  const setAberto = (v: boolean | ((a: boolean) => boolean)) => setAbertoEm((typeof v === "function" ? v(aberto) : v) ? caminho : null);
  const idPainel = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  const todos = [...area.itens, ...itensDaConta(area.chave)];
  // cabe tudo? (até 5 e sem troca de área) senão: 4 itens + "Mais"
  const cabe = todos.length <= 5 && areas.length === 1;
  const barra = cabe ? todos : todos.slice(0, 4);
  const resto = cabe ? [] : todos.slice(4);
  const atualNoResto = resto.some((i) => i.href === ativo);

  // Esc fecha e devolve o foco ao botão
  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "Escape" && aberto) {
      setAberto(false);
      botao.current?.focus();
    }
  }

  const classeItem = (a: boolean) =>
    `relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs transition-colors ${
      a ? "font-medium text-petroleo" : "text-petroleo/75 hover:text-petroleo"
    }`;
  const marca = (a: boolean) => (a ? <span aria-hidden="true" className="absolute inset-x-4 top-0 h-1 rounded-b-full bg-ciano" /> : null);

  return (
    <div
      data-barra-painel
      onKeyDown={aoTeclar}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col-reverse lg:hidden"
      // sair do menu com o Tab fecha o "Mais"
      onBlur={(e) => {
        if (aberto && !caixa.current?.contains(e.relatedTarget as Node | null)) setAberto(false);
      }}
      ref={caixa}
    >
      <nav aria-label={`Seções: ${area.titulo}`} className="border-t border-petroleo/10 bg-branco pb-[env(safe-area-inset-bottom)]">
        <ul
          className="mx-auto grid max-w-xl"
          style={{
            gridTemplateColumns: `repeat(${barra.length + (resto.length || areas.length > 1 ? 1 : 0)}, minmax(0, 1fr))`,
          }}
        >
          {barra.map((i) => {
            const a = ativo === i.href;
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={a ? "page" : undefined} className={classeItem(a)}>
                  {marca(a)}
                  <Icone nome={i.icone} />
                  <span className="max-w-full truncate">{i.curto ?? i.rotulo}</span>
                </Link>
              </li>
            );
          })}
          {(resto.length > 0 || areas.length > 1) && (
            <li>
              <button
                ref={botao}
                type="button"
                aria-expanded={aberto}
                aria-controls={aberto ? idPainel : undefined}
                onClick={() => setAberto((v) => !v)}
                className={`${classeItem(atualNoResto)} w-full`}
              >
                {marca(atualNoResto)}
                <Icone nome="mais" />
                <span>Mais</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
      {/* depois da barra no HTML (o Tab entra nele ao sair do "Mais"); aparece acima dela por flex-col-reverse */}
      {aberto && (
        <>
          <div aria-hidden="true" className="fixed inset-0 -z-10 bg-petroleo/30" onClick={() => setAberto(false)} />
          <div id={idPainel} className="mx-3 mb-2 rounded-2xl border border-petroleo/10 bg-branco p-2 shadow-lg shadow-petroleo/10">
            {areas.length > 1 && (
              <nav aria-label="Trocar de área" className="mb-1 border-b border-petroleo/10 pb-2">
                <p className="px-3 pb-1 pt-2 text-xs text-petroleo/75">Área</p>
                <ul>
                  {areas.map((a) => (
                    <li key={a.chave}>
                      <Link
                        href={a.caminho}
                        aria-current={a.chave === area.chave ? "true" : undefined}
                        className={`flex min-h-11 items-center justify-between rounded-lg px-3 text-sm ${
                          a.chave === area.chave ? "bg-gelo font-medium" : "hover:bg-gelo/70"
                        }`}
                      >
                        {a.titulo}
                        {a.chave === area.chave && <span className="text-xs text-petroleo/75">Atual</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <ul>
              {resto.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={ativo === i.href ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${
                      ativo === i.href ? "bg-gelo font-medium" : "hover:bg-gelo/70"
                    }`}
                  >
                    <Icone nome={i.icone} />
                    {i.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
