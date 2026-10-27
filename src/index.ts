import { Hono } from "hono";
import { sql } from "bun";

const app = new Hono();

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

export default app;
