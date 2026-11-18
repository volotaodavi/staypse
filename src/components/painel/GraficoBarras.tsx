// Gráfico de barras de UMA série (ex.: vendas por dia). SVG desenhado no
// servidor, sem biblioteca: cor única da marca, barras finas com topo
// arredondado e 2px de respiro, grade discreta, valor ao passar o dedo/mouse
// (<title>) e uma tabela equivalente para leitores de tela.
export type Ponto = { rotulo: string; valor: number; detalhe: string };

const ALTURA = 160;
const MARGEM_ESQ = 32;
const MARGEM_BAIXO = 22;

export function GraficoBarras({
  titulo,
  pontos,
  formatar,
  vazio = "Sem vendas no período.",
}: {
  titulo: string;
  pontos: Ponto[];
  formatar: (n: number) => string;
  vazio?: string;
}) {
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  const largura = Math.max(320, pontos.length * 14 + MARGEM_ESQ);
  const passo = (largura - MARGEM_ESQ) / Math.max(1, pontos.length);
  const barra = Math.max(2, Math.min(24, passo - 2)); // 2px de respiro entre barras
  const area = ALTURA - MARGEM_BAIXO;
  // rótulos do eixo X: no máximo ~8, para não encavalar
  const cadaN = Math.ceil(pontos.length / 8);
  const total = pontos.reduce((s, p) => s + p.valor, 0);

  return (
    <figure className="flex flex-col gap-2 rounded-2xl bg-branco p-4">
      <figcaption className="text-sm font-medium">{titulo}</figcaption>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-petroleo/75">{vazio}</p>
      ) : (
        <svg viewBox={`0 0 ${largura} ${ALTURA}`} className="h-44 w-full" role="img" aria-label={`${titulo}: total ${formatar(total)}`} preserveAspectRatio="none">
          {/* grade discreta: base e topo */}
          <line x1={MARGEM_ESQ} x2={largura} y1={area} y2={area} stroke="currentColor" strokeOpacity={0.25} />
          <line x1={MARGEM_ESQ} x2={largura} y1={8} y2={8} stroke="currentColor" strokeOpacity={0.08} />
          <text x={MARGEM_ESQ - 6} y={12} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.7}>
            {formatar(max)}
          </text>
          <text x={MARGEM_ESQ - 6} y={area} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.7}>
            0
          </text>
          {pontos.map((p, i) => {
            const h = p.valor === 0 ? 0 : Math.max(3, (p.valor / max) * (area - 8));
            const x = MARGEM_ESQ + i * passo + (passo - barra) / 2;
            return (
              <g key={p.rotulo + i}>
                {/* alvo de toque maior que a barra */}
                <rect x={MARGEM_ESQ + i * passo} y={0} width={passo} height={area} fill="transparent">
                  <title>{p.detalhe}</title>
                </rect>
                {h > 0 && (
                  <path
                    d={`M${x},${area} v${-(h - 4)} q0,-4 4,-4 h${barra - 8} q4,0 4,4 v${h - 4} z`}
                    className="fill-petroleo"
                    pointerEvents="none"
                  />
                )}
                {i % cadaN === 0 && (
                  <text x={x + barra / 2} y={ALTURA - 6} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.7}>
                    {p.rotulo}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <details className="text-sm">
        <summary className="inline-block cursor-pointer py-1 text-petroleo/80 underline">Ver em tabela</summary>
        <table className="mt-2 w-full">
          <caption className="sr-only">{titulo}</caption>
          <tbody>
            {pontos.map((p, i) => (
              <tr key={p.rotulo + i} className="border-t border-petroleo/10">
                <th scope="row" className="py-1 text-left font-normal">
                  {p.rotulo}
                </th>
                <td className="py-1 text-right tabular-nums">{p.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
