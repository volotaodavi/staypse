// Recebimentos da loja: situação do cadastro de recebimento na Lytex.
import { Recebimento } from "@/components/painel/Recebimento";
import { minhaLoja } from "../dados";

export const metadata = { title: "Recebimentos" };
export const instant = false;

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RecebimentosLoja({ searchParams }: PageProps<"/painel/loja/recebimentos">) {
  const sp = await searchParams;
  const { loja } = await minhaLoja();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Recebimentos</h1>
      {um(sp.msg) && (
        <p role="status" className="rounded-xl bg-branco px-4 py-3 text-sm">
          {um(sp.msg)}
        </p>
      )}
      {um(sp.erro) && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {um(sp.erro)}
        </p>
      )}
      {!loja ? (
        <p className="rounded-2xl bg-branco p-5">Cadastre a empresa primeiro: o recebimento usa o mesmo CNPJ.</p>
      ) : (
        <Recebimento papel="produtor" />
      )}
    </div>
  );
}
