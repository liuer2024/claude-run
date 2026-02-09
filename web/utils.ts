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
    metaCache = { ...DEFAULT_META, ...data };
    return metaCache;
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
