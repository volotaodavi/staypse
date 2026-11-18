// "Minha loja": atalhos para a identidade visual (Etapa 4), empresa e KYC
// (Etapa 3), frete e produtos.
import Link from "next/link";
import { STATUS_PRODUTOR } from "@/lib/produtor";
import { AbasLoja } from "../AbasLoja";
import { minhaLoja } from "../dados";

export const metadata = { title: "Minha loja" };
export const instant = false;

export default async function MinhaLoja() {
  const { loja } = await minhaLoja();
  const atalhos: [string, string, string][] = [
    ["/painel/produtor/loja", "Aparência da loja", "Endereço da loja, logo, cores, fonte e layout"],
    [
      "/painel/produtor",
      "Empresa e documentos (KYC)",
      loja ? `Situação: ${STATUS_PRODUTOR[loja.status_verificacao] ?? loja.status_verificacao}` : "Cadastre sua empresa",
    ],
    ["/painel/produtor/frete", "Frete", loja?.frete_fixo_centavos == null ? "Envio desligado" : "Valor, frete grátis e prazo"],
    ["/painel/produtor/itens/novo", "Novo produto", "Cadastro com fotos, preço e comissão"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Minha loja</h1>
      <AbasLoja />
      <ul className="grid gap-3 sm:grid-cols-2">
        {atalhos.map(([href, titulo, texto]) => (
          <li key={href}>
            <Link href={href} className="flex min-h-11 flex-col gap-1 rounded-2xl bg-branco p-5 hover:ring-2 hover:ring-petroleo/20">
              <span className="font-medium">{titulo}</span>
              <span className="text-sm text-petroleo/75">{texto}</span>
            </Link>
          </li>
        ))}
      </ul>
      {loja?.loja_slug && (
        <p className="text-sm">
          Endereço público:{" "}
          <Link href={`/loja/${loja.loja_slug}`} className="font-medium underline">
            /loja/{loja.loja_slug}
          </Link>
        </p>
      )}
    </div>
  );
}
