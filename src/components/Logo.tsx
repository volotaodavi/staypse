// Logo oficial da Staypse. SEMPRE usa os SVGs de /public/brand — nunca
// redesenhar a logo em código.
//  - "principal": para fundos claros (branco/gelo)
//  - "negativo":  para fundos escuros (petróleo), com "yp" em ciano
/* eslint-disable @next/next/no-img-element -- SVG oficial servido como está, sem otimização */

type Props = {
  variante?: "principal" | "negativo";
  className?: string;
};

export function Logo({ variante = "principal", className = "h-8 w-auto" }: Props) {
  return (
    <img
      src={`/brand/staypse-logo-${variante}.svg`}
      alt="staypse"
      className={className}
      // altura fixa pela classe; largura proporcional ao SVG
      height={32}
    />
  );
}
