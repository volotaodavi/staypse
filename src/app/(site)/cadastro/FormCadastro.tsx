"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso, BotaoEnviar, Campo } from "@/components/formulario";
import { cadastrar } from "./acoes";

// Cartão de escolha de papel (pode marcar os dois)
function OpcaoPapel({
  valor,
  titulo,
  texto,
  marcado,
}: {
  valor: string;
  titulo: string;
  texto: string;
  marcado?: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-petroleo/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo p-4 has-[:checked]:border-petroleo has-[:checked]:bg-gelo">
      <input
        type="checkbox"
        name="papeis"
        value={valor}
        defaultChecked={marcado}
        className="mt-1 h-5 w-5 shrink-0 accent-petroleo"
      />
      <span>
        <span className="block font-medium">{titulo}</span>
        <span className="block text-sm text-petroleo/75">{texto}</span>
      </span>
    </label>
  );
}

// proximo: para onde voltar depois de confirmar o e-mail (ex.: o convite de vendedor)
export function FormCadastro({ proximo }: { proximo?: string }) {
  const [estado, acao] = useActionState(cadastrar, undefined);
  // quem vem de um convite de loja não precisa escolher papel agora
  const convite = proximo?.startsWith("/convite/") ?? false;
  // convite de afiliação por produto: a conta é de afiliado (revendedor)
  const conviteAfiliacao = proximo?.startsWith("/afiliar/") ?? false;

  // Depois de enviar com sucesso, mostra só o aviso de confirmação.
  if (estado?.sucesso) return <Aviso estado={estado} />;

  // valores digitados antes de um erro (o React limpa o formulário a cada envio)
  const v = estado?.valores ?? {};
  const papeisMarcados = (v.papeis ?? "").split(",");

  return (
    <form action={acao} className="flex flex-col gap-4">
      {proximo && <input type="hidden" name="proximo" value={proximo} />}
      <Campo
        rotulo="Nome"
        name="nome"
        autoComplete="name"
        required
        minLength={2}
        maxLength={120}
        defaultValue={v.nome}
      />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        dica="Pelo menos 8 caracteres."
      />

      <fieldset className="flex flex-col gap-2" hidden={convite || conviteAfiliacao}>
        <legend className="mb-1 text-sm font-medium">Como você quer usar a Staypse?</legend>
        <OpcaoPapel
          valor="revendedor"
          marcado={papeisMarcados.includes("revendedor")}
          titulo="Revendedor"
          texto="Monto minha vitrine e ganho comissão sobre as minhas vendas."
        />
        <OpcaoPapel
          valor="produtor"
          marcado={papeisMarcados.includes("produtor")}
          titulo="Produtor"
          texto="Tenho CNPJ e quero cadastrar meus produtos para revenda."
        />
        <span className="text-xs text-petroleo/70">Pode marcar os dois.</span>
      </fieldset>

      {/* Idade: só uma declaração (sem pedir data de nascimento). Afiliado e vendedor: 16+ (16 e 17 com
          autorização dos responsáveis, Código Civil art. 4º, I); o responsável de uma loja (CNPJ) precisa
          ser maior de 18 anos ou emancipado. O servidor confere de novo. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Sua idade</legend>
        <label className="flex gap-3 text-sm">
          <input type="radio" name="idade" value="maior" required defaultChecked={v.idade === "maior"} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
          <span>Tenho 18 anos ou mais (ou sou emancipado).</span>
        </label>
        <label className="flex gap-3 text-sm">
          <input type="radio" name="idade" value="16_17" required defaultChecked={v.idade === "16_17"} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
          <span>
            Tenho 16 ou 17 anos e tenho autorização dos meus pais ou responsáveis. (Não vale para quem vai cadastrar uma loja.)
          </span>
        </label>
        <span className="text-xs text-petroleo/70">
          Menores de 16 anos não podem criar conta. Receber comissão depende da aprovação do cadastro de recebimento pela instituição de pagamento.
        </span>
      </fieldset>

      {/* Regra 7: aceite registrado com data e versão */}
      <label className="flex gap-3 text-sm">
        <input type="checkbox" name="aceite" value="sim" required className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" className="font-medium underline">
            Termos de Uso
            <span className="sr-only"> (abre em nova aba)</span>
          </Link>
          {" "}e a{" "}
          <Link href="/privacidade" target="_blank" className="font-medium underline">
            Política de Privacidade
            <span className="sr-only"> (abre em nova aba)</span>
          </Link>
          .
        </span>
      </label>

      <Aviso estado={estado} />
      <BotaoEnviar>Criar conta</BotaoEnviar>
      <p className="text-center text-xs text-petroleo/70">
        Sem taxa de adesão. Revendedores ganham apenas sobre as próprias vendas.
      </p>
    </form>
  );
}
