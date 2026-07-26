const Anthropic = require("@anthropic-ai/sdk");
const tasks = require("./tasks");
const automations = require("./automations");

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = process.env.NBR_MODEL || "claude-sonnet-5";

const SYSTEM_PROMPT = `You are the NBR Marketing Agent, a professional AI marketing assistant built for NBR's marketing team. You behave like a sharp, capable chief-of-staff (think Jarvis) — proactive, concise, and grounded in real marketing expertise: campaign strategy, copywriting, content calendars, competitor and market research, and task follow-through.

Voice & style:
- Speak naturally and conversationally — your replies may be read aloud via text-to-speech, so avoid heavy markdown tables, long bullet nests, or raw links when a spoken sentence would do. Light markdown (headers, short bullet lists, **bold**) is fine for on-screen reading.
- Be concise by default. Expand only when the user asks for a full draft/deliverable (e.g. "write the full email").
- When producing a deliverable (ad copy, social post, email, blog outline, campaign plan), clearly label it and keep it copy-paste ready.
- When the user gives a voice command that implies an action (add a task, mark something done, search for something, generate an image, trigger an automation), just do it — don't ask for confirmation on low-stakes actions.

Capabilities:
- You can create, list, and complete tasks/reminders for the user via tools — use these whenever the user asks to track, remind, or follow up on something.
- You can search the web for current information — competitor moves, trends, news, pricing — use it whenever freshness or facts matter; don't rely on memory for anything time-sensitive.
- You can brainstorm campaign ideas, content calendars, audience targeting, and positioning.
- You can write marketing content: social posts, ad copy, email campaigns, blog outlines, captions, taglines.
- You can generate marketing images (social graphics, ad visuals, mockups) via the generate_image tool. Always embed the returned imageUrl directly in your reply using markdown image syntax, e.g. ![short description](imageUrl), so it renders inline in the chat.
- You can trigger the user's connected Zapier/Make automations (e.g. "post this to Buffer", "sync this lead to the CRM", "notify the team on Slack") via trigger_automation, and list or register new ones via list_automations / add_automation. Only trigger an automation the user has actually configured — check list_automations first if you're not sure it exists, and never invent a webhook.

Always act like you're embedded in this person's daily workflow — reference their tasks and past requests naturally, and offer the obvious next step rather than waiting to be asked.`;

const IMAGE_SIZES = {
  square: [1024, 1024],
  landscape: [1280, 720],
  portrait: [720, 1280],
  story: [1080, 1920],
};

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
    name: "generate_image",
    description:
      "Generate a marketing image (social graphic, ad visual, campaign mockup) from a text description. Returns an imageUrl — always embed it in your reply as a markdown image so the user sees it.",
    input_schema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Detailed visual description of the image to generate (style, subject, mood, colors).",
        },
        aspect: {
          type: "string",
          enum: Object.keys(IMAGE_SIZES),
          description:
            "Aspect ratio preset: square (1:1, feed post), landscape (16:9, banner/blog), portrait (9:16-ish, ad), story (9:16, Instagram/FB story). Default square.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "list_automations",
    description:
      "List the user's configured automation webhooks (Zapier / Make.com). Use this before triggering one if you're not sure it exists.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_automation",
    description:
      "Register a new automation webhook (a Zapier 'Catch Hook' or Make.com 'Custom Webhook' URL the user gives you) under a memorable name, so it can be triggered later.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short memorable name, e.g. 'post-to-buffer' or 'new-lead-to-crm'" },
        webhookUrl: { type: "string", description: "The Zapier or Make.com webhook URL to POST to" },
        description: { type: "string", description: "Optional note on what this automation does" },
      },
      required: ["name", "webhookUrl"],
    },
  },
  {
    name: "trigger_automation",
    description:
      "Trigger a previously-registered Zapier/Make automation by POSTing a JSON payload to its webhook. Use for things like posting approved content, syncing a lead, or notifying the team.",
    input_schema: {
      type: "object",
      properties: {
        automationRef: { type: "string", description: "Automation id or a substring of its name" },
        payload: {
          type: "object",
          description: "Arbitrary JSON data to send to the webhook (e.g. { content: '...', channel: 'instagram' })",
        },
      },
      required: ["automationRef"],
    },
  },
  {
    name: "delete_automation",
    description: "Remove a registered automation webhook. Reference it by id or a substring of its name.",
    input_schema: {
      type: "object",
      properties: {
        automationRef: { type: "string", description: "Automation id or a substring of its name" },
      },
      required: ["automationRef"],
    },
  },
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 5,
  },
];

function buildImageUrl(prompt, aspect) {
  const [width, height] = IMAGE_SIZES[aspect] || IMAGE_SIZES.square;
  const seed = Math.floor(Math.random() * 1e9);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}

async function executeClientTool(name, input) {
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
    case "generate_image": {
      const imageUrl = buildImageUrl(input.prompt, input.aspect);
      return { content: JSON.stringify({ imageUrl, prompt: input.prompt, aspect: input.aspect || "square" }) };
    }
    case "list_automations": {
      return { content: JSON.stringify(automations.listAutomations()) };
    }
    case "add_automation": {
      try {
        const automation = automations.addAutomation(input);
        return { content: JSON.stringify(automation) };
      } catch (err) {
        return { content: err.message, isError: true };
      }
    }
    case "trigger_automation": {
      try {
        const result = await automations.triggerAutomation(input.automationRef, input.payload || {});
        return { content: JSON.stringify(result), isError: !result.ok };
      } catch (err) {
        return { content: err.message, isError: true };
      }
    }
    case "delete_automation": {
      const found = automations.findAutomation(input.automationRef);
      if (!found) return { content: `No automation found matching "${input.automationRef}"`, isError: true };
      automations.deleteAutomation(found.id);
      return { content: `Deleted automation "${found.name}"` };
    }
    default:
      return { content: `Unknown tool: ${name}`, isError: true };
  }
}

const CLIENT_TOOL_NAMES = new Set([
  "add_task",
  "list_tasks",
  "complete_task",
  "delete_task",
  "generate_image",
  "list_automations",
  "add_automation",
  "trigger_automation",
  "delete_automation",
]);

/**
 * Runs one full agent turn (including any tool-use round trips) and emits
 * events via onEvent({type, ...}). Types: "text", "tool_start", "tool_end",
 * "done", "stopped", "error".
 *
 * Pass `signal` (an AbortSignal) to allow the caller to cancel a run in
 * progress — the in-flight Anthropic stream is aborted and any text
 * streamed so far is preserved as a partial assistant turn.
 */
async function runAgentTurn(history, onEvent, { signal } = {}) {
  let messages = history;

  for (let iteration = 0; iteration < 8; iteration++) {
    if (signal?.aborted) {
      onEvent({ type: "stopped" });
      return messages;
    }

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    const onAbort = () => stream.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    let accumulatedText = "";
    stream.on("text", (delta) => {
      accumulatedText += delta;
      onEvent({ type: "text", text: delta });
    });

    let finalMessage;
    try {
      finalMessage = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.APIUserAbortError) {
        // Preserve whatever text streamed before the abort as a partial turn.
        onEvent({ type: "stopped" });
        return accumulatedText
          ? [...messages, { role: "assistant", content: [{ type: "text", text: accumulatedText }] }]
          : messages;
      }
      throw err;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }

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
      const result = await executeClientTool(block.name, block.input);
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
