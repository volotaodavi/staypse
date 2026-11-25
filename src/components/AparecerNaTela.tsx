"use client";
// Faz os cartões do hero entrarem como notificações: aparecem ao entrar na tela
// e de novo cada vez que a pessoa rola para longe e volta (IntersectionObserver).
import { useEffect, useRef, useState } from "react";

export function AparecerNaTela({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} data-visivel={visivel ? "sim" : "nao"} className={className}>
      {children}
    </div>
  );
}
