import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getOverdueTasks,
  getTaskByMember,
  searchNotes,
  getPendingReviews,
  getTasksByTitle,
  getTasksByStatus,
  listNotes,
  getNote,
  addChecklist,
} from "./tools";

const server = new McpServer({ name: "team-hub", version: "0.0.1" });
server.registerTool(
  "get_overdue_tasks",
  { description: "Returns all overdue tasks from the database" },
  async () => {
    const rows = await getOverdueTasks();
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);
const ok = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

const fail = (text: string) => ({
  content: [{ type: "text" as const, text }],
  isError: true,
});

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
  async ({ query }) => {
    const rows = await searchNotes(query);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);

server.registerTool(
  "get_pending_reviews",
  {
    description:
      "Lists the art reviews waiting for approval, with the task, the member and the version. Use this when the user asks which artworks are waiting for review.",
  },

  async () => {
    const rows = await getPendingReviews();
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
    };
  },
);

server.registerTool(
  "get_tasks_by_title",
  {
    description:
      "finds tasks whose title contains the given text, with status, due date and the member responsible. Use this when the user mentions a specific task by name. Do not use it to list all tasks.",
    inputSchema: {
      title: z
        .string()
        .describe("The title or part of the title of a task, e.g. ‘banner’."),
    },
  },
  async ({ title }) => {
    const rows = await getTasksByTitle(title);
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
    };
  },
);

server.registerTool(
  "get_tasks_by_status",
  {
    description:
      "Returns the team’s tasks with a given status. Use this when the user asks for tasks in a certain state. Do not use it for overdue tasks (use get_overdue_tasks).",
    inputSchema: {
      status: z
        .enum(["pending", "done", "in_progress"])
        .describe(
          "Task status: 'pending' = not started, 'in_progress' = being worked on, 'done' = finished.",
        ),
    },
  },

  async ({ status }) => {
    const rows = await getTasksByStatus(status);
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
    };
  },
);

server.registerTool(
  "add_checklist_item",
  {
    description:
      "Adds an item to the checklist of an existing task. This changes data. " +
      "Use when the user asks to add a step or to-do inside a task. " +
      "If more than one task matches the title, ask the user which one instead of guessing.",
    inputSchema: {
      task_title: z
        .string()
        .trim()
        .min(1)
        .describe(
          "The title or part of the title of the task, e.g. 'revisão de arte'.",
        ),
      item: z
        .string()
        .trim()
        .min(1)
        .describe("The checklist item to add, e.g. 'conferir logo'."),
    },
  },
  async ({ task_title, item }) => {
    const result = await addChecklist(task_title, item);

    if ("error" in result) {
      const options =
        "tasks" in result
          ? ` Matching tasks: ${result.tasks?.map((t) => t.title).join(", ")}.`
          : "";
      return fail(`${result.error}.${options}`);
    }

    return ok(
      `Added "${result.item.title}" to the checklist of "${result.task}".`,
    );
  },
);

server.registerResource(
  "note",
  "note://all",
  {
    title: "note to team",
    description: "All team notes, with id and content.",
    mimeType: "application/json",
  },
  async (uri) => {
    const rows = await listNotes();
    return {
      contents: [{ uri: uri.href, text: JSON.stringify(rows, null, 2) }],
    };
  },
);

server.registerResource(
  "note",
  new ResourceTemplate("note://{id}", {
    list: async () => {
      const notes = await listNotes();

      return {
        resources: notes.map((n) => ({
          uri: `note://${n.id}`,
          name: n.content.slice(0, 40),
        })),
      };
    },
  }),
  { title: "notes", description: "One note by id" },
  async (uri, { id }) => {
    const note = await getNote(Number(id));
    return {
      contents: [
        {
          uri: uri.href,
          text: note?.id ? JSON.stringify(note) : "note not found",
        },
      ],
    };
  },
);

server.registerPrompt(
  "note",
  {
    title: "notes to team",
    description: "Ask about the existing notes to team",
    argsSchema: {
      note: z.string().optional().describe("note to look for"),
    },
  },
  async ({ note }) => {
    const notes = note ? await searchNotes(note) : await listNotes();
    let text: string;

    if (!note) {
      text = `Summarize our team notes:\n${JSON.stringify(notes, null, 2)}`;
    } else if (notes.length === 0) {
      text = `Our team notes have nothing about "${note}". Answer only from general knowledge and say it does not come from the notes.`;
    } else {
      text = `What do our team notes say about "${note}"? Here are the most relevant notes:\n${JSON.stringify(notes, null, 2)}`;
    }

    return {
      messages: [{ role: "user", content: { type: "text", text: text } }],
    };
  },
);

server.registerPrompt(
  "weekly_report",
  {
    title: "weekly report",
    description:
      "Builds a weekly report request with overdue tasks, tasks in progress and artworks waiting for review, for the whole team or one member.",
    argsSchema: {
      member: z
        .string()
        .optional()
        .describe("Team member name. Omit for the whole team."),
    },
  },
  async ({ member }) => {
    const [overdue, inProgress, reviews] = await Promise.all([
      getOverdueTasks(),
      getTasksByStatus("in_progress"),
      getPendingReviews(),
    ]);
    const byMember = <T extends { member_name: string }>(rows: T[]) =>
      member
        ? rows.filter(
            (r) => r.member_name.toLowerCase() === member.toLowerCase(),
          )
        : rows;
    const show = (rows: unknown[]) =>
      rows.length ? JSON.stringify(rows, null, 2) : "None.";

    const myOverdue = byMember(overdue);
    const myInProgress = byMember(inProgress);
    const myReviews = byMember(reviews);

    const who = member ? member : "the whole team";

    const nothing =
      myOverdue.length + myInProgress.length + myReviews.length === 0;

    const text = nothing
      ? `There is nothing to report this week for ${who}: no overdue tasks, no tasks in progress and no artworks waiting for review. Write a short note saying that.`
      : `Write a short weekly report for ${who}.
Use these sections: Overdue, In progress, Waiting for review, Risks.

Overdue tasks:
${show(myOverdue)}

In progress:
${show(myInProgress)}

Waiting for review:
${show(myReviews)}`;

    return {
      messages: [{ role: "user", content: { type: "text", text: text } }],
    };
  },
);

await server.connect(new StdioServerTransport());
