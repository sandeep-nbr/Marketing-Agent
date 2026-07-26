import React from "react";
import ReactMarkdown from "react-markdown";

const TOOL_LABELS = {
  add_task: "Adding task…",
  list_tasks: "Checking your tasks…",
  complete_task: "Updating task…",
  delete_task: "Removing task…",
  web_search: "Searching the web…",
};

export function ToolChip({ name }) {
  return (
    <div className="tool-chip">
      <span className="dot" />
      {TOOL_LABELS[name] || `Using ${name}…`}
    </div>
  );
}

export default function MessageBubble({ role, content, streaming }) {
  const isUser = role === "user";
  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`avatar ${isUser ? "user" : "assistant"}`}>{isUser ? "You" : "A"}</div>
      <div className="bubble">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : streaming ? (
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        ) : null}
      </div>
    </div>
  );
}
