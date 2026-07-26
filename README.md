# NBR Marketing Agent

A Jarvis-style interactive AI agent for marketing work: chat or **talk** to it, and it drafts
campaign copy, generates visuals, plans content, researches competitors/trends on the web,
triggers your Zapier/Make automations, and manages your marketing tasks and reminders.

Built with:
- **Backend**: Node.js + Express, streaming responses from the [Claude API](https://www.anthropic.com) via `@anthropic-ai/sdk`, with tool use for task management, image generation, automation webhooks, and live web search.
- **Frontend**: React + Vite, a high-contrast dark HUD-style chat UI, voice input/output via the browser's native Web Speech API (no extra API keys needed for voice).

## Features

- 💬 **Chat or voice command** — type, or tap the mic and speak naturally. Replies can be spoken back to you, and you can stop a response mid-generation.
- ✍️ **Content generation** — social posts, ad copy, email campaigns, blog outlines, captions (see the quick-action buttons).
- 🎨 **Image generation** — generate on-brand social/ad visuals from a text prompt, rendered right in the chat. No extra API key required (uses the free Pollinations.ai service).
- 🗓️ **Campaign & strategy planning** — content calendars, campaign brainstorms, audience/positioning ideas.
- 🔍 **Research** — live web search for competitor moves, trends, and news (via Claude's web search tool).
- ⚡ **Automation triggers** — register your Zapier or Make.com webhook URLs and have the agent trigger them conversationally ("post this to Buffer", "sync this lead to the CRM").
- ✅ **Task & reminder tracking** — ask the agent to add/complete/remove tasks, or manage them directly in the sidebar.
- ⏹️ **Stop control** — cancel a response mid-stream; whatever was generated so far is kept.
- 📎 **File attachments** — attach images, PDFs, or text/code files (📎 in the composer, up to 5 files / 8MB each). Images and PDFs are read natively by Claude; text-like files are read as text. Other binary formats (e.g. `.docx`, `.xlsx`) are acknowledged but not parsed — export to PDF/CSV/text if you need those read.

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

### Connecting Zapier / Make automations

Grab a webhook URL from Zapier ("Webhooks by Zapier" → Catch Hook) or Make.com ("Custom
Webhook" trigger module), then either:
- Ask the agent conversationally: *"Register an automation called 'post-to-buffer' with this webhook: https://hooks.zapier.com/..."*, or
- Add it directly from the **Automations** panel in the sidebar.

Once registered, ask the agent to trigger it: *"Trigger post-to-buffer with this caption and image."*
The agent POSTs a JSON payload (whatever data makes sense for the request, plus `source` and
`triggeredAt`) to your webhook, and your Zap/Scenario takes it from there.

## Project layout

```
backend/
  server.js            Express app: /api/chat (SSE streaming), /api/tasks, /api/automations
  lib/anthropic.js      Claude client, system prompt, tool definitions, tool-use loop
  lib/tasks.js           JSON-file-backed task store
  lib/automations.js      JSON-file-backed automation (webhook) store + trigger logic
  data/tasks.json          Task data (created automatically)
  data/automations.json     Automation data (created automatically)
frontend/
  src/App.jsx            Layout: header + chat + sidebar (tasks + automations)
  src/components/         ChatPanel (chat + voice + stop), TaskPanel, AutomationsPanel,
                           QuickActions, MessageBubble
  src/lib/api.js           SSE streaming client
  src/lib/speech.js         Web Speech API wrappers (recognition + synthesis)
```

## Notes on the model

The backend defaults to `claude-sonnet-5`. Override it by setting `NBR_MODEL` in
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

> **Note:** the free Render plan uses an ephemeral filesystem, so `backend/data/*.json`
> resets on each redeploy/restart — fine for a live demo, but for persistent storage in
> production, swap the JSON file stores in `backend/lib/tasks.js` and `backend/lib/automations.js`
> for a real database.

The Express server already serves `frontend/dist` and proxies API routes, so a single
`node backend/server.js` process (with `ANTHROPIC_API_KEY` set) is enough to run the whole app.
