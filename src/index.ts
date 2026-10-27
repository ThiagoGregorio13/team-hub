import { Hono } from "hono";
import { sql } from "bun";
import { GoogleGenAI } from "@google/genai";


const app = new Hono();
const ai = new GoogleGenAI({})
const MODEL = "gemini-3-flash-preview";


type TaskRow = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  member_name: string;
};

app.get("/tasks", async (c) => {
  const rows: TaskRow[] =
    await sql`SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date
, members.name AS member_name FROM tasks LEFT JOIN members ON tasks.member_id = members.id`;
  return c.json(rows);
});

app.post('/ai/ask', async (c) => {
const body = await c.req.json();
const response = await ai.models.generateContent({
model: MODEL,
contents: `Responda essa pergunta em ate 3 linhas: ${body.question}`,
});
return c.json({answer: response.text});
})

export default app;
