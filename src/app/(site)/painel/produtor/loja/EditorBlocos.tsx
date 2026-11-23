"use client";
// Editores de cada bloco da loja (banners, coleções, sobre, vídeo, perguntas, anúncio,
// cabeçalho e rodapé). Tudo muda o tema em JSON; a prévia ao vivo lê o mesmo tema.
// Sem HTML nem CSS livre: só campos de texto, links https e imagens do próprio lojista.
import { useId, useState } from "react";
import { EnviarArquivo } from "@/components/arquivos";
import { formatarPreco } from "@/lib/produtor";
import type { ItemLoja } from "@/lib/publico";
import { ROTULO_NICHO } from "@/lib/lista";
import {
  MAX_BANNERS,
  MAX_DESTAQUES,
  MAX_FAQ,
  MAX_FRASE_BANNER,
  MAX_LINKS,
  lerVideo,
  urlDoVideo,
  type BannerTema,
  type TemaLoja,
  type TipoSecao,
} from "@/lib/tema-loja";

export type MudarTema = (f: (t: TemaLoja) => TemaLoja) => void;

export const classeCampo = "min-h-11 w-full rounded-xl border border-petroleo/60 bg-branco px-4 py-2.5 text-base font-normal outline-none focus:border-petroleo focus:ring-2 focus:ring-ciano";
export const classeBotaoPequeno =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-petroleo/60 bg-branco px-3 text-sm font-medium text-petroleo hover:bg-gelo disabled:cursor-not-allowed disabled:opacity-40";

function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  max,
  dica,
  linhas,
  tipo = "text",
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  max: number;
  dica?: string;
  linhas?: number;
  tipo?: "text" | "url";
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={id}>
      {rotulo}
      {linhas ? (
        <textarea id={id} rows={linhas} maxLength={max} value={valor} onChange={(e) => aoMudar(e.target.value)} className={classeCampo} aria-describedby={`${id}-d`} />
      ) : (
        <input id={id} type={tipo} inputMode={tipo === "url" ? "url" : undefined} maxLength={max} value={valor} placeholder={placeholder} onChange={(e) => aoMudar(e.target.value)} className={classeCampo} aria-describedby={`${id}-d`} autoCapitalize="none" />
      )}
      <span id={`${id}-d`} className="text-xs font-normal text-petroleo/70">
        {dica ? `${dica} ` : ""}
        {valor.length} de {max} letras.
      </span>
    </label>
  );
}

function Marcador({ rotulo, marcado, aoMudar, dica }: { rotulo: string; marcado: boolean; aoMudar: (v: boolean) => void; dica?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo">
      <input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo" />
      <span>
        <span className="block font-medium">{rotulo}</span>
        {dica && <span className="block text-petroleo/70">{dica}</span>}
      </span>
    </label>
  );
}

// Upload de imagem com botão de remover (o envio usa a pasta do próprio usuário)
export function CampoImagem({
  rotulo,
  valor,
  aoMudar,
  uid,
  prefixo,
  dica,
}: {
  rotulo: string;
  valor: string | null;
  aoMudar: (v: string | null) => void;
  uid: string;
  prefixo: string;
  dica?: string;
}) {
  const [chave, setChave] = useState(0);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <EnviarArquivo
        key={chave}
        bucket="fotos-itens"
        campo={`img-${id}`}
        rotulo={rotulo}
        uid={uid}
        prefixo={prefixo}
        aceita="image/jpeg,image/png,image/webp"
        caminhoInicial={valor}
        tamanhoMaximoMb={5}
        dica={dica}
        aoMudar={(c) => aoMudar(c)}
      />
      {valor && (
        <button
          type="button"
          className={`${classeBotaoPequeno} self-start`}
          onClick={() => {
            aoMudar(null);
            setChave((k) => k + 1);
          }}
        >
          Remover imagem
          <span className="sr-only">: {rotulo}</span>
        </button>
      )}
    </div>
  );
}

const rotuloCategoria = (c: string) => ROTULO_NICHO[c] ?? c.replace(/_/g, " ");
const bloco = "flex flex-col gap-4 rounded-2xl border border-petroleo/15 bg-gelo/40 p-4";

