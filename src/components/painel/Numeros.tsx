// Cards de número dos painéis: rótulo pequeno, número grande, nota opcional.
// Fundo branco sobre o gelo; a cor da marca fica para ações e destaques.
export type Numero = { rotulo: string; valor: string; nota?: string; destaque?: boolean };

export function Numeros({ itens }: { itens: Numero[] }) {
  // O número em destaque ocupa a linha toda no celular e uma coluna no
  // computador; quando sobra vão na última linha, o último card o preenche.
  const outros = itens.filter((n) => !n.destaque).length;
  const temDestaque = outros < itens.length;
  const sobraCelular = outros % 2 === 1;
  const sobraComputador = itens.length % 3;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
      {itens.map((n, i) => {
        const ultimo = i === itens.length - 1;
        const span = [
          n.destaque ? "col-span-2 lg:col-span-1" : "",
          ultimo && !n.destaque && temDestaque && sobraCelular ? "max-lg:col-span-2" : "",
          ultimo && sobraComputador === 2 ? "lg:col-span-2" : "",
          ultimo && sobraComputador === 1 ? "lg:col-span-3" : "",
        ].join(" ");
        return (
          <div
            key={n.rotulo}
            className={`flex flex-col rounded-2xl p-4 lg:p-5 ${span} ${
              n.destaque ? "bg-petroleo text-branco" : "border border-petroleo/10 bg-branco"
            }`}
          >
            <dt className={`mb-3 text-sm ${n.destaque ? "text-gelo/85" : "text-petroleo/75"}`}>{n.rotulo}</dt>
            <dd className={`mt-auto font-semibold tabular-nums ${n.destaque ? "text-4xl lg:text-5xl" : "text-2xl lg:text-3xl"}`}>{n.valor}</dd>
            {n.nota && <dd className={`mt-1 text-sm ${n.destaque ? "text-gelo/85" : "text-petroleo/75"}`}>{n.nota}</dd>}
          </div>
        );
      })}
    </dl>
  );
}

// Nota obrigatória sobre dinheiro (a Staypse nunca guarda valores)
export function NotaPagamentos() {
  return <p className="max-w-prose text-sm text-petroleo/75">Pagamentos processados pela Lytex: cada parte recebe direto pelo split, sem passar pela Staypse.</p>;
}

// "1.234" / "12,5%"
export const inteiro = (n: number) => n.toLocaleString("pt-BR");
export const percentual = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
