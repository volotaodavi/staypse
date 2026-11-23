// Admin: lista de espera em números — total, crescimento por dia, por perfil,
// quem mais indicou (?ref=) e CSV. Os inscritos em si ficam em /admin/lista.
import Link from "next/link";
import { FiltroPeriodo, LinkCsv } from "@/components/painel/FiltroPeriodo";
import { GraficoBarras } from "@/components/painel/GraficoBarras";
import { Numeros, inteiro, percentual } from "@/components/painel/Numeros";
import { TabelaDados } from "@/components/painel/TabelaDados";
import { exigirPapel } from "@/lib/papeis";
import { diaCurto, formatarDia, lerPeriodo } from "@/lib/periodo";
import { ROTULO_PERFIL, buscarResumo } from "./resumo";

export const metadata = { title: "Lista de espera: números" };
export const instant = false;

export default async function AdminListaEspera({ searchParams }: PageProps<"/admin/lista-espera">) {
  await exigirPapel("admin");
  const periodo = lerPeriodo(await searchParams);
  const r = await buscarResumo(periodo);

  const pontos = r.por_dia.map((d) => ({
    rotulo: diaCurto(d.dia),
    valor: d.total,
    detalhe: `${formatarDia(d.dia)}: ${inteiro(d.total)} ${d.total === 1 ? "inscrito" : "inscritos"}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" className="inline-block w-fit py-2 text-sm underline">
        ← Admin
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">Lista de espera</h1>
        <Link href="/admin/lista" className="inline-flex min-h-11 items-center text-sm underline">
          Ver os inscritos →
        </Link>
      </div>

      <Numeros
        itens={[
          { rotulo: "Total de inscritos", valor: inteiro(r.total), destaque: true },
          { rotulo: "No período", valor: inteiro(r.no_periodo), nota: percentual(r.no_periodo, r.total) + " do total" },
          ...r.por_perfil.map((p) => ({ rotulo: ROTULO_PERFIL[p.perfil] ?? p.perfil, valor: inteiro(p.total), nota: percentual(p.total, r.total) })),
        ]}
      />

      <FiltroPeriodo periodo={periodo} caminho="/admin/lista-espera" />
      <GraficoBarras
        titulo="Novos inscritos por dia"
        pontos={pontos}
        formatar={inteiro}
        vazio="Ninguém se inscreveu neste período."
      />
      <LinkCsv caminho="/admin/lista-espera/csv" periodo={periodo}>
        Baixar CSV (inscritos por dia e por perfil)
      </LinkCsv>

      <h2 className="text-xl">Quem mais indicou</h2>
      <p className="text-sm text-petroleo/80">Só contam indicações de outro aparelho (o código vai em ?ref= no link).</p>
      <TabelaDados
        legenda="Quem mais indicou"
        colunas={[
          { titulo: "Nome", principal: true },
          { titulo: "Perfil" },
          { titulo: "Código (ref)" },
          { titulo: "Indicações", numero: true },
        ]}
        linhas={r.top_indicadores.map((t) => ({
          chave: t.codigo,
          celulas: [t.nome ?? "—", ROTULO_PERFIL[t.perfil] ?? t.perfil, t.codigo, inteiro(t.indicacoes)],
        }))}
        vazio={{ texto: "Ainda não há indicações válidas." }}
      />
    </div>
  );
}
