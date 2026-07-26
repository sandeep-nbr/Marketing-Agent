import React, { useEffect, useState, useCallback } from "react";
import { fetchTasks, completeTaskApi, deleteTaskApi } from "../lib/api.js";

export default function TaskPanel({ refreshKey }) {
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async () => {
    const data = await fetchTasks();
    setTasks(data);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleComplete(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await completeTaskApi(id);
  }

  async function handleDelete(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTaskApi(id);
  }

  return (
    <aside className="task-sidebar">
      <div className="task-sidebar-header">Tasks &amp; Reminders</div>
      <div className="task-list">
        {tasks.length === 0 && (
          <div className="task-empty">
            No open tasks yet. Ask Aria to add one, or say “remind me to…”
          </div>
        )}
        {tasks.map((t) => (
          <div className="task-card" key={t.id}>
            <div className="task-card-top">
              <div className="task-check" onClick={() => handleComplete(t.id)} title="Mark complete" />
              <div className="task-title">{t.title}</div>
              <button className="task-del" onClick={() => handleDelete(t.id)} title="Delete">
                ×
              </button>
            </div>
            {t.dueDate && <div className="task-due">Due {t.dueDate}</div>}
          </div>
        ))}
      </div>
    </aside>
  );
}
