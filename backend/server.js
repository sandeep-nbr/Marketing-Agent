require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { runAgentTurn } = require("./lib/anthropic");
const tasks = require("./lib/tasks");

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n[Aria] WARNING: ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.\n"
  );
}

// --- Chat endpoint: streams the agent's response as Server-Sent Events ---
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await runAgentTurn(messages, send);
  } catch (err) {
    console.error("[Aria] chat error:", err);
    send({ type: "error", message: err.message || "Something went wrong." });
  } finally {
    res.end();
  }
});

// --- Task endpoints (for the sidebar panel; also mutated via chat tools) ---
app.get("/api/tasks", (req, res) => {
  res.json(tasks.listTasks({ includeDone: req.query.includeDone === "true" }));
});

app.post("/api/tasks", (req, res) => {
  const { title, dueDate, notes } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  res.status(201).json(tasks.addTask({ title, dueDate, notes }));
});

app.post("/api/tasks/:id/complete", (req, res) => {
  const updated = tasks.completeTask(req.params.id);
  if (!updated) return res.status(404).json({ error: "task not found" });
  res.json(updated);
});

app.delete("/api/tasks/:id", (req, res) => {
  const ok = tasks.deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: "task not found" });
  res.status(204).end();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasApiKey: !!process.env.ANTHROPIC_API_KEY });
});

// Serve the built frontend in production, if present.
const distDir = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`[Aria] backend listening on http://localhost:${PORT}`);
});
