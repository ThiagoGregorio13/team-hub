import { Hono } from "hono";
import { sql } from "bun";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";

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

async function getTasks(): Promise<TaskRow[]> {
  const rows: TaskRow[] = await sql`
    SELECT tasks.id, tasks.title, tasks.status,
           tasks.due_date::text AS due_date,
           members.name AS member_name
    FROM tasks
    LEFT JOIN members ON tasks.member_id = members.id
  `;
  return rows;
}

async function getTaskByMember(member_name: string): Promise<TaskRow[]> {
  const rows: TaskRow[] = await sql`
  SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
  FROM tasks
  LEFT JOIN members ON tasks.member_id = members.id
  WHERE members.name = ${member_name}
  `;
  return rows;
}

app.get("/tasks", async (c) => {
  const rows: TaskRow[] = await getTasks();
  return c.json(rows);
});

app.get("/ai/summary", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows: TaskRow[] = await getTasks();

  const prompt = `Today is ${today}. You are a team management assistant.
Team tasks (JSON): ${JSON.stringify(rows)}

In up to 5 lines, tell me:
- which tasks are OVERDUE (due_date before today and status other than done) and who owns them
- who has the heaviest workload
- one practical suggestion for the manager
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return c.json({ summary: response.text, date: today, rows: rows });
  } catch (error) {
    console.error("Error generating summary", error);
    return c.json({ error: "Failed to generate summary" }, 503);
  }
});

const getTasksByMemberDeclaration: FunctionDeclaration = {
  name: "get_tasks_by_member",
  description: "a member's tasks.",
  parameters: {
    type: Type.OBJECT,

    properties: {
      member_name: {
        type: Type.STRING,
        description: "The name of the member whose tasks to retrieve.",
      },
    },
    required: ["member_name"],
  },
};

app.post("/ai/chat", async (c) => {
  const body = await c.req.json();

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: body.question,
      config: {
        tools: [{ functionDeclarations: [getTasksByMemberDeclaration] }],
      },
    });

    const call = response.functionCalls?.[0];
    if (call?.name === "get_tasks_by_name") {
      const member_name = call.args?.member_name as string;
      const data = await getTaskByMember(member_name);
      return c.json({ tool: call.name, args: call.args, data: data });
    }

    return c.json({
      text: response.text,
      functionCalls: response.functionCalls,
    });
  } catch (error) {
    console.error("Error generating chat response", error);
    return c.json({ error: "Failed to process chat" }, 503);
  }
});

app.post("/ai/ask", async (c) => {
  const body = await c.req.json();
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Answer this question in up to 3 lines: ${body.question}`,
    });
    return c.json({ answer: response.text });
  } catch (error) {
    console.error("Error generating answer", error);
    return c.json({ error: "Failed to generate answer" }, 503);
  }
});

export default app;
