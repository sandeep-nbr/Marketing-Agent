const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "..", "data", "tasks.json");

function ensureStore() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readAll() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

function addTask({ title, dueDate, notes }) {
  const tasks = readAll();
  const task = {
    id: crypto.randomUUID(),
    title,
    dueDate: dueDate || null,
    notes: notes || null,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  writeAll(tasks);
  return task;
}

function listTasks({ includeDone = false } = {}) {
  const tasks = readAll();
  return includeDone ? tasks : tasks.filter((t) => !t.done);
}

function completeTask(id) {
  const tasks = readAll();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  task.done = true;
  task.completedAt = new Date().toISOString();
  writeAll(tasks);
  return task;
}

function deleteTask(id) {
  const tasks = readAll();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  writeAll(tasks);
  return true;
}

// Fuzzy find by id prefix or title substring — lets the model refer to
// tasks by partial title without knowing exact UUIDs.
function findTask(ref) {
  const tasks = readAll();
  if (!ref) return null;
  const byId = tasks.find((t) => t.id === ref || t.id.startsWith(ref));
  if (byId) return byId;
  const lower = ref.toLowerCase();
  return tasks.find((t) => t.title.toLowerCase().includes(lower)) || null;
}

module.exports = { addTask, listTasks, completeTask, deleteTask, findTask, readAll };
