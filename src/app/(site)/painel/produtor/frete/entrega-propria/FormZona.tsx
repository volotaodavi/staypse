"use client";
import { useState } from "react";
import { BotaoEnviar, Campo, FormAcao } from "@/components/formulario";
import { fretePorKm } from "@/lib/entrega-propria";
import { formatarPreco } from "@/lib/produtor";
import { salvarZona } from "./acoes";

export type ZonaForm = Record<string, string>;
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const opcao = "flex cursor-pointer gap-3 rounded-2xl border border-petroleo/40 px-4 py-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:focus-visible]:outline-2 min-h-11";
const radio = "mt-0.5 h-5 w-5 shrink-0 accent-petroleo";
const num = (v: string) => Number(v.replace(",", "."));

export function FormZona({ inicial }: { inicial: ZonaForm }) {
  const [cobertura, setCobertura] = useState(inicial.cobertura);
  const [preco, setPreco] = useState(inicial.preco_tipo);
  const [prazo, setPrazo] = useState(inicial.prazo_tipo);
  const [porKm, setPorKm] = useState(inicial.preco_km);
  const [minima, setMinima] = useState(inicial.taxa_minima);
  const [kmMax, setKmMax] = useState(inicial.km_max);
  const [simKm, setSimKm] = useState("10");
  const dias = inicial.dias.split(",");

  const km = num(simKm) * 1; // km já rodados (com o fator de rota aplicado)
  const simulado = Number.isFinite(km) && km > 0 && num(porKm) >= 0
    ? fretePorKm({ km, precoKmCentavos: Math.round(num(porKm) * 100), taxaMinimaCentavos: Math.round(num(minima || "0") * 100), kmMax: kmMax ? num(kmMax) : null })
    : undefined;

  return (
    <FormAcao acao={salvarZona}>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <Campo rotulo="Nome da zona" name="nome" required maxLength={80} defaultValue={inicial.nome} placeholder="Maricá" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Onde esta zona entrega?</legend>
        {[
          ["cidade", "Cidade inteira", "Todo CEP da cidade e UF informados."],
          ["bairro", "Bairros de uma cidade", "Só os bairros listados (vale mais que a cidade inteira)."],
          ["cep", "Faixa de CEP", "De um CEP a outro (vale mais que a cidade inteira)."],
        ].map(([valor, rotulo, ajuda]) => (
          <label key={valor} className={opcao}>
            <input type="radio" name="cobertura" value={valor} checked={cobertura === valor} onChange={() => setCobertura(valor)} className={radio} />
            <span>
              <span className="block font-medium">{rotulo}</span>
              <span className="block text-petroleo/80">{ajuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {cobertura === "cep" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="CEP inicial" name="cep_inicio" inputMode="numeric" maxLength={9} required placeholder="24900-000" defaultValue={inicial.cep_inicio} />
          <Campo rotulo="CEP final" name="cep_fim" inputMode="numeric" maxLength={9} required placeholder="24999-999" defaultValue={inicial.cep_fim} />
        </div>
      )}
      {(cobertura === "cidade" || cobertura === "bairro") && (
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Campo rotulo="Cidade" name="cidade" required maxLength={120} defaultValue={inicial.cidade} placeholder="Maricá" />
          <Campo rotulo="UF" name="uf" required maxLength={2} defaultValue={inicial.uf} placeholder="RJ" className="uppercase" />
        </div>
      )}
      {cobertura === "bairro" && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Bairros (um por linha)
          <textarea name="bairros" required rows={4} defaultValue={inicial.bairros} className="w-full rounded-xl border border-petroleo/60 bg-branco px-4 py-3 text-base font-normal" />
        </label>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Quanto custa a entrega?</legend>
        {[
          ["fixo", "Preço fixo", "O mesmo valor para toda a zona."],
          ["km", "Por km", "Valor por km rodado, com taxa mínima e km máximo."],
          ["gratis_acima", "Grátis acima de um valor", "Abaixo dele, cobra o preço informado."],
        ].map(([valor, rotulo, ajuda]) => (
          <label key={valor} className={opcao}>
            <input type="radio" name="preco_tipo" value={valor} checked={preco === valor} onChange={() => setPreco(valor)} className={radio} />
            <span>
              <span className="block font-medium">{rotulo}</span>
              <span className="block text-petroleo/80">{ajuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {(preco === "fixo" || preco === "gratis_acima") && (
        <Campo rotulo="Preço da entrega (R$)" name="preco_fixo" inputMode="decimal" required defaultValue={inicial.preco_fixo} placeholder="12,00" dica="Use 0 para entrega grátis." />
      )}
      {preco === "gratis_acima" && <Campo rotulo="Grátis a partir de (R$)" name="gratis_acima" inputMode="decimal" required defaultValue={inicial.gratis_acima} placeholder="150,00" />}
      {preco === "km" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gelo p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Preço por km (R$)" name="preco_km" inputMode="decimal" required value={porKm} onChange={(e) => setPorKm(e.target.value)} placeholder="2,00" />
            <Campo rotulo="Taxa mínima (R$)" name="taxa_minima" inputMode="decimal" required value={minima} onChange={(e) => setMinima(e.target.value)} placeholder="8,00" />
            <Campo rotulo="Km máximo (opcional)" name="km_max" inputMode="decimal" value={kmMax} onChange={(e) => setKmMax(e.target.value)} placeholder="30" dica="Acima disso a zona não entrega." />
            <Campo rotulo="Fator de rota" name="fator_rota" inputMode="decimal" defaultValue={inicial.fator_rota} placeholder="1,3" dica="Multiplica a distância em linha reta para estimar o trajeto real." />
          </div>
          <Campo rotulo="Preço fixo de reserva (R$, opcional)" name="preco_fixo" inputMode="decimal" defaultValue={inicial.preco_fixo} dica="Usado se não for possível medir a distância do CEP." />
          <p className="text-xs text-petroleo/80">
            A distância é em linha reta entre o CEP da sua loja e o do comprador, vezes o fator de rota. Não usamos Google Maps: é uma estimativa. Se o CEP não tiver coordenadas, vale o preço fixo de reserva; sem ele, a zona não entrega naquele CEP.
          </p>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1 font-medium">
              Simular: km rodados
              <input value={simKm} onChange={(e) => setSimKm(e.target.value)} inputMode="decimal" className="w-28 rounded-xl border border-petroleo/60 bg-branco px-3 py-2.5 text-base font-normal" />
            </label>
            <p role="status" className="pb-3">
              {simulado === undefined ? "Preencha o preço por km." : simulado === null ? "Acima do km máximo: não entrega." : `Frete: ${formatarPreco(simulado)}`}
            </p>
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Prazo</legend>
        {[
          ["mesmo_dia", "No mesmo dia", "Para pedidos pagos até um horário."],
          ["horas", "Em horas", "Ex.: em até 3 horas."],
          ["dias", "Em dias", "Ex.: em até 2 dias."],
        ].map(([valor, rotulo, ajuda]) => (
          <label key={valor} className={opcao}>
            <input type="radio" name="prazo_tipo" value={valor} checked={prazo === valor} onChange={() => setPrazo(valor)} className={radio} />
            <span>
              <span className="block font-medium">{rotulo}</span>
              <span className="block text-petroleo/80">{ajuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {prazo === "mesmo_dia" ? (
        <Campo rotulo="Pedidos pagos até (HH:MM)" name="hora_limite" type="time" required defaultValue={inicial.hora_limite || "14:00"} />
      ) : (
        <Campo rotulo={prazo === "horas" ? "Quantas horas" : "Quantos dias"} name="prazo_valor" type="number" min={1} max={90} required defaultValue={inicial.prazo_valor} />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Dias de entrega</legend>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d, i) => (
            <label key={d} className="flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border border-petroleo/40 px-3 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:focus-visible]:outline-2">
              <input type="checkbox" name="dias" value={i} defaultChecked={dias.includes(String(i))} className="sr-only" />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Entrega a partir de" name="horario_inicio" type="time" required defaultValue={inicial.horario_inicio} />
        <Campo rotulo="Entrega até" name="horario_fim" type="time" required defaultValue={inicial.horario_fim} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="ativo" value="sim" defaultChecked={inicial.ativo === "sim"} className="h-5 w-5 accent-petroleo" />
        Zona ativa (o comprador já vê esta entrega)
      </label>
      <BotaoEnviar>{inicial.id ? "Salvar zona" : "Criar zona"}</BotaoEnviar>
    </FormAcao>
  );
}
