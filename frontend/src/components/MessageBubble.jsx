import React from "react";
import ReactMarkdown from "react-markdown";

const TOOL_LABELS = {
  add_task: "Adding task…",
  list_tasks: "Checking your tasks…",
  complete_task: "Updating task…",
  delete_task: "Removing task…",
  web_search: "Searching the web…",
  generate_image: "Generating image…",
  list_automations: "Checking your automations…",
  add_automation: "Registering automation…",
  trigger_automation: "Triggering automation…",
  delete_automation: "Removing automation…",
};

export function ToolChip({ name }) {
  return (
    <div className="tool-chip">
      <span className="dot" />
      {TOOL_LABELS[name] || `Using ${name}…`}
    </div>
  );
}

function AttachmentPart({ part }) {
  if (part.kind === "image") {
    return <img className="bubble-attachment-img" src={part.dataUrl} alt={part.name} />;
  }
  const icon = part.kind === "pdf" ? "📄" : part.kind === "textfile" ? "📝" : "📎";
  return (
    <div className="bubble-file-chip">
      <span>{icon}</span>
      <span className="bubble-file-name">{part.name}</span>
      {part.size != null && <span className="bubble-file-size">{(part.size / 1024).toFixed(0)} KB</span>}
    </div>
  );
}

function BubbleContent({ content }) {
  if (typeof content === "string") {
    return content ? <ReactMarkdown>{content}</ReactMarkdown> : null;
  }
  return content.map((part, i) =>
    part.kind === "text" ? (
      part.text ? <ReactMarkdown key={i}>{part.text}</ReactMarkdown> : null
    ) : (
      <AttachmentPart key={i} part={part} />
    )
  );
}

export default function MessageBubble({ role, content, streaming }) {
  const isUser = role === "user";
  const isEmpty = typeof content === "string" ? !content : !content?.length;
  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`avatar ${isUser ? "user" : "assistant"}`}>{isUser ? "You" : "N"}</div>
      <div className="bubble">
        {!isEmpty ? (
          <BubbleContent content={content} />
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
