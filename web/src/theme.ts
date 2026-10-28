import type { Status } from "./api";

// Recharts precisa das cores em hex (não lê variáveis CSS), por isso ficam aqui também
export const STATUS_COLOR: Record<Status, string> = {
  pending: "#b9bca4",
  in_progress: "#ffbe00",
  done: "#4b5320",
};

// Cor do número dentro de cada segmento (contraste: escuro no claro, branco no verde)
export const STATUS_TEXT_COLOR: Record<Status, string> = {
  pending: "#1a1a1a",
  in_progress: "#1a1a1a",
  done: "#ffffff",
};
