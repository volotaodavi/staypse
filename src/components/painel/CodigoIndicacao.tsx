// Código de indicação de quem indica (afiliado ou vendedor próprio): o próprio @.
// O comprador pode digitar no checkout quando abre o link num aparelho e compra em outro
// (o cookie do link não acompanha). Não é cupom: o preço é o mesmo.
import { CopiarLink } from "@/components/rastreio";

export function CodigoIndicacao({ slug }: { slug: string }) {
  return (
    <section aria-labelledby="t-codigo" className="flex flex-col gap-2 rounded-2xl bg-branco p-5" data-codigo-indicacao>
      <h2 id="t-codigo" className="text-base font-medium">
        Seu código de indicação: <span className="font-semibold">@{slug}</span>
      </h2>
      <p className="text-sm text-petroleo/80">
        O cliente pode digitar este código no checkout se comprar em outro aparelho (por exemplo, clicou no celular e compra no
        computador). Ele não dá desconto: só mostra que foi você quem indicou.
      </p>
      <div>
        <CopiarLink url={`@${slug}`} rotulo="Copiar código" className="min-h-11 rounded-full border border-petroleo/40 px-4 text-sm font-medium" />
      </div>
    </section>
  );
}
