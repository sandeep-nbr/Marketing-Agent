import React from "react";

const ACTIONS = [
  { label: "📱 Social post", prompt: "Write 3 social media post options announcing our latest product update." },
  { label: "🎯 Ad copy", prompt: "Write 3 short ad copy variations (headline + body) for a paid social campaign." },
  { label: "✉️ Email campaign", prompt: "Draft a marketing email for our upcoming campaign, with subject line options." },
  { label: "📝 Blog outline", prompt: "Create a blog post outline on a topic relevant to our industry." },
  { label: "🗓️ Content calendar", prompt: "Build a 2-week content calendar across our main social channels." },
  { label: "🎨 Generate image", prompt: "Generate a square social media graphic for our latest campaign — bold, modern, on-brand." },
  { label: "🔍 Competitor scan", prompt: "Research what our top competitors have been doing in marketing recently." },
  { label: "💡 Campaign ideas", prompt: "Brainstorm 5 creative campaign ideas for our next quarter." },
  { label: "⚡ My automations", prompt: "List my configured automations." },
  { label: "✅ My tasks", prompt: "Show me my current marketing tasks." },
];

export default function QuickActions({ onPick }) {
  return (
    <div className="quick-actions">
      {ACTIONS.map((a) => (
        <button key={a.label} className="quick-action-btn" onClick={() => onPick(a.prompt)}>
          {a.label}
        </button>
      ))}
    </div>
  );
}
