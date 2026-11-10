import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import type { JWTPayload } from "hono/utils/jwt/types";
import { cors } from "hono/cors";
import { bearerAuth } from "hono/bearer-auth";
import { Context } from "hono";
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
  getPendingReviews,
  addNote,
  previewNotes,
} from "./tools";
import { properties, string } from "zod";

const ai = new GoogleGenAI({});
const MODEL = "gemini-3.1-flash-lite";

const app = new Hono<{ Variables: { user: JWTPayload } }>();
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
      const payload = await verify(token, process.env.JWT_SECRET!, "HS256");
      c.set("user", payload);
    } catch {
      return c.json({ error: "invalid or expired token" }, 401);
    }

    await next();
  },
);

const requireAdmin = createMiddleware<{ Variables: { user: JWTPayload } }>(
  async (c, next) => {
    const user = c.get("user");
    if (user.role !== "admin") {
      return c.json({ error: "forbidden" }, 403);
    }

    await next();
  },
);

app.use("/tasks/*", requireAuth);
app.use("/stats/*", requireAuth);
app.use("/members/*", requireAuth);
app.use("/ai/*", requireAuth);
app.use("/reviews/*", requireAuth);

async function getStatsByAvgHours(): Promise<DeliveryTime[]> {
  const rows: DeliveryTime[] = await sql`
  SELECT (EXTRACT(EPOCH FROM AVG(completed_at - created_at)) / 3600)::float AS avg_hours
    FROM tasks
    WHERE status = 'done'`;
  return rows;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/tasks", async (c) => {
  const rows: TaskRow[] = await getTasks();
  return c.json(rows);
});

app.get("/tasks/overdue", async (c) => {
  const rows: TaskRow[] = await getOverdueTasks();
  return c.json(rows);
});

async function handleSummary(c: Context) {
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
}

const requireServiceKey = bearerAuth({ token: process.env.N8N_API_KEY! });

app.get("/ai/summary", handleSummary);
app.get("/integrations/summary", requireServiceKey, handleSummary);

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

const getPendingReviewsDeclaration: FunctionDeclaration = {
  name: "get_pending_reviews",
  description:
    "Returns every art review that is still waiting for approval (status 'pending'), " +
    "with the task title, the member who owns the task and the version number of the art. " +
    "Use this for any question about arts or designs waiting for review or approval. " +
    "Takes no arguments.",
};

const TOOLS = [
  getTasksByMemberDeclaration,
  getOverdueTasksDeclaration,
  searchNotesDeclaration,
  getPendingReviewsDeclaration,
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
  if (name === "getPendingReviewsDeclaration") return await getPendingReviews();
}

app.get("/admin/users", requireAuth, requireAdmin, async (c) => {
  const rows = await sql`SELECT id, email, role, created_at FROM users`;
  return c.json(rows);
});

app.get("/me", requireAuth, (c) => c.json(c.get("user")));

