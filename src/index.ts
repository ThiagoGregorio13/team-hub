import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import type { JWTPayload } from "hono/utils/jwt/types";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import type { Context } from "hono";
import { sql } from "bun";
import {
  GoogleGenAI,
  Type,
  type FunctionDeclaration,
  type Content,
} from "@google/genai";

import {
  getTasks,
  getTaskByMember,
  getOverdueTasks,
  searchNotes,
  type TaskRow,
  type DeliveryTime,
  type StatusCount,
  MemberCount,
  getStatsByStatus,
  getStatsByMember,
} from "./tools";

const ai = new GoogleGenAI({});
const MODEL = "gemini-3.1-flash-lite";

const app = new Hono();
app.use(
  "*",
  cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }),
);

const requireAuth = createMiddleware<{ Variables: { user: JWTPayload } }>(
  async (c, next) => {
    const header = c.req.header("Authorization");

    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "missing token" }, 401);
    }
    const token = header.slice("Bearer ".length);

    try {
      const payload = await verify(
        token,
        process.env.JWT_SECRET!,
       "HS256",
      );
      c.set("user", payload);
    } catch {
      return c.json({ error: "invalid or expired token" }, 401);
    }

    await next();
  },
);

const requireAdmin = createMiddleware<{ Variables: { user: JWTPayload } }>(
  async (c, next) => {

const user = c.get("user")
if(user.role !== "admin"){
  return c.json({error: "forbidden"}, 403)
}
   
    await next();
  },
);

app.use("/tasks/*", requireAuth)
app.use("/stats/*", requireAuth)
app.use("/members/*", requireAuth)
app.use("/ai/*", requireAuth)


async function getStatsByAvgHours(): Promise<DeliveryTime[]> {
  const rows: DeliveryTime[] = await sql`
  SELECT (EXTRACT(EPOCH FROM AVG(completed_at - created_at)) / 3600)::float AS avg_hours
    FROM tasks
    WHERE status = 'done'`;
  return rows;
}

app.get("/tasks", async (c) => {
  const rows: TaskRow[] = await getTasks();
  return c.json(rows);
});

app.get("/tasks/overdue", async (c) => {
  const rows: TaskRow[] = await getOverdueTasks();
  return c.json(rows);
});

