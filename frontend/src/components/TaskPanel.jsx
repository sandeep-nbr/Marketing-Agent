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
    <div className="sidebar-section">
      <div className="sidebar-section-header">Tasks &amp; Reminders</div>
      <div className="sidebar-section-list">
        {tasks.length === 0 && (
          <div className="sidebar-empty">
            No open tasks yet. Ask your NBR Marketing Agent to add one, or say "remind me to…"
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
    </div>
  );
}
