// File upload helpers: read a File into a lightweight local "attachment"
// shape used for both UI rendering and (converted at send-time) the
// Anthropic Messages API content-block shape.
//
// Anthropic natively understands images and PDFs (as base64 content
// blocks) and plain text (as a text block). Other binary formats (docx,
// xlsx, pptx, zip, ...) can't be parsed client-side without extra
// libraries, so those are passed through as a plain notice the model can
// see, rather than silently dropped or sent as useless base64 noise.

export const MAX_FILE_SIZE_MB = 8;
export const MAX_FILES_PER_MESSAGE = 5;

const TEXT_LIKE_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml",
  "html", "htm", "css", "js", "jsx", "ts", "tsx", "py", "rb", "go", "java",
  "c", "cpp", "h", "sh", "sql", "log", "ini", "toml", "env",
]);

function extOf(name) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isTextLike(file) {
  if (file.type?.startsWith("text/")) return true;
  if (file.type === "application/json" || file.type === "application/xml") return true;
  if (!file.type && TEXT_LIKE_EXTENSIONS.has(extOf(file.name))) return true;
  return TEXT_LIKE_EXTENSIONS.has(extOf(file.name));
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function base64ToText(base64) {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

const MAX_TEXT_CHARS = 60000;

/** Reads a File and classifies it into a local attachment object for display + later API conversion. */
export async function fileToAttachment(file) {
  const dataUrl = await readAsDataUrl(file);
  const base64 = dataUrl.split(",")[1] || "";
  const mediaType = file.type || "application/octet-stream";
  const base = { name: file.name, mediaType, size: file.size, dataUrl };

  if (mediaType.startsWith("image/")) {
    return { ...base, kind: "image", data: base64 };
  }
  if (mediaType === "application/pdf") {
    return { ...base, kind: "pdf", data: base64 };
  }
  if (isTextLike(file)) {
    const text = base64ToText(base64);
    if (text != null) {
      const truncated = text.length > MAX_TEXT_CHARS;
      return {
        ...base,
        kind: "textfile",
        text: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
        truncated,
      };
    }
  }
  return { ...base, kind: "unsupported" };
}

/** Converts one local attachment into the Anthropic content-block shape. */
export function attachmentToApiBlock(att) {
  switch (att.kind) {
    case "image":
      return { type: "image", source: { type: "base64", media_type: att.mediaType, data: att.data } };
    case "pdf":
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: att.data },
        title: att.name,
      };
    case "textfile":
      return {
        type: "text",
        text: `[Uploaded file: ${att.name}]\n\n${att.text}${att.truncated ? "\n\n[...truncated...]" : ""}`,
      };
    default:
      return {
        type: "text",
        text: `[User attached a file named "${att.name}" (${att.mediaType}, ${(att.size / 1024).toFixed(0)} KB) that can't be read directly in this format. If you need its contents, ask the user to export/paste it as PDF, CSV, or plain text.]`,
      };
  }
}

/** Converts a local message's `content` (string | array of {kind:"text"|attachment}) into API content. */
export function toApiContent(content) {
  if (typeof content === "string") return content;
  return content.map((part) => (part.kind === "text" ? { type: "text", text: part.text } : attachmentToApiBlock(part)));
}

/** Converts a full local message array into the API-ready shape (for sending to the backend). */
export function toApiMessages(messages) {
  return messages.map((m) => ({ role: m.role, content: toApiContent(m.content) }));
}
