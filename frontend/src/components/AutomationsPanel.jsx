import React, { useEffect, useState, useCallback } from "react";
import {
  fetchAutomations,
  addAutomationApi,
  deleteAutomationApi,
  triggerAutomationApi,
} from "../lib/api.js";

export default function AutomationsPanel({ refreshKey, onMutation }) {
  const [automations, setAutomations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [triggeringId, setTriggeringId] = useState(null);

  const load = useCallback(async () => {
    const data = await fetchAutomations();
    setAutomations(data);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || !webhookUrl.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addAutomationApi({ name: name.trim(), webhookUrl: webhookUrl.trim() });
      setName("");
      setWebhookUrl("");
      setShowForm(false);
      await load();
      onMutation?.();
    } catch (err) {
      setError(err.message || "Failed to add automation");
    } finally {
      setSaving(false);
    }
  }

  async function handleTrigger(id) {
    setTriggeringId(id);
    try {
      await triggerAutomationApi(id, { manual: true });
      await load();
    } finally {
      setTriggeringId(null);
    }
  }

  async function handleDelete(id) {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    await deleteAutomationApi(id);
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header">
        Automations
        <button type="button" className="sidebar-add-btn" onClick={() => setShowForm((v) => !v)} title="Add automation">
          {showForm ? "×" : "+"}
        </button>
      </div>

      {showForm && (
        <form className="automation-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Name (e.g. post-to-buffer)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="url"
            placeholder="Zapier / Make webhook URL"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          {error && <div className="automation-error">{error}</div>}
          <button type="submit" disabled={saving || !name.trim() || !webhookUrl.trim()}>
            {saving ? "Saving…" : "Add automation"}
          </button>
        </form>
      )}

      <div className="sidebar-section-list">
        {automations.length === 0 && !showForm && (
          <div className="sidebar-empty">
            No automations yet. Connect a Zapier or Make.com webhook, or ask the agent to
            register one for you.
          </div>
        )}
        {automations.map((a) => (
          <div className="automation-card" key={a.id}>
            <div className="task-card-top">
              <div className="automation-title">⚡ {a.name}</div>
              <button className="task-del" onClick={() => handleDelete(a.id)} title="Delete">
                ×
              </button>
            </div>
            {a.description && <div className="automation-desc">{a.description}</div>}
            <div className="automation-meta">
              <span>{a.lastTriggeredAt ? `Last run ${new Date(a.lastTriggeredAt).toLocaleString()}` : "Never run"}</span>
              <button
                type="button"
                className="automation-trigger-btn"
                onClick={() => handleTrigger(a.id)}
                disabled={triggeringId === a.id}
              >
                {triggeringId === a.id ? "Running…" : "Test run"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
