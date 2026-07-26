const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const DATA_FILE = path.join(__dirname, "..", "data", "automations.json");

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

function writeAll(automations) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(automations, null, 2), "utf8");
}

function addAutomation({ name, webhookUrl, description }) {
  if (!/^https?:\/\//i.test(webhookUrl || "")) {
    throw new Error("webhookUrl must be a valid http(s) URL");
  }
  const automations = readAll();
  const automation = {
    id: crypto.randomUUID(),
    name,
    webhookUrl,
    description: description || null,
    createdAt: new Date().toISOString(),
    lastTriggeredAt: null,
  };
  automations.push(automation);
  writeAll(automations);
  return automation;
}

function listAutomations() {
  // Never expose the raw webhook URL to the model/UI list view beyond what's
  // needed to identify it — callers that need to POST use triggerAutomation.
  return readAll();
}

function deleteAutomation(id) {
  const automations = readAll();
  const idx = automations.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  automations.splice(idx, 1);
  writeAll(automations);
  return true;
}

function findAutomation(ref) {
  const automations = readAll();
  if (!ref) return null;
  const byId = automations.find((a) => a.id === ref || a.id.startsWith(ref));
  if (byId) return byId;
  const lower = ref.toLowerCase();
  return automations.find((a) => a.name.toLowerCase().includes(lower)) || null;
}

/** POSTs a JSON payload to the automation's webhook (Zapier "Catch Hook" / Make "Custom Webhook"). */
function triggerAutomation(ref, payload = {}) {
  return new Promise((resolve, reject) => {
    const automation = findAutomation(ref);
    if (!automation) {
      reject(new Error(`No automation found matching "${ref}"`));
      return;
    }

    let target;
    try {
      target = new URL(automation.webhookUrl);
    } catch {
      reject(new Error("Automation has an invalid webhook URL"));
      return;
    }

    const body = JSON.stringify({ source: "nbr-marketing-agent", triggeredAt: new Date().toISOString(), ...payload });
    const client = target.protocol === "http:" ? http : https;

    const req = client.request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          const automations = readAll();
          const stored = automations.find((a) => a.id === automation.id);
          if (stored) {
            stored.lastTriggeredAt = new Date().toISOString();
            writeAll(automations);
          }
          resolve({
            statusCode: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            body: responseBody.slice(0, 500),
            automationName: automation.name,
          });
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("Webhook request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = { addAutomation, listAutomations, deleteAutomation, findAutomation, triggerAutomation };
