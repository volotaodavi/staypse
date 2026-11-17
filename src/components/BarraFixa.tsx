"use client";
// Botão fixo no rodapé da tela (só no celular): aparece depois que a pessoa
// passa do topo e some quando o formulário da lista de espera está na tela.
import { useEffect, useState } from "react";

export function BarraFixa() {
  const [topoVisivel, setTopoVisivel] = useState(true);
  const [formularioVisivel, setFormularioVisivel] = useState(false);

  useEffect(() => {
    const topo = document.getElementById("topo");
    const lista = document.getElementById("lista");
    if (!topo || !lista) return;
    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === topo) setTopoVisivel(e.isIntersecting);
        if (e.target === lista) setFormularioVisivel(e.isIntersecting);
      }
    });
    observador.observe(topo);
    observador.observe(lista);
    return () => observador.disconnect();
  }, []);

  const mostrar = !topoVisivel && !formularioVisivel;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 p-3 transition-transform duration-300 sm:hidden ${
        mostrar ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!mostrar}
    >
      <a
        href="#lista"
        tabIndex={mostrar ? 0 : -1}
        className="block rounded-full bg-ciano py-4 text-center font-medium text-petroleo shadow-[0_10px_30px_-10px_rgba(6,44,48,0.6)]"
      >
        Entrar na lista de espera
      </a>
    </div>
  );
}
