// Mesmos formatos que a API devolve (ver team-hub/src/index.ts)
export type Status = "pending" | "in_progress" | "done";

export type TaskRow = {
  id: number;
  title: string;
  status: Status;
  due_date: string;
  member_name: string;
};

export type DeliveryTime = {
  avg_hours: number | null
}

export type StatusCount = { status: Status; total: number };
export type MemberCount = { name: string; total: number };

export type AiSummary = { summary: string; date: string };

// Em dev o Vite repassa "/api" para localhost:3000 (vite.config.ts)
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} falhou com status ${res.status}`);
  }
  return res.json();
}

async function patch<T>(path:string, body:unknown): Promise<T> {
const res = await fetch(`${API_URL}${path}`, {
  method: "PATCH",
  headers: {"Content-type": "application/json"},
  body: JSON.stringify(body)
})
if(!res.ok) {
      throw new Error(`PATCH ${path} falhou com status ${res.status}`);
}
return res.json()
}

export const getTasks = () => get<TaskRow[]>("/tasks");
export const getStatsByStatus = () => get<StatusCount[]>("/stats/by-status");
export const getStatsByMember = () => get<MemberCount[]>("/stats/by-member");
export const getAiSummary = () => get<AiSummary>("/ai/summary");
export const getOverdueTasks = () => get<TaskRow[]>("/tasks/overdue");
export const getDeliveryTime = () => get<DeliveryTime>("/stats/delivery-time")
export const patchStatus = (id:number, status:Status) => patch<{ id: number; status: Status }>(`/tasks/${id}`, {status})
export const STATUS_LABEL: Record<Status, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
};


// Mesma ordem em todos os gráficos e legendas
export const STATUS_ORDER: Status[] = ["pending", "in_progress", "done"];

// Data de hoje no fuso local, no mesmo formato do due_date ("2026-10-28").
// toISOString() usaria UTC e viraria o dia antes da hora certa no Brasil.
export function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// "2026-10-15" → "15/10/2026" (sem new Date, para não ter problema de fuso)
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Mesma regra do getOverdueTasks() da API; o MemberChart usa para pintar a data de vinho
export function isOverdue(task: TaskRow, today: string): boolean {
  return task.due_date < today && task.status !== "done";
}

// "2026-10-28" → número de dias desde 1970, sempre em UTC para a conta não depender do fuso
function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

// Positivo = faltam X dias; 0 = hoje; negativo = já passou
export function daysUntil(dueDate: string, today: string): number {
  return toDayNumber(dueDate) - toDayNumber(today);
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function describeDue(task: TaskRow, today: string): string {
  if (task.status === "done") return "concluída";
  const days = daysUntil(task.due_date, today);
  if (days < 0) return `atrasada há ${plural(-days, "dia")}`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `vence em ${days} dias`;
}

export function formatDuration(hours:number): string {
  const days = Math.floor(hours/24)
  const rest = Math.round(hours % 24)

  if(days === 0 ) return `${rest} h`
  if(rest === 0 ) return plural(days, "dia")
return `${plural(days, "dia")} e ${rest} h`;
}