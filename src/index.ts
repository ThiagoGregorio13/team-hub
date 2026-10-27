import { Hono } from "hono";
import { sql } from "bun";
import { GoogleGenAI } from "@google/genai";

const app = new Hono();
const ai = new GoogleGenAI({});
const MODEL = "gemini-3-flash-preview";

type TaskRow = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  member_name: string;
};

app.get("/tasks", async (c) => {
  const rows: TaskRow[] = await sql`
    SELECT tasks.id, tasks.title, tasks.status,
           tasks.due_date::text AS due_date,
           members.name AS member_name
    FROM tasks
    LEFT JOIN members ON tasks.member_id = members.id
  `;
  return c.json(rows);
});

app.get("/ai/summary", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows: TaskRow[] = await sql`
    SELECT tasks.id, tasks.title, tasks.status,
           tasks.due_date::text AS due_date,
           members.name AS member_name
    FROM tasks
    LEFT JOIN members ON tasks.member_id = members.id
  `;
  const prompt = `Today is ${today}. You are a team management assistant.
Team tasks (JSON): ${JSON.stringify(rows)}

In up to 5 lines, tell me:
- which tasks are OVERDUE (due_date before today and status other than done) and who owns them
- who has the heaviest workload
- one practical suggestion for the manager
`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return c.json({ summary: response.text, date: today });
});

app.post("/ai/ask", async (c) => {
  const body = await c.req.json();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Answer this question in up to 3 lines: ${body.question}`,
  });
  return c.json({ answer: response.text });
});

export default app;
