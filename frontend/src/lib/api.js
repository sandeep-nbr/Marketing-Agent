// Streams a chat turn from the backend. The backend speaks SSE over a POST
// request, so we use fetch + a manual reader instead of EventSource (which
// only supports GET). Pass `signal` (an AbortController's signal) to allow
// the caller to cancel an in-progress generation.
export async function streamChat(messages, { onText, onToolStart, onToolEnd, onDone, onStopped, onError, signal }) {
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      onStopped?.();
      return;
    }
    onError?.(err.message || "Network error");
    return;
  }

  if (!res.ok || !res.body) {
    onError?.(`Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop(); // last part may be incomplete

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        let event;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }
        switch (event.type) {
          case "text":
            onText?.(event.text);
            break;
          case "tool_start":
            onToolStart?.(event.name, event.input);
            break;
          case "tool_end":
            onToolEnd?.(event.name);
            break;
          case "done":
            onDone?.();
            break;
          case "stopped":
            onStopped?.();
            break;
          case "error":
            onError?.(event.message);
            break;
          default:
            break;
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") onStopped?.();
    else onError?.(err.message || "Stream error");
  }
}

export async function fetchTasks() {
  const res = await fetch("/api/tasks");
  if (!res.ok) return [];
  return res.json();
}

export async function addTaskApi(task) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function completeTaskApi(id) {
  const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
  return res.json();
}

export async function deleteTaskApi(id) {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
}

export async function fetchAutomations() {
  const res = await fetch("/api/automations");
  if (!res.ok) return [];
  return res.json();
}

export async function addAutomationApi(automation) {
  const res = await fetch("/api/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(automation),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function triggerAutomationApi(id, payload = {}) {
  const res = await fetch(`/api/automations/${id}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteAutomationApi(id) {
  await fetch(`/api/automations/${id}`, { method: "DELETE" });
}

export async function fetchHealth() {
  try {
    const res = await fetch("/api/health");
    return res.json();
  } catch {
    return { ok: false };
  }
}
