import type { Status } from "./api";

// SVG não lê variáveis CSS em todo lugar, então as cores dos gráficos ficam aqui também
export const STATUS_COLOR: Record<Status, string> = {
  pending: "#b9bca4",
  in_progress: "#ffbe00",
  done: "#4b5320",
};

// Cada membro ganha uma cor fixa (pela posição na lista) para o avatar
const MEMBER_COLORS = [
  { bg: "#4b5320", fg: "#f4f6de" },
  { bg: "#ffbe00", fg: "#1b1d12" },
  { bg: "#5c083e", fg: "#f7e8f0" },
  { bg: "#8a8f5c", fg: "#ffffff" },
  { bg: "#c9a227", fg: "#1b1d12" },
];

export function memberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
