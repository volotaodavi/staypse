// As 5 fontes que as lojas podem escolher. Cada uma vira uma variável CSS
// (--fonte-inter etc.); a loja aponta --loja-fonte para a escolhida.
// preload: false → o navegador só baixa a fonte que a página usa de verdade.
import { DM_Sans, Inter, Outfit, Playfair_Display, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--fonte-inter", display: "swap", preload: false });
const outfit = Outfit({ subsets: ["latin"], variable: "--fonte-outfit", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--fonte-dm-sans", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--fonte-playfair", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--fonte-space-grotesk", display: "swap", preload: false });

// Classes que declaram as 5 variáveis (colocar no elemento que envolve a loja)
export const classesFontesLoja = [inter, outfit, dmSans, playfair, spaceGrotesk].map((f) => f.variable).join(" ");
