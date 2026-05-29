import type { ConversationMessage } from "@claude-run/api";

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return date.toLocaleDateString();
}

const SANITIZE_PATTERNS = [
  /<command-name>[^<]*<\/command-name>/g,
  /<command-message>[^<]*<\/command-message>/g,
  /<command-args>[^<]*<\/command-args>/g,
  /<local-command-stdout>[^<]*<\/local-command-stdout>/g,
  /<system-reminder>[\s\S]*?<\/system-reminder>/g,
  /^\s*Caveat:.*?unless the user explicitly asks you to\./s,
];

export function sanitizeText(text: string): string {
  let result = text;
  for (const pattern of SANITIZE_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

// --- Session metadata (server-side JSON) ---

export interface SessionMeta {
  aliases: Record<string, string>;
  deleted: Record<string, boolean>;
  groups: Record<string, string>;
  groupList: string[];
}

const DEFAULT_META: SessionMeta = { aliases: {}, deleted: {}, groups: {}, groupList: [] };

let metaCache: SessionMeta | null = null;

export async function fetchSessionMeta(): Promise<SessionMeta> {
  try {
    const res = await fetch("/api/meta");
    const data = await res.json();
    const merged: SessionMeta = { ...DEFAULT_META, ...data };
    metaCache = merged;
    return merged;
  } catch {
    return metaCache ?? { ...DEFAULT_META };
  }
}

export function getSessionMetaCache(): SessionMeta {
  return metaCache ?? { ...DEFAULT_META };
}

export async function saveSessionMeta(meta: SessionMeta): Promise<void> {
  metaCache = meta;
  try {
    await fetch("/api/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
  } catch { /* ignore */ }
}

// --- Conversation filtering (shared by the live view and the share view) ---

/**
 * Derives the displayable conversation from a raw message list: pulls the
 * summary text and keeps only user/assistant turns, dropping the auto-generated
 * "continued from a previous conversation" context messages.
 */
export function filterConversation(messages: ConversationMessage[]): {
  summary?: string;
  conversationMessages: ConversationMessage[];
} {
  const summary = messages.find((m) => m.type === "summary")?.summary;
  const conversationMessages = messages.filter((m) => {
    if (m.type !== "user" && m.type !== "assistant") return false;
    const content = m.message?.content;
    if (m.type === "user" && content) {
      const text =
        typeof content === "string"
          ? content
          : content.find((b) => b.type === "text")?.text || "";
      if (
        text.startsWith(
          "This session is being continued from a previous conversation",
        )
      ) {
        return false;
      }
    }
    return true;
  });
  return { summary, conversationMessages };
}

// --- Share / export ---

export interface SharePayload {
  title: string;
  project?: string;
  time?: string;
  summary?: string;
  messages: ConversationMessage[];
}

const SHARE_DATA_PLACEHOLDER = '"__CLAUDE_RUN_SHARE_DATA__"';

/** Fetches the prebuilt self-contained share template (served via /api). */
export async function fetchShareTemplate(): Promise<string> {
  const res = await fetch("/api/share/template");
  if (!res.ok) {
    throw new Error("分享模板未构建，请先运行 pnpm build");
  }
  return res.text();
}

/** Injects the conversation JSON into the share template. */
export function buildShareHtml(template: string, payload: SharePayload): string {
  // Escape "<" so embedded content (e.g. "</script>") cannot break out of the
  // <script type="application/json"> tag. Still valid JSON (<).
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  // Function replacement avoids "$" sequences in the JSON being treated as
  // special replacement patterns.
  return template.replace(SHARE_DATA_PLACEHOLDER, () => json);
}

/** Triggers a client-side download of an HTML string. */
export function downloadHtml(filename: string, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
