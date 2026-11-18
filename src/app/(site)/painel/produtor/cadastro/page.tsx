// Cadastro do produtor em 5 passos (pensado para o celular):
// 1 Empresa · 2 Endereço de envio · 3 Documentos · 4 Contrato · 5 Revisar e enviar
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnviarArquivo } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { CONTRATO_PRODUTOR_VERSAO } from "@/config/empresa";
import { UFS } from "@/lib/lista";
import { exigirPapel } from "@/lib/papeis";
import { STATUS_PRODUTOR, formatarCnpj, pendenciasProdutor } from "@/lib/produtor";
import { cadastroEditavel, meuProdutor } from "../dados";
import { aceitarContrato, enviarParaAnalise, salvarDocumentos, salvarEmpresa, salvarEndereco } from "./acoes";

export const metadata = { title: "Cadastro do produtor" };
// Lê a sessão (cookie) a cada acesso: página sempre renderizada no servidor.
export const instant = false;

const PASSOS = ["Empresa", "Endereço", "Documentos", "Contrato", "Enviar"];

export default async function CadastroProdutor({ searchParams }: PageProps<"/painel/produtor/cadastro">) {
  const usuario = await exigirPapel("produtor");
  const { produtor, contratoAceito } = await meuProdutor(usuario.id);

  // Em análise ou aprovado: cadastro travado
  if (produtor && !cadastroEditavel(produtor.status_verificacao)) redirect("/painel/produtor");

  const pedido = Number((await searchParams).passo) || 1;
  // não deixa pular para um passo sem ter a empresa criada
  const passo = !produtor ? 1 : Math.min(Math.max(pedido, 1), 5);
  const pendencias = pendenciasProdutor(produtor, contratoAceito);

  return (
    <div className="mx-auto max-w-md">
      <Link href="/painel/produtor" className="inline-block py-2 text-sm underline">
        ← Painel do produtor
      </Link>
      <h1 className="mt-2 text-3xl">Cadastro do produtor</h1>

      {produtor?.status_verificacao === "recusado" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong className="font-medium">Cadastro recusado:</strong> {produtor.motivo_rejeicao}
          <br />
          Corrija e envie de novo.
        </p>
      )}

      {/* Indicador de passos */}
      <ol className="mt-5 grid grid-cols-5 gap-1 text-center text-[11px]">
        {PASSOS.map((nome, i) => (
          <li key={nome}>
            <Link
              href={produtor ? `/painel/produtor/cadastro?passo=${i + 1}` : "#"}
              aria-current={passo === i + 1 ? "step" : undefined}
              className={`block rounded-full py-1.5 ${
                passo === i + 1 ? "bg-petroleo font-medium text-branco" : "bg-gelo text-petroleo"
              }`}
            >
              {i + 1}. {nome}
            </Link>
          </li>
        ))}
      </ol>

      <section className="mt-5 rounded-3xl bg-branco p-5 sm:p-6">
        {passo === 1 && (
          <FormAcao acao={salvarEmpresa}>
            <h2 className="text-xl">Dados da empresa</h2>
            <Campo rotulo="Razão social" name="razao_social" autoComplete="organization" required maxLength={200} defaultValue={produtor?.razao_social} />
            <Campo
              rotulo="CNPJ"
              name="cnpj"
              required
              maxLength={18}
              placeholder="00.000.000/0000-00"
              dica="Aceita o CNPJ novo, com letras. O CNPJ precisa estar ATIVO na Receita."
              defaultValue={formatarCnpj(produtor?.cnpj)}
            />
            <Campo
              rotulo="Inscrição estadual (opcional)"
              name="inscricao_estadual"
              maxLength={20}
              placeholder="Só números, ou ISENTO"
              defaultValue={produtor?.inscricao_estadual ?? ""}
            />
            <Campo rotulo="WhatsApp" name="whatsapp" autoComplete="tel-national" type="tel" inputMode="tel" required placeholder="(81) 99876-5432" defaultValue={produtor?.whatsapp ?? ""} />
            <Campo rotulo="E-mail de contato" name="email_contato" autoComplete="email" type="email" required defaultValue={produtor?.email_contato ?? usuario.email} />
            <BotaoEnviar>Salvar e continuar</BotaoEnviar>
          </FormAcao>
        )}

        {passo === 2 && (
          <FormAcao acao={salvarEndereco}>
            <h2 className="text-xl">Endereço de envio</h2>
            <p className="text-sm text-petroleo/75">De onde saem os pedidos (usado no cálculo do frete).</p>
            <Campo rotulo="CEP" name="cep" autoComplete="postal-code" inputMode="numeric" required maxLength={9} placeholder="00000-000" defaultValue={produtor?.cep ?? ""} />
            <Campo rotulo="Rua" name="logradouro" autoComplete="address-line1" required maxLength={200} defaultValue={produtor?.logradouro ?? ""} />
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
              <Campo rotulo="Número" name="numero" required maxLength={20} defaultValue={produtor?.numero ?? ""} />
              <Campo rotulo="Complemento" name="complemento" autoComplete="address-line2" maxLength={100} defaultValue={produtor?.complemento ?? ""} />
            </div>
            <Campo rotulo="Bairro" name="bairro" autoComplete="address-level3" required maxLength={100} defaultValue={produtor?.bairro ?? ""} />
            <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
              <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" required maxLength={120} defaultValue={produtor?.cidade ?? ""} />
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
                UF
                <select name="uf" autoComplete="address-level1" required defaultValue={produtor?.uf ?? ""} className="rounded-xl border border-petroleo/60 bg-branco px-3 py-3 text-base font-normal">
                  <option value="" disabled>
                    --
                  </option>
                  {UFS.map((uf) => (
                    <option key={uf}>{uf}</option>
                  ))}
                </select>
              </label>
            </div>
            <BotaoEnviar>Salvar e continuar</BotaoEnviar>
          </FormAcao>
        )}

        {passo === 3 && (
          <FormAcao acao={salvarDocumentos}>
            <h2 className="text-xl">Documentos</h2>
            <p className="text-sm text-petroleo/75">
              Ficam guardados em área privada: só você e a equipe Staypse têm acesso.
            </p>
            <EnviarArquivo
              bucket="documentos-produtores"
              campo="documento_path"
              rotulo="Contrato social ou cartão CNPJ"
              uid={usuario.id}
              prefixo="empresa"
              aceita="application/pdf,image/jpeg,image/png"
              caminhoInicial={produtor?.documento_path}
              tamanhoMaximoMb={10}
              dica="PDF, JPG ou PNG, até 10 MB."
            />
            <EnviarArquivo
              bucket="documentos-produtores"
              campo="documento_responsavel_path"
              rotulo="Documento com foto do responsável (RG ou CNH)"
              uid={usuario.id}
              prefixo="responsavel"
              aceita="application/pdf,image/jpeg,image/png"
              caminhoInicial={produtor?.documento_responsavel_path}
              tamanhoMaximoMb={10}
              dica="Frente e verso legíveis. PDF, JPG ou PNG, até 10 MB."
            />
            <BotaoEnviar>Salvar e continuar</BotaoEnviar>
          </FormAcao>
        )}

        {passo === 4 && (
          <FormAcao acao={aceitarContrato}>
            <h2 className="text-xl">Contrato do Produtor</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-petroleo/85">
              <li>Você emite nota fiscal de todas as vendas.</li>
              <li>Você define a comissão do revendedor, entre 10% e 70%.</li>
              <li>O pagamento é dividido automaticamente no split; a Staypse não recebe nem guarda o dinheiro.</li>
              <li>O comprador pode desistir em 7 dias e recebe tudo de volta; entre as partes, a devolução segue a proporção do split.</li>
              <li>Produtos proibidos não são aceitos.</li>
            </ul>
            <Link href="/contrato-produtor" target="_blank" className="text-sm font-medium underline">
              Ler o contrato completo (versão {CONTRATO_PRODUTOR_VERSAO})
              <span className="sr-only"> (abre em nova aba)</span>
            </Link>
            {contratoAceito ? (
              <p className="rounded-xl bg-gelo px-4 py-3 text-sm">✓ Você já aceitou esta versão do contrato.</p>
            ) : (
              <label className="flex gap-3 text-sm">
                <input type="checkbox" name="aceite" value="sim" required className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
                <span>Li e aceito o Contrato do Produtor.</span>
              </label>
            )}
            {contratoAceito ? (
              <Link href="/painel/produtor/cadastro?passo=5" className="rounded-full bg-ciano px-6 py-3 text-center font-medium text-petroleo">
                Continuar
              </Link>
            ) : (
              <BotaoEnviar>Aceitar e continuar</BotaoEnviar>
            )}
          </FormAcao>
        )}

        {passo === 5 && (
          <FormAcao acao={enviarParaAnalise}>
            <h2 className="text-xl">Revisar e enviar</h2>
            {produtor && (
              <p className="text-sm">
                {produtor.razao_social} · CNPJ {formatarCnpj(produtor.cnpj)} ·{" "}
                {STATUS_PRODUTOR[produtor.status_verificacao]}
              </p>
            )}
            {pendencias.length > 0 ? (
              <div className="rounded-xl bg-gelo px-4 py-3 text-sm">
                <p className="font-medium">Ainda falta:</p>
                <ul className="mt-1 list-disc pl-5">
                  {pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <p className="text-sm text-petroleo/80">
                  Tudo pronto. A equipe Staypse confere o CNPJ na Receita e os documentos. Você vê o
                  resultado aqui no painel.
                </p>
                <BotaoEnviar>Enviar para análise</BotaoEnviar>
              </>
            )}
          </FormAcao>
        )}
      </section>
    </div>
  );
}
