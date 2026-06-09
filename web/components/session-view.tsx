import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ChevronRight, List } from "lucide-react";
import type { ConversationMessage, ContentBlock } from "@claude-run/api";
import MessageBlock from "./message-block";
import ScrollButtons from "./scroll-to-bottom-button";
import { filterConversation, sanitizeText } from "../utils";

const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const SCROLL_THRESHOLD_PX = 100;

const TOC_MIN_WIDTH = 140;
const TOC_MAX_WIDTH = 480;
const TOC_DEFAULT_WIDTH = 230;
const TOC_WIDTH_KEY = "claude-run-toc-width";
const TOC_OPEN_KEY = "claude-run-toc-open";

interface SessionViewProps {
  sessionId: string;
}

interface TocItem {
  id: string;
  n: number;
  text: string;
}

/** Extracts the text the user actually typed; null for tool-result-only turns. */
function userInputText(message: ConversationMessage): string | null {
  const c = message.message?.content;
  if (typeof c === "string") {
    return sanitizeText(c) || null;
  }
  if (Array.isArray(c)) {
    const text = (c as ContentBlock[])
      .filter((b) => b.type === "text" && !!b.text)
      .map((b) => sanitizeText(b.text as string))
      .filter(Boolean)
      .join(" ");
    if (text) return text;
    if ((c as ContentBlock[]).some((b) => b.type === "image")) return "[图片]";
    return null;
  }
  return null;
}

