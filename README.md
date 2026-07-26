# Aria — Marketing AI Agent

A Jarvis-style interactive AI agent for marketing work: chat or **talk** to it, and it drafts
campaign copy, plans content, researches competitors/trends on the web, and manages your
marketing tasks and reminders.

Built with:
- **Backend**: Node.js + Express, streaming responses from the [Claude API](https://www.anthropic.com) via `@anthropic-ai/sdk`, with tool use for task management and live web search.
- **Frontend**: React + Vite, a dark HUD-style chat UI, voice input/output via the browser's native Web Speech API (no extra API keys needed for voice).

## Features

- 💬 **Chat or voice command** — type, or tap the mic and speak naturally. Replies can be spoken back to you.
- ✍️ **Content generation** — social posts, ad copy, email campaigns, blog outlines, captions (see the quick-action buttons).
- 🗓️ **Campaign & strategy planning** — content calendars, campaign brainstorms, audience/positioning ideas.
- 🔍 **Research** — live web search for competitor moves, trends, and news (via Claude's web search tool).
- ✅ **Task & reminder tracking** — ask Aria to add/complete/remove tasks, or manage them directly in the sidebar.

## Setup

### 1. Get an Anthropic API key

Create one at [console.anthropic.com](https://console.anthropic.com/settings/keys).

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# edit .env and paste your key into ANTHROPIC_API_KEY=
npm install
```

### 3. Install the frontend

```bash
cd ../frontend
npm install
```

### 4. Run it

In one terminal:

```bash
cd backend
npm run dev
```

In another terminal:

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**). The frontend dev server proxies
`/api/*` requests to the backend on port 8787.

### Using voice

Voice input/output uses the browser's built-in Web Speech API — no extra setup or API key
required. It works best in **Chrome or Edge**. Click the microphone icon to speak a command;
click the speaker icon to mute/unmute spoken replies.

> Voice recognition requires a secure context (`https://` or `localhost`) — this is satisfied
> automatically when running locally via Vite.

## Project layout

```
backend/
  server.js          Express app: /api/chat (SSE streaming), /api/tasks (REST)
  lib/anthropic.js    Claude client, system prompt, tool definitions, tool-use loop
  lib/tasks.js         JSON-file-backed task store
  data/tasks.json       Task data (gitignored in spirit; created automatically)
frontend/
  src/App.jsx          Layout: header + chat + task sidebar
  src/components/       ChatPanel (chat + voice), TaskPanel, QuickActions, MessageBubble
  src/lib/api.js         SSE streaming client
  src/lib/speech.js       Web Speech API wrappers (recognition + synthesis)
```

## Notes on the model

The backend defaults to `claude-sonnet-5`. Override it by setting `ARIA_MODEL` in
`backend/.env` (e.g. to `claude-opus-5` for the most capable — but pricier — option).

## Deploying

For a single-server deployment, build the frontend and let Express serve it:

```bash
cd frontend && npm run build
cd ../backend && npm start
```

### Deploying to Render (live public URL)

This repo includes a `render.yaml` blueprint for a one-command deploy on
[Render](https://render.com):

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard: **New → Blueprint**, connect this repo, and pick the branch to deploy.
3. Render reads `render.yaml` automatically — it builds the frontend, installs the backend, and
   starts `node backend/server.js`.
4. When prompted for the `ANTHROPIC_API_KEY` environment variable, paste your key into Render's
   dashboard (it's marked `sync: false` in the blueprint, so it's never stored in the repo).
5. Render gives you a public `https://<your-service>.onrender.com` URL once the build finishes.

> **Note:** the free Render plan uses an ephemeral filesystem, so `backend/data/tasks.json`
> resets on each redeploy/restart — fine for a live demo, but for persistent task storage in
> production, swap the JSON file store in `backend/lib/tasks.js` for a real database.

The Express server already serves `frontend/dist` and proxies API routes, so a single
`node backend/server.js` process (with `ANTHROPIC_API_KEY` set) is enough to run the whole app.
