import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "bun";
import {
  GoogleGenAI,
  Type,
  type FunctionDeclaration,
  type Content,
} from "@google/genai";

const app = new Hono();
app.use("*", cors({origin: process.env.FRONTEND_URL ?? "http://localhost:5173"
}))
const ai = new GoogleGenAI({});
const MODEL = "gemini-3.1-flash-lite";

type TaskRow = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  member_name: string;
};

type StatusCount = { status: string; total: number };
type MemberCount = { name: string; total: number };
type DeliveryTime = {avg_hours: number}

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
  WHERE UPPER(members.name) = UPPER(${member_name})
  `;
  return rows;
}

async function getOverdueTasks(): Promise<TaskRow[]> {
  const rows: TaskRow[] = await sql`
  SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
  FROM tasks
  LEFT JOIN members ON tasks.member_id = members.id
  WHERE tasks.due_date < CURRENT_DATE 
  AND tasks.status <> 'done'
  `;
  return rows;
}

async function getStatsByStatus(): Promise<StatusCount[]> {
    const rows: StatusCount[] = await sql`
   SELECT status, COUNT(tasks.member_id):: int AS total FROM tasks GROUP BY status;
  `;
  return rows;
}

async function getStatsByMember(): Promise<MemberCount[]> {
    const rows: MemberCount[] = await sql`
   SELECT name, COUNT(tasks.member_id):: int AS total FROM members LEFT JOIN tasks  ON tasks.member_id = members.id GROUP BY members.name;
  `;
  return rows;
}

async function getStatsByAvgHours(): Promise<DeliveryTime[]>{
  const rows: DeliveryTime[] = await sql`
  SELECT (EXTRACT(EPOCH FROM AVG(completed_at - created_at)) / 3600)::float AS avg_hours
    FROM tasks
    WHERE status = 'done'`;
  return rows
}

app.get("/tasks", async (c) => {
  const rows: TaskRow[] = await getTasks();
  return c.json(rows);
});

app.get("/tasks/overdue", async (c) => {
   const rows: TaskRow[] = await getOverdueTasks();
  return c.json(rows);
})

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
    let response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return c.json({ summary: response.text, date: today, rows: rows });
  } catch (error) {
    console.error("Error generating summary", error);
    return c.json({ error: "Failed to generate summary" }, 503);
  }
});

const getOverdueTasksDeclaration: FunctionDeclaration = {
  name: "get_overdue_tasks",
  description:
    "Returns every task in the whole team that is overdue: due date before today and status not 'done'. " +
    "Use this for any question about overdue, late or delayed tasks, for the whole team or for a specific member. " +
    "Takes no arguments.",
};

const getTasksByMemberDeclaration: FunctionDeclaration = {
  name: "get_tasks_by_member",
  description:
    "Returns all tasks (any status and due date) assigned to ONE specific team member. " +
    "Only use this when the user mentions a member by name. " +
    "Do not use it to list tasks of the whole team, and do not use it for overdue tasks (use get_overdue_tasks instead).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      member_name: {
        type: Type.STRING,
        description:
          "The exact name of one team member as written by the user, e.g. 'Pedro'. " +
          "Never use placeholder values like 'all', 'everyone' or 'team'.",
      },
    },
    required: ["member_name"],
  },
};

const TOOLS = [getTasksByMemberDeclaration, getOverdueTasksDeclaration];

async function runTool(name: string, args: Record<string, unknown>) {
  if (name === "get_tasks_by_member") {
    const member_name = args.member_name as string;
    return await getTaskByMember(member_name);
  }
  if (name === "get_overdue_tasks") {
    return await getOverdueTasks();
  }
  return { error: `Unknown command: ${name}` };
}


app.post("/ai/chat", async (c) => {
  const body = await c.req.json();

  try {
    const contents: Content[] = [
      { role: "user", parts: [{ text: body.question }] },
    ];
    const MAX_STEP = 5;
    let steps = 0;
    let response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        tools: [
          {
            functionDeclarations: TOOLS,
          },
        ],
      },
    });
    while (response.functionCalls && steps < MAX_STEP) {
      contents.push(response.candidates![0].content!);
      for (const call of response.functionCalls) {
        const data = await runTool(call.name ?? "", call.args ?? {});
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: { result: data },
              },
            },
          ],
        });
      }
      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: { tools: [{ functionDeclarations: TOOLS }] },
      });
      steps++;
    }

    return c.json({
      text: response.text,
      steps,
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

app.get("/stats/by-status", async (c)=> {
const rows: StatusCount[] = await getStatsByStatus();
  return c.json(rows);
})

app.get("/stats/by-member", async (c)=> {
  const rows: MemberCount[] = await getStatsByMember();
  return c.json(rows);
})

app.get("/stats/delivery-time", async (c) => {
   const rows: DeliveryTime[] = await getStatsByAvgHours();
  return c.json(rows[0]);
})

app.patch("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const body = await c.req.json()

const values = ["done", "pending", "in_progress"]

if(!values.includes(body.status)){
  return c.json({error: "invalid status"}, 400)
}
  const rows = await sql `
  UPDATE tasks SET status = ${body.status}, completed_at = CASE WHEN ${body.status} = 'done' THEN now() ELSE NULL END WHERE id = ${id}
  RETURNING  id, title, status, member_id, completed_at`
  return c.json(rows[0])
})

app.post("/tasks", async (c) => {
    const body = await c.req.json()
  if(!body.title){
    return c.json({error: "title is required"}, 400)
  }
  if(!body.member_id){
    return c.json({error: "member_id is required"}, 400)
  }
  if(!body.due_date){
    return c.json({error: "date is required"}, 400)
  }


  const rows_select = await sql `
  SELECT id FROM members
WHERE id = ${body.member_id}`

if(rows_select.length === 0){
    return c.json({error: "member not found"}, 404)
  }

const rows = await sql `
 INSERT INTO tasks (title, status, member_id, due_date) VALUES (
      ${body.title},
 'pending',
    ${body.member_id},
    ${body.due_date}
)  RETURNING  id, title, status, member_id`
  return c.json(rows[0], 201)
})

export default app;