app.post("/ai/chat", async (c) => {
  const body = await c.req.json();

  if (typeof body.question !== "string" || !body.question.trim()) {
    return c.json({ error: "question is required" }, 400);
  }

  const question = body.question.trim();

  try {
    const config = {
      systemInstruction: `Você é o assistente do team hub. Hoje é ${new Date().toLocaleDateString(
        "pt-BR",
        {
          timeZone: "America/Sao_Paulo",
          dateStyle: "full",
        },
      )}.
Para qualquer pergunta sobre tarefas, pessoas, prazos, artes ou combinados do time, use SEMPRE as ferramentas antes de responder. Nunca responda sobre dados do time sem consultá-las.
Responda em português do Brasil, em poucas linhas.`,
      tools: [{ functionDeclarations: TOOLS }],
    };
    const history: Content[] = (Array.isArray(body.history) ? body.history : [])
      .filter(
        (item: any) =>
          (item.role === "user" || item.role === "model") &&
          typeof item.text === "string",
      )
      .slice(-10)
      .map((item: any) => ({
        role: item.role,
        parts: [{ text: item.text.slice(0, 2000) }],
      }));
    const contents: Content[] = [
      ...history,
      { role: "user", parts: [{ text: question }] },
    ];
    const MAX_STEP = 5;
    let steps = 0;
    let response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config,
    });
    while (response.functionCalls && steps < MAX_STEP) {
      contents.push(response.candidates![0].content!);

      for (const call of response.functionCalls) {
        const data = await runTool(call.name ?? "", call.args ?? {});
        contents.push({
          role: "user",
          parts: [{ functionResponse: { name: call.name, response: { result: data } } }],
        });
      }

      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config,
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

app.get("/tasks/:id/checklist", async (c) => {
  const tasksId = Number(c.req.param("id"));

  const rows = await sql`
  SELECT id, title, task_id, done FROM  task_checklist_items
  WHERE task_id = ${tasksId}
  ORDER BY id
  `;
  return c.json(rows);
});

app.post("/tasks/:id/checklist", async (c) => {
  const tasksId = Number(c.req.param("id"));
  const body = await c.req.json();

  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }

  const tasks = await sql`
    SELECT id FROM tasks 
    WHERE id = ${tasksId}
    `;

  if (tasks.length === 0) {
    return c.json({ error: "task not found" }, 404);
  }

  const rows = await sql`
INSERT INTO task_checklist_items (task_id, title)
VALUES (${tasksId}, ${body.title})
RETURNING id, title, done
`;
  return c.json(rows[0], 201);
});

app.patch("/tasks/:id/checklist/:itemId", async (c) => {
  const tasksId = Number(c.req.param("id"));
  const itemId = Number(c.req.param("itemId"));
  const body = await c.req.json();

  if (typeof body.done !== "boolean") {
    return c.json({ error: "check must be checked or unchecked" }, 400);
  }
  const rows = await sql`
    UPDATE task_checklist_items SET done = ${body.done}
    WHERE id = ${itemId} AND task_id = ${tasksId}
    RETURNING id, title, done
  `;

  if (rows.length === 0) {
    return c.json({ error: "item not found" }, 404);
  }

  return c.json(rows[0]);
});

app.delete("/tasks/:id/checklist/:itemId", async (c) => {
  const taskId = Number(c.req.param("id"));
  const itemId = Number(c.req.param("itemId"));

  const rows = await sql`
DELETE FROM task_checklist_items
WHERE id = ${itemId} AND task_id = ${taskId}
RETURNING id
`;

  if (rows.length === 0) {
    return c.json({ error: "item not found" }, 404);
  }

  return c.body(null, 204);
});

// Galeria: todas as artes de todas as tarefas, da mais nova para a mais antiga.
// ROW_NUMBER numera as versões dentro de cada tarefa (1, 2, 3...) sem precisar de coluna extra.
app.get("/reviews", async (c) => {
  const rows = await sql`
    SELECT r.id, r.task_id, t.title AS task_title, r.art_url, r.status, r.comment,
           r.created_at, r.reviewed_at,
           ROW_NUMBER() OVER (PARTITION BY r.task_id ORDER BY r.id)::int AS version
    FROM task_reviews r
    JOIN tasks t ON t.id = r.task_id
    ORDER BY r.id DESC
  `;
  return c.json(rows);
});

app.get("/tasks/:id/reviews", async (c) => {
  const taskId = Number(c.req.param("id"));

  const rows = await sql`
SELECT id, art_url, status, comment, created_at, reviewed_at
FROM task_reviews 
WHERE task_id = ${taskId}
ORDER BY id DESC
`;
  return c.json(rows);
});

app.post("/tasks/:id/reviews", async (c) => {
  const taskId = Number(c.req.param("id"));
  const body = await c.req.json();
  const user = c.get("user");

  if (!isHttpUrl(body.art_url)) {
    return c.json({ error: "art_url must be a valid link" }, 400);
  }

  const taskReviews = await sql`
    SELECT id FROM tasks WHERE id = ${taskId}
    `;
  if (taskReviews.length === 0) {
    return c.json({ error: "task not found" }, 404);
  }

  const rows = await sql`
INSERT INTO task_reviews (task_id, art_url, requested_by)
    VALUES (${taskId}, ${body.art_url}, ${Number(user.sub)})
    RETURNING id, art_url, status, comment, created_at, reviewed_at
    `;

  return c.json(rows[0], 201);
});

app.patch("/tasks/:id/reviews/:reviewId", requireAdmin, async (c) => {
  const taskId = Number(c.req.param("id"));
  const reviewId = Number(c.req.param("reviewId"));
  const body = await c.req.json();
  const user = c.get("user");

  if (body.status !== "approved" && body.status !== "changes_requested") {
    return c.json(
      { error: "status must be approved or changes_requested" },
      400,
    );
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (body.status === "changes_requested" && !comment) {
    return c.json(
      { error: "comment is required when requesting changes" },
      400,
    );
  }

  const rows = await sql`
    UPDATE task_reviews
    SET status = ${body.status},
    comment = ${comment || null},
    reviewed_by = ${Number(user.sub)},
    reviewed_at = now()
    WHERE id = ${reviewId} AND task_id = ${taskId} AND status = 'pending'
    RETURNING id, art_url, status, comment, created_at, reviewed_at
    `;

  if (rows.length === 0) {
    return c.json({ error: "pending review not found" }, 404);
  }

  return c.json(rows[0]);
});

app.post(
  "/tasks/:id/reviews/:reviewId/ai-analysis",
  requireAdmin,
  async (c) => {
    const taskId = Number(c.req.param("id"));
    const reviewId = Number(c.req.param("reviewId"));

    const rows = await sql`
SELECT r.id, r.art_url, t.title, AS task_title
FROM task_reviews r 
JOIN tasks t ON t.id  = t.tasks_id
    WHERE r.id = ${reviewId} AND r.task_id = ${taskId}
`;

    const review = rows[0];
    if (!review) {
      return c.json({ error: "review not found" }, 404);
    }
    const history = await sql`
    SELECT comment FROM task_reviews
    WHERE task_id = ${taskId} AND id < ${reviewId} AND comment IS NOT NULL
    ORDER BY id
  `;

    let image: { mimeType: string; data: string };
    try {
      const res = await fetch(review.art_url);
      const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "";
      if (!res.ok || !mimeType.startsWith("image/")) {
        return c.json({ error: "art_url is not a reachable image" }, 422);
      }
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength > 8 * 1024 * 1024) {
        return c.json({ error: "image too large (max 8MB)" }, 413);
      }
      image = { mimeType, data: Buffer.from(bytes).toString("base64") };
    } catch {
      return c.json({ error: "could not download the image" }, 422);
    }

    const previous = history.length
      ? history
          .map((h: { comment: string }, i: number) => `${i + 1}. ${h.comment}`)
          .join("\n")
      : "Nenhum (esta é a primeira versão).";

    const prompt = `You are an assistant who describes artwork for an art director. You do NOT evaluate or offer opinions; you simply provide an objective description of what is in the image.

Task: "${review.task_title}"

Adjustment requests from previous versions:
${previous}

Please provide:
- summary: 1 or 2 sentences describing the artwork as a whole.
- elements: the main visible elements (people, objects, shapes, logos).
- colors: the predominant colors, ordered from most to least prominent (up to 6), including their names, approximate hex codes, and where they appear.
- texts: all legible text in the image, transcribed exactly as it appears. Leave empty if there is none.
- style: visual style and composition (e.g., flat illustration, photograph, centered, ample negative space).
- request_check: for each previous request, describe what the image shows in relation to it, without judging whether it is good or bad. Leave empty if there are no requests.

Respond in Brazilian Portuguese. Describe only what is visible; do not invent anything.`;
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: image }, { text: prompt }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              elements: { type: Type.ARRAY, items: { type: Type.STRING } },
              colors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                    where: { type: Type.STRING },
                  },
                  required: ["name", "hex", "where"],
                },
              },
              texts: { type: Type.ARRAY, items: { type: Type.STRING } },
              style: { type: Type.STRING },
              request_check: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    request: { type: Type.STRING },
                    observation: { type: Type.STRING },
                  },
                  required: ["request", "observation"],
                },
              },
            },
            required: [
              "summary",
              "elements",
              "colors",
              "texts",
              "style",
              "request_check",
            ],
          },
        },
      });

      return c.json(JSON.parse(response.text ?? "{}"));
    } catch (error) {
      console.error("Error generating AI feedback", error);
      return c.json({ error: "Failed to generate AI feedback" }, 503);
    }
  },
);

