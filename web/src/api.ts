export type Status = "pending" | "in_progress" | "done";
export type ReviewStatus = "pending" | "approved" | "changes_requested";

export type TaskReview = {
  id: number;
  art_url: string;
  status: ReviewStatus;
  comment: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type TaskRow = {
  id: number;
  title: string;
  status: Status;
  due_date: string;
  member_name: string;
};

export type Member = {
  name: string;
  id: number;
};

export type DeliveryTime = {
  avg_hours: number | null;
};

export type StatusCount = { status: Status; total: number };
export type MemberCount = { name: string; total: number };

export type AiSummary = { summary: string; date: string };
export type ChecklistItem = {
  id: number;
  title: string;
  done: boolean;
};

export type ArtAnalysis = {
  colors:{name:string, hex:string, where:string}[];
  request_check:{request:string, observation:string}[];
  summary:string;
  texts:string[];
  style:string;
  elements:string[]
}

// Em dev o Vite repassa "/api" para localhost:3000 (vite.config.ts)
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

// Guarda o status para a tela diferenciar, por exemplo, senha errada (401) de email repetido (409)
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}


function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(res: Response) {
  if (res.status === 401 && getToken()) {
    clearToken();
    window.location.reload();
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  handleUnauthorized(res);
  if (!res.ok) {
    throw new ApiError(`GET ${path} falhou com status ${res.status}`, res.status);
  }
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    throw new ApiError(`PATCH ${path} falhou com status ${res.status}`, res.status);
  }
  return res.json();
}

// Sem <T> e sem res.json(): o DELETE responde 204, que não tem corpo para ler
async function del(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  handleUnauthorized(res);

  if (!res.ok) {
    throw new ApiError(`DELETE ${path} falhou com status ${res.status}`, res.status);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  handleUnauthorized(res);

  if (!res.ok) {
    throw new ApiError(`POST ${path} falhou com status ${res.status}`, res.status);
  }
  return res.json();
}

export type ChatAnswer = { text: string; steps: number };

export const getTasks = () => get<TaskRow[]>("/tasks");
export const getStatsByStatus = () => get<StatusCount[]>("/stats/by-status");
export const getStatsByMember = () => get<MemberCount[]>("/stats/by-member");
export const getAiSummary = () => get<AiSummary>("/ai/summary");
export const getOverdueTasks = () => get<TaskRow[]>("/tasks/overdue");
export const getDeliveryTime = () => get<DeliveryTime>("/stats/delivery-time");
export const patchStatus = (id: number, status: Status) =>
  patch<{ id: number; status: Status }>(`/tasks/${id}`, { status });
export const deleteTask = (id: number) => del(`/tasks/${id}`);
export const askTeam = (question: string) =>
  post<ChatAnswer>("/ai/chat", { question });
export const getMembers = () => get<Member[]>("/members");
export const getChecklist = (taskId: number) =>
  get<ChecklistItem[]>(`/tasks/${taskId}/checklist`);

export const addChecklistItem = (taskId: number, title: string) =>
  post<ChecklistItem>(`/tasks/${taskId}/checklist`, { title });

export const createTask = (
  title: string,
  member_id: number,
  due_date: string,
) => post<{ id: number }>("/tasks", { title, member_id, due_date });

export const getReviews = (taskId: number) =>
  get<TaskReview[]>(`/tasks/${taskId}/reviews`);

// Uma arte na galeria: a revisão mais o nome da tarefa e o número da versão
export type GalleryArt = TaskReview & {
  task_id: number;
  task_title: string;
  version: number;
};

export const getGallery = () => get<GalleryArt[]>("/reviews");

export type LoginResponse = {
  id: number;
  email: string;
  role: "member" | "admin";
  token: string;
};

const TOKEN_KEY = "team_hub_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const login = (email: string, password: string) =>
  post<LoginResponse>("/auth/login", { email, password });

export const register = (email: string, password: string) =>
  post<Omit<LoginResponse, "token">>("/auth/register", { email, password });

// Só decide o que mostrar na tela: quem confere a permissão de verdade é a API
export function isAdminSession(): boolean {
  const payload = getToken()?.split(".")[1];
  if (!payload) return false;

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).role === "admin";
  } catch {
    return false;
  }
}

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
};

// Mesma ordem em todos os gráficos e legendas
export const STATUS_ORDER: Status[] = ["pending", "in_progress", "done"];

// Data de hoje no fuso local, no mesmo formato do due_date ("2026-10-28").
export function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function isOverdue(task: TaskRow, today: string): boolean {
  return task.due_date < today && task.status !== "done";
}

export function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function daysUntil(dueDate: string, today: string): number {
  return toDayNumber(dueDate) - toDayNumber(today);
}

export function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
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

export function formatDuration(hours: number): string {
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);

  if (days === 0) return `${rest} h`;
  if (rest === 0) return plural(days, "dia");
  return `${plural(days, "dia")} e ${rest} h`;
}

export const toggleChecklistItem = (
  taskId: number,
  itemId: number,
  done: boolean,
) => patch<ChecklistItem>(`/tasks/${taskId}/checklist/${itemId}`, { done });

export const deleteChecklistItem = (taskId: number, itemId: number) =>
  del(`/tasks/${taskId}/checklist/${itemId}`);
export const submitReview = (taskId: number, artUrl: string) =>
  post<TaskReview>(`/tasks/${taskId}/reviews`, { art_url: artUrl });

export const decideReview = (
  taskId: number,
  reviewId: number,
  status: "approved" | "changes_requested",
  comment?: string,
) => patch<TaskReview>(`/tasks/${taskId}/reviews/${reviewId}`, { status, comment });

export const analyzeArt = (taskId: number, reviewId: number,
) =>
  post<ArtAnalysis>(`/tasks/${taskId}/reviews/${reviewId}/ai-analysis`, {});

// ---------- Base de conhecimento (notas que a IA consulta) ----------
export type Note = { id: number; content: string; created_at?: string };
export type NoteMatch = { content: string; score: number; relevant: boolean };

export const getNotes = () => get<Note[]>("/notes");
export const createNote = (content: string) => post<Note>("/notes", { content });
export const deleteNote = (id: number) => del(`/notes/${id}`);
export const searchNotesPreview = (q: string) => get<NoteMatch[]>(`/notes/search?q=${encodeURIComponent(q)}`);
