import type { GalleryArt, ReviewStatus, TaskRow } from "../../api";

// Um item do mural é uma TAREFA: a arte mostrada é a versão mais nova dela
export type MuralItem = {
  task: TaskRow;
  latest: GalleryArt | null;
  versions: GalleryArt[]; // da mais nova para a mais antiga
  comments: number;
};

export type MuralState = ReviewStatus | "empty";

export const STATE_LABEL: Record<MuralState, string> = {
  pending: "Em revisão",
  approved: "Aprovada",
  changes_requested: "Ajustes pedidos",
  empty: "Aguardando arte",
};

export function stateOf(item: MuralItem): MuralState {
  return item.latest?.status ?? "empty";
}

export function buildMural(tasks: TaskRow[], arts: GalleryArt[]): MuralItem[] {
  return tasks.map((task) => {
    const versions = arts.filter((art) => art.task_id === task.id).sort((a, b) => b.id - a.id);
    return {
      task,
      latest: versions[0] ?? null,
      versions,
      comments: versions.filter((art) => art.comment).length,
    };
  });
}

// Mesma entrada, mesma saída: cada tarefa e cada pessoa têm sempre a mesma cor
function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0;
  return value;
}

// Paleta do projeto (index.css): vinho, sálvia, terracota, areia, rosé e verde-musgo
const ACCENTS = ["#6b2737", "#8e9b8a", "#b5533c", "#b89b7a", "#a15c6b", "#56634f"];

export function accentOf(seed: number | string): string {
  return ACCENTS[hash(String(seed)) % ACCENTS.length];
}

const AVATARS = [
  { bg: "#f5e9eb", fg: "#6b2737" },
  { bg: "#e1e8dd", fg: "#56634f" },
  { bg: "#f8ebe5", fg: "#b5533c" },
  { bg: "#efe6da", fg: "#7d6033" },
  { bg: "#f3e4e7", fg: "#a15c6b" },
  { bg: "#e9ece6", fg: "#4a5446" },
];

export function avatarOf(name: string) {
  return AVATARS[hash(name.toLowerCase()) % AVATARS.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? "");
  return (first + last).toUpperCase();
}

export function niceName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link externo";
  }
}

// "Hoje, 10:42" / "Ontem, 16:30" / "3 nov, 09:18"
export function whenLabel(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `Hoje, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${time}`;
  const day = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
  return `${day}, ${time}`;
}

// due_date chega como "2026-11-12": montar a data à mão evita o fuso jogar para o dia anterior
export function dueLabel(due: string): string {
  const [year, month, day] = due.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// "há 12 min", "há 3 h", "há 2 dias": quanto tempo a arte está esperando
export function sinceLabel(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}
