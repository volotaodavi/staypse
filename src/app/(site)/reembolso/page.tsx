// Política de reembolso, arrependimento e trocas (CDC arts. 18, 26, 35 e 49; Decreto 7.962/2013, art. 5º).
// Ao mudar o texto, troque TERMOS_VERSAO em src/config/empresa.ts. Esta página faz parte dos Termos de uso.
// Regra de copy: quem devolve o dinheiro é a instituição de pagamento (Lytex); a Staypse nunca recebe nem guarda o valor.
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoLegal, Itens } from "@/components/DocumentoLegal";
import { TERMOS_VERSAO } from "@/config/empresa";

export const metadata: Metadata = {
  title: "Política de reembolso",
  description: "Como desistir de uma compra em 7 dias, receber o reembolso, trocar produto com defeito e quem responde por cada etapa.",
};

const f = "font-medium";

export default function Reembolso() {
  return (
    <DocumentoLegal
      titulo="Política de reembolso e arrependimento"
      versao={TERMOS_VERSAO}
      resumo={
        <>
          <p>
            Você pode desistir da compra em até <strong className={f}>7 dias</strong>, sem dar motivo, e receber de volta tudo o que pagou, inclusive o
            frete. Produto com defeito tem garantia legal de 30 ou 90 dias.
          </p>
          <p>
            Quem vende é a loja; quem devolve o dinheiro, no mesmo meio de pagamento, é a instituição de pagamento parceira (Lytex). A Staypse
            registra o pedido e acompanha até o fim: ela não recebe nem guarda o seu dinheiro.
          </p>
        </>
      }
      secoes={[
        {
          id: "quem-responde",
          titulo: "Quem responde por quê",
          conteudo: (
            <Itens>
              <li><strong className={f}>A loja vendedora</strong> (identificada na página do produto e no pedido) vende, emite a nota fiscal, entrega, aceita a devolução e responde pela qualidade e pela garantia do produto.</li>
              <li><strong className={f}>A instituição de pagamento parceira (Lytex)</strong> processa o pagamento e faz o reembolso, no mesmo meio de pagamento usado na compra.</li>
              <li><strong className={f}>A Staypse</strong> é a tecnologia da plataforma: registra o seu pedido de desistência, avisa a loja, acompanha o prazo e ajuda a resolver quando algo não anda. Isso não reduz nenhum direito seu como consumidor.</li>
            </Itens>
          ),
        },
        {
          id: "arrependimento",
          titulo: "Desistir da compra em 7 dias (arrependimento)",
          conteudo: (
            <>
              <p>
                Em compra feita pela internet, você pode desistir em até <strong className={f}>7 dias corridos</strong>, sem precisar explicar o motivo
                (Código de Defesa do Consumidor, art. 49). Não há multa nem taxa por desistir.
              </p>
              <Itens>
                <li><strong className={f}>Produto físico:</strong> os 7 dias contam a partir do dia em que você recebe o produto.</li>
                <li><strong className={f}>Produto digital:</strong> os 7 dias contam a partir da contratação, ou da liberação do acesso, o que ocorrer por último. A lei não traz exceção para produto digital; por isso o pedido de desistência dentro do prazo vale mesmo que você já tenha aberto o acesso, e o acesso é encerrado depois do reembolso.</li>
                <li><strong className={f}>Pedido ainda não pago:</strong> você pode cancelar sem custo; pedidos não pagos em 3 dias são cancelados automaticamente.</li>
              </Itens>
            </>
          ),
        },
        {
          id: "como-pedir",
          titulo: "Como pedir",
          conteudo: (
            <>
              <Itens>
                <li>Abra a página do seu pedido pelo link que você recebeu e toque em <strong className={f}>&quot;Desistir da compra&quot;</strong>. O motivo é opcional.</li>
                <li>Perdeu o link? Use <Link href="/pedido" className="underline">Encontrar meu pedido</Link> com o código e o e-mail da compra.</li>
                <li>Se preferir, abra um <Link href="/atendimento?assunto=arrependimento" className="underline">atendimento</Link> com o assunto &quot;Desistência da compra&quot; e o código do pedido. Você recebe um protocolo.</li>
              </Itens>
              <p>A desistência vale a partir do momento em que você faz o pedido pelo site, mesmo que a devolução do produto físico ainda não tenha acontecido.</p>
            </>
          ),
        },
        {
          id: "reembolso",
          titulo: "Como e quando o dinheiro volta",
          conteudo: (
            <>
              <Itens>
                <li>Você recebe de volta <strong className={f}>tudo o que pagou, inclusive o frete</strong>, de imediato e no mesmo meio de pagamento (Pix, cartão ou boleto), conforme o art. 49, parágrafo único, do CDC.</li>
                <li>Quem faz o reembolso é a instituição de pagamento parceira. A Staypse registra a desistência, avisa a loja e acompanha até a conclusão.</li>
                <li>Depois que o reembolso é feito, quanto tempo leva para aparecer na sua conta ou na fatura depende do meio de pagamento e do seu banco ou da operadora do cartão (no cartão, o valor pode aparecer em até duas faturas). Se passar do prazo que o seu banco informou, abra um atendimento com o protocolo.</li>
                <li>Entre loja, revendedor e Staypse, a devolução segue a mesma proporção do split de cada um. Isso é um acerto entre eles e nunca diminui o seu reembolso.</li>
              </Itens>
            </>
          ),
        },
        {
          id: "devolucao",
          titulo: "Devolução do produto físico",
          conteudo: (
            <Itens>
              <li>A loja combina com você como devolver o produto. <strong className={f}>O custo da devolução é da loja</strong>, não seu.</li>
              <li>Devolva o produto no estado em que recebeu e com o que veio junto (acessórios, manuais). Experimentar para conhecer o produto não tira o seu direito.</li>
              <li>Retirada em mão: se você retirou o produto com a loja, a devolução também é combinada com ela pelo atendimento.</li>
            </Itens>
          ),
        },
        {
          id: "defeito",
          titulo: "Produto com defeito, diferente do anunciado ou que não chegou",
          conteudo: (
            <>
              <Itens>
                <li><strong className={f}>Prazo para reclamar (CDC, art. 26):</strong> 30 dias para produto ou serviço não durável e 90 dias para durável, contados da entrega. Se o defeito estiver escondido, o prazo conta de quando ele aparecer.</li>
                <li><strong className={f}>O que você pode pedir (CDC, art. 18):</strong> a loja tem até 30 dias para consertar. Se não resolver, você escolhe entre trocar por outro igual, receber de volta o valor pago, corrigido, ou um abatimento proporcional do preço.</li>
                <li><strong className={f}>Produto diferente do anunciado ou que não chegou no prazo (CDC, art. 35):</strong> você pode exigir a entrega como foi prometida, aceitar outro produto equivalente ou cancelar e receber de volta o que pagou.</li>
                <li><strong className={f}>Produto digital com defeito</strong> (acesso que não abre, arquivo corrompido ou diferente do anunciado): a loja deve corrigir; sem solução, você pode pedir o reembolso.</li>
              </Itens>
              <p>Abra o pedido pelo <Link href="/atendimento?assunto=pedido" className="underline">atendimento</Link> com fotos ou prints, se tiver. A garantia legal vale mesmo sem garantia extra do fabricante.</p>
            </>
          ),
        },
        {
          id: "contestacao",
          titulo: "Contestação na operadora do cartão (chargeback)",
          conteudo: (
            <p>
              Você pode contestar uma cobrança direto no seu banco ou na operadora do cartão. Mas o caminho mais rápido é pedir a desistência ou o
              reembolso aqui, porque a loja e a instituição de pagamento resolvem sem esperar a análise do banco. Se o valor for estornado pela
              operadora, a parte de cada participante do split é devolvida na mesma proporção. Isso não afeta o seu direito de desistir ou de reclamar
              de defeito.
            </p>
          ),
        },
        {
          id: "acompanhar",
          titulo: "Acompanhar e falar com a gente",
          conteudo: (
            <p>
              Você vê o andamento na página do pedido. Se a loja ou o reembolso demorarem, fale com o{" "}
              <Link href="/atendimento" className="underline">atendimento</Link>: respondemos em até 5 dias úteis e acompanhamos a resposta da loja.
              Você também pode procurar o Procon do seu município ou o consumidor.gov.br. Veja também os{" "}
              <Link href="/termos" className="underline">Termos de uso</Link> e a <Link href="/privacidade" className="underline">Política de Privacidade</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