app.post("/notes", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json();

  if (typeof body.content !== "string") {
    return c.json({ error: "notes must be text" }, 400);
  }

  const content = body.content.trim();

  if (content.length < 8 || content.length > 1000) {
    return c.json(
      {
        error:
          "notes must be at least 8 characters and no more 1000 characters  ",
      },
      400,
    );
  }

  let note;
  try {
    note = await addNote(content);
  } catch (error) {
    console.error("Error adding note", error);
    return c.json({ error: "Failed to save note" }, 503);
  }

  if (!note) {
    return c.json({ error: "note already registered" }, 409);
  }

  return c.json(note, 201);
});

app.get("/notes", requireAuth, async (c) => {
  const rows = await sql`
 SELECT id, content FROM notes ORDER BY id DESC
  `;
  return c.json(rows);
});

app.delete("/notes/:id", requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));

  const rows = await sql`
DELETE FROM notes WHERE id = ${id}
RETURNING id
`;
  if (rows.length === 0) {
    return c.json({ error: "note not found" }, 404);
  }
  return c.body(null, 204);
});

app.get("/notes/search", requireAuth, async (c) => {
  const query = c.req.query("q")?.trim() ?? "";

  if (!query) {
    return c.json({ error: "query is required" }, 400);
  }

  let matches;
  try {
    matches = await previewNotes(query);
  } catch (error) {
    console.error("Error preview note", error);
    return c.json({ error: "Failed to see note" }, 503);
  }

  return c.json(matches);
});

export default app;
