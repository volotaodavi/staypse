// Manifesto do app: nome, cores e ícones oficiais quando a pessoa usa
// "Adicionar à tela inicial" no celular. Ícones em public/brand (guia da marca).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Staypse",
    short_name: "Staypse",
    description: "Plataforma de afiliados para produtos físicos e digitais.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF6F5",
    theme_color: "#062C30",
    icons: [
      { src: "/brand/staypse-icone-app-192px.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/staypse-icone-app-512px.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/staypse-icone-app.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
