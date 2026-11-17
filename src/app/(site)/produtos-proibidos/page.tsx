// Lista pública de produtos proibidos na Staypse.
// O cadastro de itens tem um alerta automático por palavras-chave que marca
// o item para revisão manual (a lista de termos fica no banco).
import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: "Produtos proibidos",
  description: "O que não pode ser vendido na Staypse.",
};

const PROIBIDOS = [
  ["Medicamentos e suplementos sem registro", "Remédios, medicamentos controlados, anabolizantes e suplementos que exigem registro ou notificação na Anvisa e não os têm."],
  ["Réplicas e falsificações", "Cópias de marcas, produtos \"primeira linha\" que imitam marca registrada e qualquer item falsificado."],
  ["Armas e munições", "Armas de fogo, simulacros, munições, acessórios de armas e armas brancas proibidas."],
  ["Conteúdo adulto", "Produtos ou conteúdos eróticos e pornográficos."],
  ["Apostas e jogos de azar", "Bets, cassinos, rifas e sorteios sem autorização, \"jogo do bicho\" e afins."],
  ["\"Enriquecimento rápido\"", "Promessas de renda garantida, dinheiro fácil, esquemas de pirâmide ou de ganho por recrutamento."],
  ["Itens que exigem licença, sem comprovação", "Agrotóxicos, fogos de artifício e produtos que dependem de receita ou de licença específica, sem a documentação."],
] as const;

export default function ProdutosProibidos() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl">Produtos proibidos</h1>
        <p className="mt-2 text-petroleo/80">
          Estes produtos não podem ser cadastrados nem vendidos na Staypse. Todo item passa por análise antes
          de aparecer para revendedores, e itens com termos suspeitos são revisados com mais atenção.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {PROIBIDOS.map(([titulo, texto]) => (
            <li key={titulo} className="rounded-2xl bg-gelo p-5">
              <h2 className="text-lg">{titulo}</h2>
              <p className="mt-1 text-petroleo/80">{texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-petroleo/70">
          Encontrou algo que não deveria estar aqui? Fale com a gente pelos contatos no rodapé.
        </p>
      </main>
    </>
  );
}
