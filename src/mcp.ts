import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { sql } from "bun";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const server = new McpServer({ name: "team-hub", version: "0.0.1" });

const ai = new GoogleGenAI({});

server.registerTool(
  "get_overdue_tasks",
  { description: "Returns all overdue tasks from the database" },
  async () => {
    const rows =
      await sql`SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
  FROM tasks
  LEFT JOIN members ON tasks.member_id = members.id
  WHERE tasks.due_date < CURRENT_DATE 
  AND tasks.status <> 'done'
  `;
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);

server.registerTool(
  "get_tasks_by_member",
  {
    description: "Returns all tasks to a specific member from the database",
    inputSchema: {
      member_name: z
        .string()
        .describe("The name of the member to retrieve tasks for"),
    },
  },
  async ({ member_name }) => {
    const rows =
      await sql`SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
    FROM tasks
    LEFT JOIN members ON tasks.member_id = members.id
    WHERE UPPER(members.name) = UPPER(${member_name})
    `;
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);

server.registerTool(
  "search_notes",
  {
    description:"Searches team notes by meaning and returns the 3 most relevant with similarity scores. Use this for any question about team processes, procedures, or internal knowledge."
,
    inputSchema: {
      query: z.string().describe("The search query to find relevant notes"),
    },
  },
  async ({ query }) => {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query,
      config: { outputDimensionality: 768 },
    });

    const questionVector = JSON.stringify(response.embeddings![0].values!);
    const rows =
      await sql`SELECT content, 1 - (embedding <=> ${questionVector}::vector) AS score
    FROM notes
    ORDER BY embedding <=> ${questionVector}::vector
    LIMIT 3
  `;
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);

await server.connect(new StdioServerTransport());