async function handleSummary(c: Context){
  const today = new Date().toISOString().slice(0, 10);
  const rows: TaskRow[] = await getTasks();

  const prompt = `Today is ${today}. You are a team management assistant.
Team tasks (JSON): ${JSON.stringify(rows)}

In up to 5 lines, tell me:
- which tasks are OVERDUE (due_date before today and status other than done) and who owns them
- who has the heaviest workload
- one practical suggestion for the manager
Answer in Brazilian Portuguese.

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
};

const requireServiceKey = bearerAuth({token: process.env.N8N_API_KEY!})

app.get("/ai/summary", handleSummary);
app.get("/integrations/summary", requireServiceKey, handleSummary)

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

const searchNotesDeclaration: FunctionDeclaration = {
  name: "search_notes",
  description:
    "Searches for notes based on the provided query. " +
    "Returns the most relevant notes along with their similarity scores." +
    "Use this for any question about team processes, procedures, or internal knowledge.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query to find relevant notes.",
      },
    },
    required: ["query"],
  },
};

const TOOLS = [
  getTasksByMemberDeclaration,
  getOverdueTasksDeclaration,
  searchNotesDeclaration,
];

async function runTool(name: string, args: Record<string, unknown>) {
  if (name === "get_tasks_by_member") {
    const member_name = args.member_name as string;
    return await getTaskByMember(member_name);
  }
  if (name === "get_overdue_tasks") {
    return await getOverdueTasks();
  }
  if (name === "search_notes") {
    const query = args.query as string;
    return await searchNotes(query);
  }
  return { error: `Unknown command: ${name}` };
}


app.get("/admin/users", requireAuth, requireAdmin, async (c) => {
  const rows = await sql`SELECT id, email, role, created_at FROM users`;
  return c.json(rows);
});


app.get("/me", requireAuth, (c) => c.json(c.get("user")));


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

app.get("/stats/by-status", async (c) => {
  const rows: StatusCount[] = await getStatsByStatus();
  return c.json(rows);
});

app.get("/stats/by-member", async (c) => {
  const rows: MemberCount[] = await getStatsByMember();
  return c.json(rows);
});

app.get("/stats/delivery-time", async (c) => {
  const rows: DeliveryTime[] = await getStatsByAvgHours();
  return c.json(rows[0]);
});

app.patch("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();

  const values = ["done", "pending", "in_progress"];

  if (!values.includes(body.status)) {
    return c.json({ error: "invalid status" }, 400);
  }
  const rows = await sql`
  UPDATE tasks SET status = ${body.status}, completed_at = CASE WHEN ${body.status} = 'done' THEN now() ELSE NULL END WHERE id = ${id}
  RETURNING  id, title, status, member_id, completed_at`;
  return c.json(rows[0]);
});

app.delete("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));

  // RETURNING id: se não voltar nenhuma linha, é porque a tarefa não existia
  const rows = await sql`DELETE FROM tasks WHERE id = ${id} RETURNING id`;
  if (rows.length === 0) {
    return c.json({ error: "task not found" }, 404);
  }

  // 204 No Content: apagou e não tem nada para devolver no corpo
  return c.body(null, 204);
});

app.post("/tasks", async (c) => {
  const body = await c.req.json();
  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }
  if (!body.member_id) {
    return c.json({ error: "member_id is required" }, 400);
  }
  if (!body.due_date) {
    return c.json({ error: "date is required" }, 400);
  }

  const rows_select = await sql`
  SELECT id, name FROM members
WHERE id = ${body.member_id}`;

  if (rows_select.length === 0) {
    return c.json({ error: "member not found" }, 404);
  }

  const rows = await sql`
 INSERT INTO tasks (title, status, member_id, due_date) VALUES (
      ${body.title},
 'pending',
    ${body.member_id},
    ${body.due_date}
)  RETURNING  id, title, status, member_id, due_date`;

  const webhookurl = process.env.N8N_WEBHOOK_URL;

  if (webhookurl) {
    try {
      await fetch(webhookurl, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          title: rows[0].title,
          member: rows_select[0].name,
          due_date: body.due_date,
        }),
      });
    } catch (err) {
      console.error("failed to notify webhook", err);
    }
  }

  return c.json(rows[0], 201);
});

app.get("/members", async (c) => {
  const rows = await sql`
 SELECT id, name FROM members ORDER BY name
  `;
  return c.json(rows);
});

app.post("/auth/register", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json();

  if (!body.email || !body.password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  if (body.password.length < 8) {
    return c.json({ error: "password must be at least 8 characters" }, 400);
  }

  const email = body.email.toLowerCase().trim();
  const password_hash = await Bun.password.hash(body.password);

  const rows = await sql`
INSERT INTO users (email, password_hash) VALUES (${email}, ${password_hash}) 
ON CONFLICT (email) DO NOTHING
RETURNING id, email, role 
`;
  if (rows.length === 0) {
    return c.json({ error: "email already registered" }, 409);
  }

  return c.json(rows[0], 201);
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json();

  if (!body.email || !body.password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const email = body.email.toLowerCase().trim();

  const rows = await sql`
SELECT id, email, role, password_hash FROM users WHERE email = ${email}
`;
  const user = rows[0];

  if (!user) {
    return c.json({ error: "invalid email or password" }, 401);
  }

  const passwordValid = await Bun.password.verify(
    body.password,
    user.password_hash,
  );

  if (!passwordValid) {
    return c.json({ error: "invalid email or password" }, 401);
  }

  const ticket = await sign(
    {
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    process.env.JWT_SECRET!,
    "HS256",
  );

  return c.json({
    id: user.id,
    email: user.email,
    role: user.role,
    token: ticket,
  });
});

export default app;
