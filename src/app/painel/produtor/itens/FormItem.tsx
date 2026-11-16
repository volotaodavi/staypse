"use client";
// Formulário de item (produto físico ou digital). Os campos mudam conforme o tipo.
import { useState } from "react";
import { EnviarArquivo, Fotos } from "@/components/arquivos";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { NICHOS } from "@/lib/lista";
import { COMISSAO_MAXIMA, COMISSAO_MINIMA, TIPOS_DIGITAIS } from "@/lib/produtor";
import { salvarItem } from "./acoes";

export type ItemInicial = {
  id: string;
  nome: string;
  descricao: string | null;
  fotos: string[];
  preco_centavos: number;
  comissao_percentual: number;
  categoria: string | null;
  tipo: string;
  estoque: number | null;
  peso_gramas: number | null;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
  prazo_postagem_dias: number | null;
  retirada_local: boolean;
  tipo_digital: string | null;
  arquivo_path: string | null;
  link_acesso: string | null;
  instrucoes_pos_compra: string | null;
  declaracao_nf: boolean;
  status_aprovacao: string;
};

const estiloCampo =
  "w-full rounded-xl border border-petroleo/20 bg-branco px-4 py-3 text-base font-normal focus:border-petroleo focus:ring-2 focus:ring-ciano focus:outline-none";
const valor = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

export function FormItem({ item, uid, supabaseUrl }: { item?: ItemInicial; uid: string; supabaseUrl: string }) {
  const [tipo, setTipo] = useState(item?.tipo ?? "fisico");
  const publicado = item && ["aprovado", "pausado"].includes(item.status_aprovacao);

  return (
    <FormAcao acao={salvarItem}>
      {item && <input type="hidden" name="id" value={item.id} />}

      {publicado && (
        <p className="rounded-xl bg-gelo px-4 py-3 text-sm">
          Este item está publicado. Mudar <strong className="font-medium">preço, comissão, descrição</strong> ou
          fotos envia o item de novo para análise. Estoque, peso, medidas e prazo podem mudar à vontade.
        </p>
      )}

      {/* Tipo */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipo de produto</legend>
        <div className="flex gap-2">
          {[
            ["fisico", "Físico"],
            ["digital", "Digital"],
          ].map(([v, rotulo]) => (
            <label
              key={v}
              className="flex-1 cursor-pointer rounded-full border border-petroleo/20 px-3 py-2 text-center text-sm has-[:checked]:border-petroleo has-[:checked]:bg-petroleo has-[:checked]:text-branco"
            >
              <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="sr-only" />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <Campo rotulo="Nome do produto" name="nome" required maxLength={140} defaultValue={item?.nome} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Descrição
        <textarea name="descricao" rows={5} maxLength={5000} defaultValue={item?.descricao ?? ""} className={estiloCampo} />
      </label>

      <Fotos uid={uid} iniciais={item?.fotos ?? []} supabaseUrl={supabaseUrl} />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Preço (R$)"
          name="preco"
          inputMode="decimal"
          required
          placeholder="89,90"
          defaultValue={item ? (item.preco_centavos / 100).toFixed(2).replace(".", ",") : ""}
        />
        <Campo
          rotulo="Comissão do revendedor (%)"
          name="comissao_percentual"
          type="number"
          min={COMISSAO_MINIMA}
          max={COMISSAO_MAXIMA}
          step="0.5"
          required
          defaultValue={item?.comissao_percentual ?? 20}
        />
      </div>
      <p className="-mt-2 text-xs text-petroleo/70">
        A comissão vai de {COMISSAO_MINIMA}% a {COMISSAO_MAXIMA}% do preço. Ela é paga ao revendedor só nas vendas feitas por ele.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Categoria
        <select name="categoria" defaultValue={item?.categoria ?? ""} className={estiloCampo}>
          <option value="">Escolha</option>
          {NICHOS.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.rotulo}
            </option>
          ))}
        </select>
      </label>

      {tipo === "fisico" ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-gelo p-4">
          <p className="text-sm font-medium">Produto físico</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Estoque" name="estoque" type="number" min={0} inputMode="numeric" defaultValue={item?.estoque ?? ""} />
            <Campo rotulo="Peso (g)" name="peso_gramas" type="number" min={1} inputMode="numeric" defaultValue={item?.peso_gramas ?? ""} />
            <Campo rotulo="Altura (cm)" name="altura_cm" inputMode="decimal" defaultValue={valor(item?.altura_cm)} />
            <Campo rotulo="Largura (cm)" name="largura_cm" inputMode="decimal" defaultValue={valor(item?.largura_cm)} />
            <Campo rotulo="Comprimento (cm)" name="comprimento_cm" inputMode="decimal" defaultValue={valor(item?.comprimento_cm)} />
            <Campo
              rotulo="Postagem em (dias úteis)"
              name="prazo_postagem_dias"
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              defaultValue={item?.prazo_postagem_dias ?? ""}
            />
          </div>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="retirada_local" value="sim" defaultChecked={item?.retirada_local} className="mt-0.5 h-4 w-4 accent-petroleo" />
            Aceito retirada no local (endereço de envio do cadastro)
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl bg-gelo p-4">
          <p className="text-sm font-medium">Produto digital</p>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tipo
            <select name="tipo_digital" defaultValue={item?.tipo_digital ?? ""} className={estiloCampo}>
              <option value="">Escolha</option>
              {TIPOS_DIGITAIS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <EnviarArquivo
            bucket="arquivos-digitais"
            campo="arquivo_path"
            rotulo="Arquivo (opcional, se não usar link)"
            uid={uid}
            prefixo="produto"
            aceita=".pdf,.zip,.epub,.csv,.xls,.xlsx,.doc,.docx,.ppt,.pptx"
            caminhoInicial={item?.arquivo_path}
            tamanhoMaximoMb={50}
            dica="Guardado em área privada: só é liberado ao comprador. Até 50 MB."
          />
          <Campo
            rotulo="Ou link de acesso"
            name="link_acesso"
            type="url"
            placeholder="https://"
            defaultValue={item?.link_acesso ?? ""}
          />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Instruções enviadas após a compra
            <textarea
              name="instrucoes_pos_compra"
              rows={3}
              maxLength={3000}
              placeholder="Ex.: Você receberá o acesso por e-mail em até 24h."
              defaultValue={item?.instrucoes_pos_compra ?? ""}
              className={estiloCampo}
            />
          </label>
        </div>
      )}

      {/* REGRA 2: declaração registrada com data do servidor */}
      <label className="flex gap-3 rounded-2xl border border-petroleo/20 p-4 text-sm">
        <input type="checkbox" name="declaracao_nf" value="sim" defaultChecked={item?.declaracao_nf} className="mt-0.5 h-4 w-4 shrink-0 accent-petroleo" />
        <span>
          <strong className="font-medium">Declaro que emito nota fiscal de todas as vendas</strong> deste produto.
        </span>
      </label>

      <BotaoEnviar name="intencao" value="analise">
        {publicado ? "Salvar alterações" : "Enviar para análise"}
      </BotaoEnviar>
      {!publicado && (
        <BotaoEnviar name="intencao" value="rascunho" variante="base">
          Salvar rascunho
        </BotaoEnviar>
      )}
    </FormAcao>
  );
}
