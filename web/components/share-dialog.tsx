import { useEffect, useState, useCallback, useMemo } from "react";
import type { Session, ConversationMessage } from "@claude-run/api";
import { X, Download, Loader2 } from "lucide-react";
import ShareView from "./share-view";
import type { SharePayload } from "../utils";
import {
  filterConversation,
  fetchShareTemplate,
  buildShareHtml,
  downloadHtml,
} from "../utils";

interface ShareDialogProps {
  session: Session;
  alias?: string | null;
  onClose: () => void;
}

/**
 * Full-screen preview-and-curate dialog. Loads the full conversation, lets the
 * user remove individual messages, then exports the kept messages as a
 * self-contained HTML file (identical to this preview).
 */
export default function ShareDialog(props: ShareDialogProps) {
  const { session, alias, onClose } = props;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [summary, setSummary] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load the conversation (non-streaming, one shot).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExcluded(new Set());
    fetch(`/api/conversation/${session.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("加载会话失败");
        return res.json();
      })
      .then((data: ConversationMessage[]) => {
        if (cancelled) return;
        const filtered = filterConversation(data);
        setSummary(filtered.summary);
        setMessages(filtered.conversationMessages);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError((e as Error).message || "加载失败");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  const toggleExclude = useCallback((index: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const title = alias || session.display;
  const time = useMemo(
    () => new Date(session.timestamp).toLocaleString(),
    [session.timestamp],
  );

  const keptMessages = useMemo(
    () => messages.filter((_, i) => !excluded.has(i)),
    [messages, excluded],
  );

  const previewData: SharePayload = {
    title,
    project: session.projectName,
    time,
    summary,
    messages,
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const template = await fetchShareTemplate();
      const payload: SharePayload = {
        title,
        project: session.projectName,
        time,
        summary,
        messages: keptMessages,
      };
      const html = buildShareHtml(template, payload);
      const safeName =
        (title || "conversation").replace(/[^\w.-]+/g, "_").slice(0, 60) ||
        "conversation";
      downloadHtml(`claude-run-${safeName}.html`, html);
    } catch (e: unknown) {
      setError((e as Error).message || "导出失败");
    } finally {
      setExporting(false);
    }
  }, [title, session.projectName, time, summary, keptMessages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex h-[50px] shrink-0 items-center justify-between gap-3 border-b border-zinc-800/60 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm text-zinc-200">
            分享预览 · {title}
          </span>
          {!loading && !error && (
            <span className="shrink-0 text-[11px] text-zinc-500">
              将导出 {keptMessages.length} / {messages.length} 条
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleExport}
            disabled={loading || exporting || keptMessages.length === 0}
            className="flex cursor-pointer items-center gap-2 rounded bg-cyan-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            导出 HTML
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800"
            title="关闭 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-950">
        {loading ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Loading...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-rose-400">
            {error}
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-3xl px-4 pt-4 text-[11px] leading-relaxed text-amber-400/80">
              悬停任意消息可「移除」，置灰的消息不会被导出。此版本不做脱敏，导出前请自行确认无敏感信息（密钥 / 路径 / 源码等）。
            </div>
            <ShareView
              data={previewData}
              excluded={excluded}
              onToggleExclude={toggleExclude}
            />
          </>
        )}
      </div>
    </div>
  );
}
