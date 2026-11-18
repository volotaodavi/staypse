// Cards de número dos painéis: rótulo pequeno, número grande, nota opcional.
// Fundo branco sobre o gelo; a cor da marca fica para ações e destaques.
export type Numero = { rotulo: string; valor: string; nota?: string; destaque?: boolean };

export function Numeros({ itens }: { itens: Numero[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {itens.map((n) => (
        <div key={n.rotulo} className={`flex flex-col gap-1 rounded-2xl p-4 ${n.destaque ? "bg-petroleo text-branco" : "bg-branco"}`}>
          <dt className={`text-sm ${n.destaque ? "text-gelo/85" : "text-petroleo/75"}`}>{n.rotulo}</dt>
          <dd className="text-3xl font-extrabold tabular-nums">{n.valor}</dd>
          {n.nota && <dd className={`text-sm ${n.destaque ? "text-gelo/85" : "text-petroleo/75"}`}>{n.nota}</dd>}
        </div>
      ))}
    </dl>
  );
}

// Nota obrigatória sobre dinheiro (a Staypse nunca guarda valores)
export function NotaPagamentos() {
  return <p className="text-sm text-petroleo/75">Pagamentos processados pela Lytex: cada parte recebe direto pelo split, sem passar pela Staypse.</p>;
}

// "1.234" / "12,5%"
export const inteiro = (n: number) => n.toLocaleString("pt-BR");
export const percentual = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
