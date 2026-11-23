// Lista pública de produtos proibidos na Staypse.
// O cadastro de itens tem um alerta automático por palavras-chave que marca
// o item para revisão manual (a lista de termos fica no banco).
import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: "Produtos proibidos",
  description: "O que não pode ser vendido nem indicado na Staypse.",
};

// [categoria, o que inclui, por quê]
const PROIBIDOS: [string, string, string][] = [
  ["Medicamentos e produtos de saúde irregulares", "Remédios (inclusive os de venda livre), anabolizantes, produtos que prometem cura ou tratamento e suplementos sem registro ou notificação na Anvisa.", "Lei 6.360/1976 e normas da Anvisa"],
  ["Cigarros eletrônicos e acessórios", "Vapes, pods, refis, essências e peças de dispositivos eletrônicos para fumar.", "Proibidos pela Anvisa (RDC 855/2024)"],
  ["Tabaco e bebidas alcoólicas", "Cigarros, charutos, fumo e bebidas alcoólicas.", "Exigem controle de idade que a plataforma ainda não oferece (ECA, art. 243)"],
  ["Réplicas e falsificações", "Cópias de marcas, produtos \"primeira linha\" que imitam marca registrada e itens falsificados.", "Lei de Propriedade Industrial (Lei 9.279/1996)"],
  ["Armas, munições e simulacros", "Armas de fogo, peças, munições, réplicas e simulacros, armas de pressão de uso restrito e armas brancas proibidas.", "Estatuto do Desarmamento (Lei 10.826/2003)"],
  ["Conteúdo adulto", "Produtos e conteúdos eróticos ou pornográficos.", "Política da Staypse"],
  ["Apostas, rifas e sorteios", "Apostas e jogos de azar sem autorização federal, rifas, \"bolões\" e sorteios sem autorização.", "Lei 14.790/2023 e Lei 5.768/1971"],
  ["\"Enriquecimento rápido\" e pirâmides", "Promessas de renda garantida ou dinheiro fácil, esquemas de ganho por recrutamento e cursos que prometem lucro certo.", "Lei 1.521/1951, art. 2º, IX, e CDC (publicidade enganosa)"],
  ["Animais e fauna silvestre", "Animais vivos e produtos ou partes de animais silvestres.", "Lei de Crimes Ambientais (Lei 9.605/1998)"],
  ["Alimentos de origem animal sem inspeção", "Carnes, laticínios, ovos, mel e embutidos sem selo de inspeção (SIF, SIE ou SIM).", "Lei 1.283/1950 e normas sanitárias"],
  ["Produtos sem certificação obrigatória", "Brinquedos, carregadores, capacetes e outros itens que exigem certificação do Inmetro e não a têm.", "Normas do Inmetro"],
  ["Itens que exigem licença, sem comprovação", "Agrotóxicos, fogos de artifício, produtos controlados e serviços de profissões regulamentadas sem a devida habilitação.", "Legislação específica de cada setor"],
  ["Dados, contas e software pirata", "Listas de contatos ou dados pessoais, contas e acessos de terceiros, cópias não autorizadas de cursos, livros, filmes e programas.", "LGPD (Lei 13.709/2018) e Lei de Direitos Autorais (Lei 9.610/1998)"],
  ["Documentos e equipamentos para fraude", "Documentos falsos, equipamentos de clonagem, espionagem ou para burlar sistemas.", "Código Penal"],
  ["Itens de origem ilícita", "Produtos roubados, contrabandeados ou sem nota fiscal de origem.", "Código Penal e legislação fiscal"],
];

export default function ProdutosProibidos() {
  return (
    <>
      <Cabecalho preLancamento />
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl">Produtos proibidos</h1>
        <p className="mt-3 text-petroleo/85">
          Estes produtos não podem ser vendidos nem indicados na Staypse. Todo item passa por análise antes de aparecer para revendedores, e
          itens com termos suspeitos são revisados com mais atenção. Em caso de dúvida, fale com a gente antes de cadastrar.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {PROIBIDOS.map(([titulo, texto, base]) => (
            <li key={titulo} className="rounded-2xl bg-gelo p-5">
              <h2 className="text-lg">{titulo}</h2>
              <p className="mt-1 text-petroleo/85">{texto}</p>
              <p className="mt-2 text-sm text-petroleo/75">{base}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-petroleo/80">
          Viu um produto proibido na Staypse? Avise pelos contatos no rodapé. Veja também os{" "}
          <Link href="/termos" className="underline">
            Termos de uso
          </Link>{" "}
          e o{" "}
          <Link href="/contrato-produtor" className="underline">
            Contrato do Produtor
          </Link>
          .
        </p>
      </main>
    </>
  );
}
