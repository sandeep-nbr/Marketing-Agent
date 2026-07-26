const Anthropic = require("@anthropic-ai/sdk");
const tasks = require("./tasks");

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = process.env.ARIA_MODEL || "claude-sonnet-5";

const SYSTEM_PROMPT = `You are Aria, a professional AI marketing assistant built for a busy marketing team. You behave like a sharp, capable chief-of-staff (think Jarvis) — proactive, concise, and grounded in real marketing expertise: campaign strategy, copywriting, content calendars, competitor and market research, and task follow-through.

Voice & style:
- Speak naturally and conversationally — your replies may be read aloud via text-to-speech, so avoid heavy markdown tables, long bullet nests, or raw links when a spoken sentence would do. Light markdown (headers, short bullet lists, **bold**) is fine for on-screen reading.
- Be concise by default. Expand only when the user asks for a full draft/deliverable (e.g. "write the full email").
- When producing a deliverable (ad copy, social post, email, blog outline, campaign plan), clearly label it and keep it copy-paste ready.
- When the user gives a voice command that implies an action (add a task, mark something done, search for something), just do it — don't ask for confirmation on low-stakes actions.

Capabilities:
- You can create, list, and complete tasks/reminders for the user via tools — use these whenever the user asks to track, remind, or follow up on something.
- You can search the web for current information — competitor moves, trends, news, pricing — use it whenever freshness or facts matter; don't rely on memory for anything time-sensitive.
- You can brainstorm campaign ideas, content calendars, audience targeting, and positioning.
- You can write marketing content: social posts, ad copy, email campaigns, blog outlines, captions, taglines.

Always act like you're embedded in this person's daily workflow — reference their tasks and past requests naturally, and offer the obvious next step rather than waiting to be asked.`;

const TOOLS = [
  {
    name: "add_task",
    description:
      "Add a marketing task or reminder to the user's task list. Use this whenever the user asks you to track, remind, follow up on, or schedule something.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short task title" },
        dueDate: {
          type: "string",
          description: "Optional due date, ISO 8601 (YYYY-MM-DD) or natural phrase like 'Friday'",
        },
        notes: { type: "string", description: "Optional extra detail" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List the user's current marketing tasks/reminders.",
    input_schema: {
      type: "object",
      properties: {
        includeDone: {
          type: "boolean",
          description: "Include already-completed tasks. Default false.",
        },
      },
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task as complete. Reference it by its id, or by a substring of its title if the id isn't known.",
    input_schema: {
      type: "object",
      properties: {
        taskRef: { type: "string", description: "Task id or a substring of its title" },
      },
      required: ["taskRef"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task. Reference it by id or by a substring of its title.",
    input_schema: {
      type: "object",
      properties: {
        taskRef: { type: "string", description: "Task id or a substring of its title" },
      },
      required: ["taskRef"],
    },
  },
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 5,
  },
];

function executeClientTool(name, input) {
  switch (name) {
    case "add_task": {
      const task = tasks.addTask(input);
      return { content: JSON.stringify(task) };
    }
    case "list_tasks": {
      const list = tasks.listTasks({ includeDone: !!input.includeDone });
      return { content: JSON.stringify(list) };
    }
    case "complete_task": {
      const found = tasks.findTask(input.taskRef);
      if (!found) return { content: `No task found matching "${input.taskRef}"`, isError: true };
      const updated = tasks.completeTask(found.id);
      return { content: JSON.stringify(updated) };
    }
    case "delete_task": {
      const found = tasks.findTask(input.taskRef);
      if (!found) return { content: `No task found matching "${input.taskRef}"`, isError: true };
      tasks.deleteTask(found.id);
      return { content: `Deleted task "${found.title}"` };
    }
    default:
      return { content: `Unknown tool: ${name}`, isError: true };
  }
}

const CLIENT_TOOL_NAMES = new Set(["add_task", "list_tasks", "complete_task", "delete_task"]);

/**
 * Runs one full agent turn (including any tool-use round trips) and emits
 * events via onEvent({type, ...}). Types: "text", "tool_start", "tool_end", "done", "error".
 */
async function runAgentTurn(history, onEvent) {
  let messages = history;

  for (let iteration = 0; iteration < 8; iteration++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    stream.on("text", (delta) => {
      onEvent({ type: "text", text: delta });
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason !== "tool_use") {
      onEvent({ type: "done" });
      return [...messages, { role: "assistant", content: finalMessage.content }];
    }

    // Tool use round: execute every client tool call, then continue the loop.
    // Server tools (web_search) are already resolved by Anthropic and appear
    // as web_search_tool_result blocks — nothing to execute for those.
    const toolResults = [];
    for (const block of finalMessage.content) {
      if (block.type !== "tool_use") continue;
      if (!CLIENT_TOOL_NAMES.has(block.name)) continue; // server tool, no client execution needed
      onEvent({ type: "tool_start", name: block.name, input: block.input });
      const result = executeClientTool(block.name, block.input);
      onEvent({ type: "tool_end", name: block.name });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.content,
        is_error: !!result.isError,
      });
    }

    messages = [
      ...messages,
      { role: "assistant", content: finalMessage.content },
      ...(toolResults.length ? [{ role: "user", content: toolResults }] : []),
    ];

    // If there were no client tool results to send back (only server tools
    // ran), the loop above already has the updated content and can continue
    // straight to the next iteration's request.
  }

  onEvent({ type: "error", message: "Reached max tool-use iterations." });
  return messages;
}

module.exports = { runAgentTurn, MODEL };
