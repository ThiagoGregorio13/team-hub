import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getOverdueTasks, getTaskByMember, searchNotes } from "./tools";

const server = new McpServer({ name: "team-hub", version: "0.0.1" });
server.registerTool(
  "get_overdue_tasks",
  { description: "Returns all overdue tasks from the database" },
  async () => {
    const rows = await getOverdueTasks();
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
    const rows = await getTaskByMember(member_name);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);

server.registerTool(
  "search_notes",
  {
    description:
      "Searches team notes by meaning and returns the 3 most relevant with similarity scores. Use this for any question about team processes, procedures, or internal knowledge.",
    inputSchema: {
      query: z.string().describe("The search query to find relevant notes"),
    },
  },
  async ({query}) => {
 const rows = await searchNotes(query);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  }
   
);

await server.connect(new StdioServerTransport());
