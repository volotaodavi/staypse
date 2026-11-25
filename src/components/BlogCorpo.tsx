// Renderiza o corpo de um artigo do blog (blocos em src/conteudo/blog).
import Link from "next/link";
import type { Bloco } from "@/conteudo/blog";

const LINK = "font-medium underline decoration-petroleo/40 underline-offset-2 hover:decoration-petroleo";

// [rótulo](destino) vira link e **texto** vira negrito
function Texto({ x }: { x: string }) {
  return (
    <>
      {x.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/).map((parte, i) => {
        const l = parte.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (l) {
          return l[2].startsWith("http") ? (
            <a key={i} href={l[2]} target="_blank" rel="noopener noreferrer" className={LINK}>
              {l[1]}
            </a>
          ) : (
            <Link key={i} href={l[2]} className={LINK}>
              {l[1]}
            </Link>
          );
        }
        const n = parte.match(/^\*\*([^*]+)\*\*$/);
        return n ? <strong key={i} className="font-medium">{n[1]}</strong> : parte;
      })}
    </>
  );
}

export function BlogCorpo({ corpo }: { corpo: Bloco[] }) {
  return (
    <div className="text-[1.0625rem] leading-8">
      {corpo.map((b, i) => {
        if (b[0] === "h2") return <h2 key={i} className="mt-10 mb-3 text-2xl leading-snug font-extrabold">{b[1] as string}</h2>;
        if (b[0] === "p") return <p key={i} className="mt-4"><Texto x={b[1] as string} /></p>;
        const Lista = b[0] === "ul" ? "ul" : "ol";
        return (
          <Lista key={i} className={`mt-4 space-y-2 pl-6 ${b[0] === "ul" ? "list-disc" : "list-decimal"} marker:text-petroleo/60`}>
            {(b[1] as string[]).map((item, j) => (
              <li key={j}><Texto x={item} /></li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}