// ---------------------------------------------------------------- banners
function EditorBanners({ tema, mudar, uid, itens }: { tema: TemaLoja; mudar: MudarTema; uid: string; itens: ItemLoja[] }) {
  const editar = (i: number, parte: Partial<BannerTema>) => mudar((t) => ({ ...t, banners: t.banners.map((b, k) => (k === i ? { ...b, ...parte } : b)) }));
  const mover = (i: number, d: -1 | 1) =>
    mudar((t) => {
      const j = i + d;
      if (j < 0 || j >= t.banners.length) return t;
      const b = [...t.banners];
      [b[i], b[j]] = [b[j], b[i]];
      return { ...t, banners: b };
    });
  return (
    <div className="flex flex-col gap-4">
      {tema.banners.length === 0 && (
        <p className="text-sm text-petroleo/80">Sem banners, a loja mostra a apresentação com o nome e a descrição. Adicione até {MAX_BANNERS} banners.</p>
      )}
      {tema.banners.map((b, i) => {
        const escolha = b.produto ?? (b.url !== null ? "__url" : "");
        return (
          <fieldset key={i} className={bloco}>
            <legend className="px-1 text-base font-semibold">Banner {i + 1}</legend>
            <CampoImagem rotulo={`Imagem do banner ${i + 1} para computador`} valor={b.imagem} aoMudar={(v) => editar(i, { imagem: v })} uid={uid} prefixo="banner" dica="JPG, PNG ou WebP, até 5 MB. Larga, como 1600 por 700 pixels, com o assunto no centro. Só envie imagem que a loja tem direito de usar." />
            <CampoImagem rotulo={`Imagem do banner ${i + 1} para celular (opcional)`} valor={b.celular} aoMudar={(v) => editar(i, { celular: v })} uid={uid} prefixo="banner-cel" dica="Em pé, como 800 por 1000 pixels. Sem ela, usamos a do computador." />
            <CampoTexto rotulo="Frase" valor={b.frase ?? ""} aoMudar={(v) => editar(i, { frase: v || null })} max={MAX_FRASE_BANNER} dica="Aparece sobre a imagem." />
            <CampoTexto rotulo="Descrição da imagem (opcional)" valor={b.alt ?? ""} aoMudar={(v) => editar(i, { alt: v || null })} max={120} dica="Para quem não enxerga a imagem. Se a frase já diz tudo, deixe em branco." />
            <label className="flex flex-col gap-1 text-sm font-medium">
              O botão do banner leva a
              <select
                value={escolha}
                onChange={(e) => {
                  const v = e.target.value;
                  editar(i, v === "__url" ? { produto: null, url: "https://" } : { produto: v || null, url: null });
                }}
                className={classeCampo}
              >
                <option value="">Nenhum botão</option>
                {itens.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
                <option value="__url">Outro link (https)</option>
              </select>
            </label>
            {escolha === "__url" && <CampoTexto rotulo="Link do botão" tipo="url" valor={b.url ?? ""} aoMudar={(v) => editar(i, { url: v })} max={200} dica="Precisa começar com https://" />}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={classeBotaoPequeno} disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir banner ${i + 1}`}>
                <span aria-hidden="true">↑</span>
              </button>
              <button type="button" className={classeBotaoPequeno} disabled={i === tema.banners.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer banner ${i + 1}`}>
                <span aria-hidden="true">↓</span>
              </button>
              <button type="button" className={classeBotaoPequeno} onClick={() => mudar((t) => ({ ...t, banners: t.banners.filter((_, k) => k !== i) }))}>
                Remover banner {i + 1}
              </button>
            </div>
          </fieldset>
        );
      })}
      <button
        type="button"
        className={`${classeBotaoPequeno} self-start`}
        disabled={tema.banners.length >= MAX_BANNERS}
        onClick={() => mudar((t) => ({ ...t, banners: [...t.banners, { imagem: null, celular: null, frase: null, alt: null, produto: null, url: null }] }))}
      >
        Adicionar banner ({tema.banners.length} de {MAX_BANNERS})
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- destaques
function EditorDestaques({ tema, mudar, itens }: { tema: TemaLoja; mudar: MudarTema; itens: ItemLoja[] }) {
  if (itens.length === 0) return <p className="text-sm text-petroleo/80">Seus produtos aparecem aqui depois de aprovados.</p>;
  return (
    <>
      <p className="text-sm text-petroleo/80" role="status">
        {tema.destaques.length} de {MAX_DESTAQUES} escolhidos.
      </p>
      <ul className="flex flex-col gap-2">
        {itens.map((i) => {
          const marcado = tema.destaques.includes(i.id);
          const cheio = !marcado && tema.destaques.length >= MAX_DESTAQUES;
          return (
            <li key={i.id}>
              <label
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 py-2 text-sm has-[:checked]:border-petroleo has-[:checked]:bg-gelo has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petroleo ${cheio ? "border-petroleo/20 opacity-60" : "border-petroleo/40"}`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={cheio}
                  onChange={() => mudar((t) => ({ ...t, destaques: marcado ? t.destaques.filter((d) => d !== i.id) : [...t.destaques, i.id] }))}
                  className="h-5 w-5 shrink-0 accent-petroleo"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{i.nome}</span>
                <span className="shrink-0 text-petroleo/70">{formatarPreco(i.preco_centavos)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- coleções (uma imagem por categoria)
function EditorColecoes({ tema, mudar, uid, itens }: { tema: TemaLoja; mudar: MudarTema; uid: string; itens: ItemLoja[] }) {
  const categorias = [...new Set(itens.map((i) => i.categoria).filter((c): c is string => !!c))].slice(0, 6);
  if (categorias.length < 2) return <p className="text-sm text-petroleo/80">As coleções aparecem quando a loja tem produtos em 2 ou mais categorias.</p>;
  return (
    <>
      <p className="text-sm text-petroleo/80">Sem imagem, usamos a foto do primeiro produto da categoria.</p>
      {categorias.map((c) => (
        <CampoImagem
          key={c}
          rotulo={`Imagem da coleção ${rotuloCategoria(c)}`}
          valor={tema.colecoes.find((x) => x.categoria === c)?.imagem ?? null}
          aoMudar={(v) =>
            mudar((t) => ({ ...t, colecoes: [...t.colecoes.filter((x) => x.categoria !== c), ...(v ? [{ categoria: c, imagem: v }] : [])] }))
          }
          uid={uid}
          prefixo="colecao"
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- sobre a marca
function EditorSobre({ tema, mudar, uid }: { tema: TemaLoja; mudar: MudarTema; uid: string }) {
  const editar = (parte: Partial<TemaLoja["sobre"]>) => mudar((t) => ({ ...t, sobre: { ...t.sobre, ...parte } }));
  return (
    <>
      <CampoTexto rotulo="Título" valor={tema.sobre.titulo ?? ""} aoMudar={(v) => editar({ titulo: v || null })} max={60} dica="Em branco: Sobre a marca." />
      <CampoTexto rotulo="Texto" linhas={5} valor={tema.sobre.texto ?? ""} aoMudar={(v) => editar({ texto: v || null })} max={800} dica="Em branco: usamos a descrição da loja." />
      <CampoImagem rotulo="Imagem (opcional)" valor={tema.sobre.imagem} aoMudar={(v) => editar({ imagem: v })} uid={uid} prefixo="sobre" />
    </>
  );
}

// ---------------------------------------------------------------- vídeo
function EditorVideo({ tema, mudar }: { tema: TemaLoja; mudar: MudarTema }) {
  const [url, setUrl] = useState(tema.video ? urlDoVideo(tema.video) : "");
  const lido = url.trim() ? lerVideo(url) : null;
  return (
    <>
      <CampoTexto
        rotulo="Link do vídeo"
        tipo="url"
        valor={url}
        max={200}
        aoMudar={(v) => {
          setUrl(v);
          const l = v.trim() ? lerVideo(v) : null;
          mudar((t) => ({ ...t, video: l ? { ...l, titulo: t.video?.titulo ?? null } : null }));
        }}
        dica="YouTube ou Vimeo."
      />
      <p role="status" className="text-sm text-petroleo/80">
        {!url.trim() ? "Sem link, o bloco fica escondido." : lido ? `${lido.plataforma === "youtube" ? "YouTube" : "Vimeo"} reconhecido.` : "Use um link do YouTube ou do Vimeo."}
      </p>
      <CampoTexto rotulo="Título do vídeo (opcional)" valor={tema.video?.titulo ?? ""} aoMudar={(v) => mudar((t) => (t.video ? { ...t, video: { ...t.video, titulo: v || null } } : t))} max={80} />
      <p className="text-xs text-petroleo/70">O vídeo só é carregado quando o cliente toca em Assistir. Antes disso, nada do YouTube ou do Vimeo é aberto.</p>
    </>
  );
}

// ---------------------------------------------------------------- perguntas frequentes
function EditorFaq({ tema, mudar }: { tema: TemaLoja; mudar: MudarTema }) {
  const editar = (i: number, parte: Partial<TemaLoja["faq"][number]>) => mudar((t) => ({ ...t, faq: t.faq.map((f, k) => (k === i ? { ...f, ...parte } : f)) }));
  return (
    <>
      {tema.faq.map((f, i) => (
        <fieldset key={i} className={bloco}>
          <legend className="px-1 text-base font-semibold">Pergunta {i + 1}</legend>
          <CampoTexto rotulo="Pergunta" valor={f.p} aoMudar={(v) => editar(i, { p: v })} max={120} />
          <CampoTexto rotulo="Resposta" linhas={3} valor={f.r} aoMudar={(v) => editar(i, { r: v })} max={600} />
          <button type="button" className={`${classeBotaoPequeno} self-start`} onClick={() => mudar((t) => ({ ...t, faq: t.faq.filter((_, k) => k !== i) }))}>
            Remover pergunta {i + 1}
          </button>
        </fieldset>
      ))}
      <button type="button" className={`${classeBotaoPequeno} self-start`} disabled={tema.faq.length >= MAX_FAQ} onClick={() => mudar((t) => ({ ...t, faq: [...t.faq, { p: "", r: "" }] }))}>
        Adicionar pergunta ({tema.faq.length} de {MAX_FAQ})
      </button>
    </>
  );
}

// ---------------------------------------------------------------- listas de links (cabeçalho e rodapé)
function EditorLinks({ links, aoMudar, nome }: { links: { rotulo: string; url: string }[]; aoMudar: (l: { rotulo: string; url: string }[]) => void; nome: string }) {
  return (
    <>
      {links.map((l, i) => (
        <fieldset key={i} className={bloco}>
          <legend className="px-1 text-base font-semibold">
            {nome} {i + 1}
          </legend>
          <CampoTexto rotulo="Nome do link" valor={l.rotulo} aoMudar={(v) => aoMudar(links.map((x, k) => (k === i ? { ...x, rotulo: v } : x)))} max={30} />
          <CampoTexto rotulo="Endereço" tipo="url" valor={l.url} aoMudar={(v) => aoMudar(links.map((x, k) => (k === i ? { ...x, url: v } : x)))} max={200} dica="Começa com https://" />
          <button type="button" className={`${classeBotaoPequeno} self-start`} onClick={() => aoMudar(links.filter((_, k) => k !== i))}>
            Remover {nome.toLowerCase()} {i + 1}
          </button>
        </fieldset>
      ))}
      <button type="button" className={`${classeBotaoPequeno} self-start`} disabled={links.length >= MAX_LINKS} onClick={() => aoMudar([...links, { rotulo: "", url: "https://" }])}>
        Adicionar link ({links.length} de {MAX_LINKS})
      </button>
    </>
  );
}

// ---------------------------------------------------------------- blocos fixos: anúncio, cabeçalho, rodapé
export function EditorAnuncio({ tema, mudar }: { tema: TemaLoja; mudar: MudarTema }) {
  const editar = (parte: Partial<TemaLoja["anuncio"]>) => mudar((t) => ({ ...t, anuncio: { ...t.anuncio, ...parte } }));
  return (
    <>
      <Marcador rotulo="Mostrar a faixa no topo da loja" marcado={tema.anuncio.visivel} aoMudar={(v) => editar({ visivel: v })} />
      <CampoTexto rotulo="Texto" valor={tema.anuncio.texto ?? ""} aoMudar={(v) => editar({ texto: v || null })} max={100} dica="Diga só o que a loja de fato oferece." />
      <CampoTexto rotulo="Link (opcional)" tipo="url" valor={tema.anuncio.url ?? ""} aoMudar={(v) => editar({ url: v || null })} max={200} dica="Começa com https://" />
    </>
  );
}

export function EditorCabecalho({ tema, mudar }: { tema: TemaLoja; mudar: MudarTema }) {
  const editar = (parte: Partial<TemaLoja["cabecalho"]>) => mudar((t) => ({ ...t, cabecalho: { ...t.cabecalho, ...parte } }));
  return (
    <>
      <p className="text-sm text-petroleo/80">O logo vem da seção Logo, cores e fonte.</p>
      <Marcador rotulo="Campo de busca" marcado={tema.cabecalho.busca} aoMudar={(v) => editar({ busca: v })} />
      <Marcador rotulo="Menu com as categorias dos produtos" marcado={tema.cabecalho.menu} aoMudar={(v) => editar({ menu: v })} />
      <EditorLinks links={tema.cabecalho.links} aoMudar={(links) => editar({ links })} nome="Link do menu" />
    </>
  );
}

export function EditorRodape({ tema, mudar }: { tema: TemaLoja; mudar: MudarTema }) {
  const editar = (parte: Partial<TemaLoja["rodape"]>) => mudar((t) => ({ ...t, rodape: { ...t.rodape, ...parte } }));
  const rede = (chave: "instagram" | "facebook" | "tiktok" | "youtube", rotulo: string) => (
    <CampoTexto key={chave} rotulo={rotulo} valor={tema.rodape[chave] ?? ""} aoMudar={(v) => editar({ [chave]: v || null })} max={40} dica="Só o usuário, como minhaloja." />
  );
  return (
    <>
      <p className="text-sm text-petroleo/80">O e-mail de contato e os dados legais da loja aparecem sozinhos. Aqui você acrescenta redes e links.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rede("instagram", "Instagram")}
        {rede("facebook", "Facebook")}
        {rede("tiktok", "TikTok")}
        {rede("youtube", "YouTube")}
      </div>
      <CampoTexto rotulo="WhatsApp" tipo="text" valor={tema.rodape.whatsapp ?? ""} aoMudar={(v) => editar({ whatsapp: v || null })} max={20} dica="DDD e número, como 11 99999-0000." />
      <EditorLinks links={tema.rodape.links} aoMudar={(links) => editar({ links })} nome="Link do rodapé" />
    </>
  );
}

// ---------------------------------------------------------------- bloco reordenável
export function EditorSecao({ tipo, tema, mudar, uid, itens }: { tipo: TipoSecao; tema: TemaLoja; mudar: MudarTema; uid: string; itens: ItemLoja[] }) {
  switch (tipo) {
    case "banner":
      return <EditorBanners tema={tema} mudar={mudar} uid={uid} itens={itens} />;
    case "destaques":
      return <EditorDestaques tema={tema} mudar={mudar} itens={itens} />;
    case "colecoes":
      return <EditorColecoes tema={tema} mudar={mudar} uid={uid} itens={itens} />;
    case "sobre":
      return <EditorSobre tema={tema} mudar={mudar} uid={uid} />;
    case "video":
      return <EditorVideo tema={tema} mudar={mudar} />;
    case "faq":
      return <EditorFaq tema={tema} mudar={mudar} />;
    default:
      return null; // mais vendidos, todos, categorias e trocas usam dados reais da loja
  }
}
export const TEM_EDICAO: TipoSecao[] = ["banner", "destaques", "colecoes", "sobre", "video", "faq"];