function SessionView(props: SessionViewProps) {
  const { sessionId } = props;

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTop, setShowTop] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const [tocWidth, setTocWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem(TOC_WIDTH_KEY));
    return v >= TOC_MIN_WIDTH && v <= TOC_MAX_WIDTH ? v : TOC_DEFAULT_WIDTH;
  });
  const [tocOpen, setTocOpen] = useState<boolean>(
    () => localStorage.getItem(TOC_OPEN_KEY) !== "0",
  );
  const toggleToc = useCallback((open: boolean) => {
    setTocOpen(open);
    try {
      localStorage.setItem(TOC_OPEN_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);
  const tocWidthRef = useRef(tocWidth);
  const resizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const isScrollingProgrammaticallyRef = useRef(false);
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/conversation/${sessionId}/stream?offset=${offsetRef.current}`
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("messages", (event) => {
      retryCountRef.current = 0;
      const newMessages: ConversationMessage[] = JSON.parse(event.data);
      setLoading(false);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.uuid).filter(Boolean));
        const unique = newMessages.filter((m) => !existingIds.has(m.uuid));
        if (unique.length === 0) {
          return prev;
        }
        offsetRef.current += unique.length;
        return [...prev, ...unique];
      });
    });

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);

      if (!mountedRef.current) {
        return;
      }

      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current), MAX_RETRY_DELAY_MS);
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => connect(), delay);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setMessages([]);
    offsetRef.current = 0;
    retryCountRef.current = 0;

    connect();

    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  const scrollToBottom = useCallback(() => {
    if (!lastMessageRef.current) {
      return;
    }
    isScrollingProgrammaticallyRef.current = true;
    lastMessageRef.current.scrollIntoView({ behavior: "instant" });
    requestAnimationFrame(() => {
      isScrollingProgrammaticallyRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll, scrollToBottom]);

  const tocItems = useMemo<TocItem[]>(() => {
    const { conversationMessages } = filterConversation(messages);
    const items: TocItem[] = [];
    let n = 0;
    conversationMessages.forEach((m, i) => {
      if (m.type !== "user") return;
      const text = userInputText(m);
      if (!text) return;
      n += 1;
      items.push({ id: `msg-${m.uuid || i}`, n, text });
    });
    return items;
  }, [messages]);

  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveTocId(id);
    }
  }, []);

  // drag-to-resize the TOC panel
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.min(
        TOC_MAX_WIDTH,
        Math.max(TOC_MIN_WIDTH, window.innerWidth - e.clientX),
      );
      tocWidthRef.current = w;
      setTocWidth(w);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(TOC_WIDTH_KEY, String(tocWidthRef.current));
      } catch {
        // ignore
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowTop(scrollTop > SCROLL_THRESHOLD_PX);

    // scroll-spy: the last user message whose top is at/above the viewport top
    const cTop = containerRef.current.getBoundingClientRect().top;
    let active: string | null = null;
    for (const it of tocItems) {
      const el = document.getElementById(it.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top - cTop <= 90) {
        active = it.id;
      } else {
        break;
      }
    }
    setActiveTocId(active);

    if (isScrollingProgrammaticallyRef.current) {
      return;
    }
    const isAtBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD_PX;
    setAutoScroll(isAtBottom);
  };

  const { summary, conversationMessages } = filterConversation(messages);
  const showToc = tocItems.length > 0;
  const tocVisible = showToc && tocOpen;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative h-full flex">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 h-full overflow-y-auto bg-zinc-950 min-w-0"
      >
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          {summary && (
            <div className="mb-6 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
              <h2 className="text-sm font-medium text-zinc-200 leading-relaxed">
                {summary}
              </h2>
              <p className="mt-2 text-[11px] text-zinc-500">
                {conversationMessages.length} messages
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {conversationMessages.map((message, index) => (
              <div
                key={message.uuid || index}
                id={`msg-${message.uuid || index}`}
                ref={
                  index === conversationMessages.length - 1
                    ? lastMessageRef
                    : undefined
                }
              >
                <MessageBlock message={message} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showToc && !tocOpen && (
        <button
          onClick={() => toggleToc(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 py-3 px-1.5 rounded-l-lg border border-r-0 border-zinc-800/60 bg-zinc-900/90 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 backdrop-blur-sm shadow-lg transition-colors"
          title="展开「我的提问」目录"
        >
          <List className="w-4 h-4" />
          <span className="text-[10px] [writing-mode:vertical-rl]">目录</span>
        </button>
      )}

      {tocVisible && (
        <>
          <div
            onMouseDown={() => {
              resizingRef.current = true;
              document.body.style.userSelect = "none";
            }}
            className="w-1.5 shrink-0 cursor-col-resize bg-zinc-800/40 hover:bg-cyan-600/50 transition-colors"
            title="拖动调整目录宽度"
          />
          <aside
            style={{ width: tocWidth }}
            className="h-full shrink-0 overflow-y-auto bg-zinc-950 border-l border-zinc-800/60"
          >
            <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/60">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                我的提问
              </span>
              <span className="text-[10px] text-zinc-600">{tocItems.length}</span>
              <button
                onClick={() => toggleToc(false)}
                className="ml-auto p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="收起目录"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <nav className="py-1">
              {tocItems.map((it) => {
                const active = activeTocId === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => jumpTo(it.id)}
                    className={`group w-full text-left flex gap-2 px-3 py-2 border-l-2 transition-colors ${
                      active
                        ? "border-cyan-500 bg-cyan-700/15"
                        : "border-transparent hover:border-zinc-600 hover:bg-zinc-900"
                    }`}
                    title={it.text}
                  >
                    <span
                      className={`shrink-0 w-5 text-right text-[10px] pt-0.5 ${active ? "text-cyan-400" : "text-zinc-600"}`}
                    >
                      {it.n}
                    </span>
                    <span
                      className={`text-[11px] leading-snug line-clamp-2 break-words ${
                        active ? "text-cyan-300" : "text-zinc-400 group-hover:text-zinc-200"
                      }`}
                    >
                      {it.text}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      <ScrollButtons
        showTop={showTop}
        showBottom={!autoScroll}
        onTop={scrollToTop}
        onBottom={() => {
          setAutoScroll(true);
          scrollToBottom();
        }}
        rightPx={tocVisible ? tocWidth + 16 : 24}
      />
    </div>
  );
}

export default SessionView;
