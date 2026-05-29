import { Trash2, RotateCcw } from "lucide-react";
import type { SharePayload } from "../utils";
import MessageBlock from "./message-block";

interface ShareViewProps {
  data: SharePayload;
  // Dialog-only editing affordances. Omitted in the standalone export bundle,
  // so the exported file renders a clean, read-only conversation.
  excluded?: Set<number>;
  onToggleExclude?: (index: number) => void;
}

/**
 * Read-only renderer for a single shared conversation.
 *
 * Shared by the in-app share preview dialog and the standalone single-file
 * export bundle (web/share/main.tsx) so that the preview is pixel-identical to
 * the exported HTML.
 */
export default function ShareView(props: ShareViewProps) {
  const { data, excluded, onToggleExclude } = props;
  const editable = !!onToggleExclude;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 border-b border-zinc-800/60 pb-4">
          <h1 className="text-base font-semibold text-zinc-100 break-words">
            {data.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            {data.project && <span>{data.project}</span>}
            {data.time && <span>{data.time}</span>}
            <span>{data.messages.length} messages</span>
          </div>
        </header>

        {data.summary && (
          <div className="mb-6 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <h2 className="text-sm font-medium text-zinc-200 leading-relaxed">
              {data.summary}
            </h2>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {data.messages.map((message, index) => {
            const isExcluded = excluded?.has(index) ?? false;
            return (
              <div
                key={message.uuid || index}
                className={`relative ${editable ? "group/share rounded-lg transition-opacity" : ""} ${
                  isExcluded ? "opacity-30" : ""
                }`}
              >
                {editable && (
                  <button
                    onClick={() => onToggleExclude?.(index)}
                    className={`absolute right-0 -top-1 z-10 flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] transition-opacity ${
                      isExcluded
                        ? "opacity-100 border-teal-500/30 bg-teal-500/15 text-teal-300"
                        : "opacity-0 group-hover/share:opacity-100 border-rose-500/30 bg-rose-500/15 text-rose-300"
                    }`}
                    title={isExcluded ? "重新加入分享" : "从分享中移除"}
                  >
                    {isExcluded ? (
                      <>
                        <RotateCcw size={11} />
                        <span>恢复</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={11} />
                        <span>移除</span>
                      </>
                    )}
                  </button>
                )}
                <MessageBlock message={message} />
              </div>
            );
          })}
        </div>

        <footer className="mt-10 border-t border-zinc-800/60 pt-4 text-center text-[11px] text-zinc-600">
          Exported from Claude Run
        </footer>
      </div>
    </div>
  );
}
