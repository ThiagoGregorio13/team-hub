import { McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { sql } from "bun";

const server = new McpServer({name: "team-hub", version: "0.0.1"})

server.registerTool(
  "get-overdue-tasks",
  {description: "Returns all overdue tasks from the database"},
  async () => {
const rows = await sql`SELECT tasks.id, tasks.title, tasks.status, tasks.due_date::text AS due_date, members.name AS member_name
  FROM tasks
  LEFT JOIN members ON tasks.member_id = members.id
  WHERE tasks.due_date < CURRENT_DATE 
  AND tasks.status <> 'done'
  `
    return {content: [{type: "text", text: JSON.stringify(rows)}]}
  
})
await server.connect(new StdioServerTransport())