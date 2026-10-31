import type { Status } from "./api";

// SVG não lê variáveis CSS em todo lugar, então as cores dos gráficos ficam aqui também
// (mesmos valores de --sage-light, --sage e --primary do index.css)
export const STATUS_COLOR: Record<Status, string> = {
  pending: "#c5cbc1",
  in_progress: "#8e9b8a",
  done: "#6b2737",
};

// Cada membro ganha uma cor fixa (pela posição na lista) para o avatar.
// O terracota fica de fora: ele é a cor de "atrasada" e confundiria.
const MEMBER_COLORS = [
  { bg: "#6b2737", fg: "#f7f0e6" },
  { bg: "#8e9b8a", fg: "#ffffff" },
  { bg: "#b89b7a", fg: "#2a2023" },
  { bg: "#56634f", fg: "#ffffff" },
  { bg: "#a15c6b", fg: "#ffffff" },
];

export function memberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
