"use client";
// Envio de arquivos direto do celular para o storage do Supabase.
// Cada arquivo vai para a pasta do próprio usuário: <id-do-usuário>/arquivo.
// O formulário recebe só o CAMINHO do arquivo (campo escondido).
/* eslint-disable @next/next/no-img-element -- fotos do storage, já comprimidas no envio */
import { useState } from "react";
import { comprimirImagem } from "@/lib/imagem";
import { MAX_FOTOS } from "@/lib/produtor";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

const extensao = (nome: string) => (nome.includes(".") ? nome.split(".").pop()!.toLowerCase() : "bin");

// ---------- um arquivo (documento, arquivo digital) ----------
export function EnviarArquivo({
  bucket,
  campo,
  rotulo,
  uid,
  prefixo,
  aceita,
  caminhoInicial,
  dica,
  tamanhoMaximoMb,
}: {
  bucket: "documentos-produtores" | "arquivos-digitais";
  campo: string; // nome do campo escondido no formulário
  rotulo: string;
  uid: string;
  prefixo: string;
  aceita: string; // ex.: "application/pdf,image/jpeg,image/png"
  caminhoInicial?: string | null;
  dica?: string;
  tamanhoMaximoMb: number;
}) {
  const [caminho, setCaminho] = useState(caminhoInicial ?? "");
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">(caminhoInicial ? "ok" : "");
  const [mensagem, setMensagem] = useState("");

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.size > tamanhoMaximoMb * 1024 * 1024) {
      setEstado("erro");
      setMensagem(`Arquivo maior que ${tamanhoMaximoMb} MB.`);
      return;
    }
    setEstado("enviando");
    const destino = `${uid}/${prefixo}-${Date.now()}.${extensao(arquivo.name)}`;
    const { error } = await criarClienteNavegador()
      .storage.from(bucket)
      .upload(destino, arquivo, { contentType: arquivo.type, upsert: false });
    if (error) {
      setEstado("erro");
      setMensagem("Não foi possível enviar. Confira o tipo do arquivo e tente de novo.");
      return;
    }
    setCaminho(destino);
    setEstado("ok");
    setMensagem(arquivo.name);
  }

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <span>{rotulo}</span>
      <input type="hidden" name={campo} value={caminho} />
      <label
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 font-normal ${
          estado === "ok" ? "border-petroleo bg-gelo" : "border-petroleo/40"
        }`}
      >
        <span className="truncate">
          {estado === "enviando" && "Enviando..."}
          {estado === "ok" && `✓ Enviado${mensagem ? `: ${mensagem}` : ""}`}
          {(estado === "" || estado === "erro") && "Toque para escolher o arquivo"}
        </span>
        <span className="shrink-0 rounded-full bg-petroleo px-3 py-1 text-xs text-branco">
          {estado === "ok" ? "Trocar" : "Escolher"}
        </span>
        <input
          type="file"
          accept={aceita}
          className="sr-only"
          data-campo={campo}
          onChange={(e) => enviar(e.target.files?.[0])}
        />
      </label>
      {estado === "erro" && <span className="font-normal text-red-800">{mensagem}</span>}
      {dica && <span className="text-xs font-normal text-petroleo/70">{dica}</span>}
    </div>
  );
}

// ---------- fotos do item (1 a 6, comprimidas) ----------
export function Fotos({ uid, iniciais, supabaseUrl }: { uid: string; iniciais: string[]; supabaseUrl: string }) {
  const [fotos, setFotos] = useState<string[]>(iniciais);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function adicionar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro("");
    const vagas = MAX_FOTOS - fotos.length;
    const escolhidas = Array.from(arquivos).slice(0, vagas);
    if (arquivos.length > vagas) setErro(`Máximo de ${MAX_FOTOS} fotos.`);
    setEnviando(true);
    const supabase = criarClienteNavegador();
    const novas: string[] = [];
    for (const arquivo of escolhidas) {
      try {
        const comprimida = await comprimirImagem(arquivo);
        const destino = `${uid}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage
          .from("fotos-itens")
          .upload(destino, comprimida, { contentType: "image/webp" });
        if (error) throw error;
        novas.push(destino);
      } catch {
        setErro("Uma das fotos não pôde ser enviada. Use JPG, PNG ou WebP.");
      }
    }
    setFotos((atuais) => [...atuais, ...novas]);
    setEnviando(false);
  }

  return (
    <div className="flex flex-col gap-2 text-sm font-medium">
      <span>
        Fotos ({fotos.length}/{MAX_FOTOS})
      </span>
      <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />
      <div className="grid grid-cols-3 gap-2">
        {fotos.map((caminho, i) => (
          <div key={caminho} className="relative aspect-square overflow-hidden rounded-xl bg-gelo">
            <img
              src={`${supabaseUrl}/storage/v1/object/public/fotos-itens/${caminho}`}
              alt={`Foto ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setFotos((atuais) => atuais.filter((f) => f !== caminho))}
              className="absolute top-1 right-1 rounded-full bg-petroleo/90 px-2 py-0.5 text-xs text-branco"
              aria-label={`Remover foto ${i + 1}`}
            >
              ✕
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded-full bg-petroleo/90 px-2 py-0.5 text-[10px] text-branco">
                Capa
              </span>
            )}
          </div>
        ))}
        {fotos.length < MAX_FOTOS && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-petroleo/40 text-center text-xs font-normal">
            {enviando ? "Enviando..." : "+ Adicionar"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              data-campo="fotos"
              onChange={(e) => adicionar(e.target.files)}
            />
          </label>
        )}
      </div>
      {erro && <span className="font-normal text-red-800">{erro}</span>}
      <span className="text-xs font-normal text-petroleo/70">
        A primeira é a capa. As fotos são reduzidas automaticamente antes do envio.
      </span>
    </div>
  );
}

// Miniatura de foto (usada nos painéis)
export function Miniatura({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="h-16 w-16 shrink-0 rounded-xl bg-gelo object-cover" />;
}
