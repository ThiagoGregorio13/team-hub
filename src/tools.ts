import{sql} from "bun"
import {
  GoogleGenAI,
  Type,
  type FunctionDeclaration,
  type Content,
} from "@google/genai";

const ai = new GoogleGenAI({});
const MODEL = "gemini-3.1-flash-lite";

export type TaskRow = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  member_name: string;
};

export type StatusCount = { status: string; total: number };
export type MemberCount = { name: string; total: number };
export type DeliveryTime = { avg_hours: number };

export async function getTasks(): Promise<TaskRow[]> {
  const rows: TaskRow[] = await sql`
    SELECT tasks.id, tasks.title, tasks.status,
           tasks.due_date::text AS due_date,
           members.name AS member_name
    FROM tasks
    LEFT JOIN members ON tasks.member_id = members.id
  `;
  return rows;
}

export async function getTaskByMember(member_name: string): Promise<TaskRow[]> {
  const rows: TaskRow[] = await sql`
  SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
  FROM tasks
  LEFT JOIN members ON tasks.member_id = members.id
  WHERE UPPER(members.name) = UPPER(${member_name})
  `;
  return rows;
}

export async function getOverdueTasks(): Promise<TaskRow[]> {
  const rows: TaskRow[] = await sql`
  SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
  FROM tasks
  LEFT JOIN members ON tasks.member_id = members.id
  WHERE tasks.due_date < CURRENT_DATE 
  AND tasks.status <> 'done'
  `;
  return rows;
}

export async function searchNotes(query: string) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: query,
    config: { outputDimensionality: 768 },
  });
  const questionVector = JSON.stringify(response.embeddings![0].values!);

  const rows = await sql`
    SELECT content, 1 - (embedding <=> ${questionVector}::vector) AS score
    FROM notes
    ORDER BY embedding <=> ${questionVector}::vector
    LIMIT 3
  `;

  return rows;
}

export async function getStatsByStatus(): Promise<StatusCount[]> {
  const rows: StatusCount[] = await sql`
   SELECT status, COUNT(tasks.member_id):: int AS total FROM tasks GROUP BY status;
  `;
  return rows;
}

export async function getStatsByMember(): Promise<MemberCount[]> {
  const rows: MemberCount[] = await sql`
   SELECT name, COUNT(tasks.member_id):: int AS total FROM members LEFT JOIN tasks  ON tasks.member_id = members.id GROUP BY members.name;
  `;
  return rows;
}