import type React from "react";
import { Share2 } from "lucide-react";
import type { Session } from "@claude-run/api";
import { formatTime } from "../utils";
import type { ThemeId } from "../theme";

export interface RowCtx {
  session: Session;
  index: number;
  selected: boolean;
  alias?: string;
  group?: string;
  isDeleted: boolean;
  onSelect: () => void;
  onShare: () => void;
  startEditing: (e: React.MouseEvent) => void;
  startGroupEdit: (e: React.MouseEvent) => void;
  toggleDelete: (e: React.MouseEvent) => void;
  editing: {
    active: boolean;
    value: string;
    set: (v: string) => void;
    commit: () => void;
    cancel: () => void;
    ref: React.RefObject<HTMLInputElement | null>;
  };
  groupEditing: {
    active: boolean;
    value: string;
    set: (v: string) => void;
    commit: () => void;
    cancel: () => void;
    ref: React.RefObject<HTMLInputElement | null>;
    list: string[];
  };
}

/* ---------- shared bits ---------- */

function RowActions({ ctx }: { ctx: RowCtx }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          ctx.onShare();
        }}
        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
        title="Share / Export"
      >
        <Share2 className="w-3 h-3 text-zinc-500" />
      </button>
      <button
        onClick={ctx.startGroupEdit}
        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
        title="Set group"
      >
        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </button>
      <button
        onClick={ctx.startEditing}
        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
        title="Rename"
      >
        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button
        onClick={ctx.toggleDelete}
        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
        title={ctx.isDeleted ? "Restore" : "Delete"}
      >
        {ctx.isDeleted ? (
          <svg className="w-3 h-3 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </div>
  );
}

function AliasInput({ ctx, accent }: { ctx: RowCtx; accent: string }) {
  return (
    <input
      ref={ctx.editing.ref}
      value={ctx.editing.value}
      onChange={(e) => ctx.editing.set(e.target.value)}
      onBlur={ctx.editing.commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") ctx.editing.commit();
        if (e.key === "Escape") ctx.editing.cancel();
      }}
      onClick={(e) => e.stopPropagation()}
      className={`w-full text-[12px] text-zinc-200 bg-zinc-800 border rounded px-1.5 py-0.5 focus:outline-none ${accent}`}
    />
  );
}

function GroupInput({ ctx }: { ctx: RowCtx }) {
  return (
    <div className="mb-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ctx.groupEditing.ref}
        value={ctx.groupEditing.value}
        onChange={(e) => ctx.groupEditing.set(e.target.value)}
        onBlur={ctx.groupEditing.commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") ctx.groupEditing.commit();
          if (e.key === "Escape") ctx.groupEditing.cancel();
        }}
        placeholder="Group name (empty to remove)"
        list="group-suggestions"
        className="flex-1 text-[11px] text-zinc-200 bg-zinc-800 border border-violet-600/50 rounded px-1.5 py-0.5 focus:outline-none focus:border-violet-500"
      />
      <datalist id="group-suggestions">
        {ctx.groupEditing.list.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
    </div>
  );
}

/* ---------- Terminal · flat (current look) ---------- */

function TerminalRow({ ctx }: { ctx: RowCtx }) {
  const { session, selected, alias, group } = ctx;
  return (
    <div
      onClick={() => !ctx.editing.active && !ctx.groupEditing.active && ctx.onSelect()}
      className={`group/item px-3 py-3.5 text-left transition-colors overflow-hidden border-b border-zinc-800/40 cursor-pointer ${
        selected ? "bg-cyan-700/30" : "hover:bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-zinc-500 font-medium truncate">{session.projectName}</span>
          {group && (
            <span className="text-[9px] px-1.5 py-px rounded bg-violet-600/20 text-violet-400 shrink-0">{group}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <RowActions ctx={ctx} />
          <span className="text-[10px] text-zinc-600 ml-0.5">{formatTime(session.timestamp)}</span>
        </div>
      </div>
      {ctx.groupEditing.active && <GroupInput ctx={ctx} />}
      {ctx.editing.active ? (
        <AliasInput ctx={ctx} accent="border-zinc-600 focus:border-cyan-500" />
      ) : (
        <>
          {alias && <p className="text-[12px] text-cyan-400 leading-snug line-clamp-1 break-words font-medium">{alias}</p>}
          <p className={`text-[12px] leading-snug line-clamp-2 break-words ${alias ? "text-zinc-500 text-[11px]" : "text-zinc-300"}`}>
            {session.display}
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Archive · card with book-spine ---------- */

function ArchiveRow({ ctx }: { ctx: RowCtx }) {
  const { session, selected, alias, group } = ctx;
  return (
    <div
      onClick={() => !ctx.editing.active && !ctx.groupEditing.active && ctx.onSelect()}
      className={`group/item relative mx-2 my-1.5 pl-4 pr-3 py-3 rounded-xl border cursor-pointer transition-colors ${
        selected
          ? "bg-cyan-700/15 border-cyan-500 shadow-sm"
          : "border-transparent hover:bg-zinc-900 hover:border-zinc-800/60"
      }`}
    >
      <span
        className={`absolute left-1.5 top-3 bottom-3 w-0.5 rounded ${selected ? "bg-cyan-500" : "bg-zinc-700 group-hover/item:bg-zinc-600"}`}
      />
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className={`text-[11px] font-medium truncate ${selected ? "text-cyan-400" : "text-cyan-600/90"}`}>
          {session.projectName}
        </span>
        {group && (
          <span className="text-[9px] px-1.5 py-px rounded-full bg-violet-600/15 text-violet-400 shrink-0">{group}</span>
        )}
        <span className="ml-auto flex items-center gap-1 shrink-0">
          <RowActions ctx={ctx} />
          <span className="text-[10px] text-zinc-500">{formatTime(session.timestamp)}</span>
        </span>
      </div>
      {ctx.groupEditing.active && <GroupInput ctx={ctx} />}
      {ctx.editing.active ? (
        <AliasInput ctx={ctx} accent="border-zinc-600 focus:border-cyan-500" />
      ) : (
        <>
          {alias && <p className="text-[12.5px] text-cyan-400 leading-snug line-clamp-1 break-words font-semibold">{alias}</p>}
          <p className={`text-[12.5px] leading-relaxed line-clamp-2 break-words ${alias ? "text-zinc-500 text-[11px]" : "text-zinc-300"}`}>
            {session.display}
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Blueprint · spec card ---------- */

function BlueprintRow({ ctx }: { ctx: RowCtx }) {
  const { session, selected, alias, group, index } = ctx;
  const id = String(index + 1).padStart(3, "0");
  return (
    <div
      onClick={() => !ctx.editing.active && !ctx.groupEditing.active && ctx.onSelect()}
      className={`group/item mx-2 my-2 px-3 py-2.5 border cursor-pointer transition-colors ${
        selected ? "bg-cyan-700/15 border-cyan-500" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-dashed border-zinc-800">
        <span className="text-[9px] text-zinc-600">#{id}</span>
        <span className={`text-[11px] truncate ${selected ? "text-cyan-400" : "text-cyan-500/90"}`}>
          {session.projectName}
        </span>
        {group && (
          <span className="text-[9px] px-1.5 py-px bg-violet-600/15 text-violet-400 shrink-0">{group}</span>
        )}
        <span className="ml-auto flex items-center gap-1 shrink-0">
          <RowActions ctx={ctx} />
          <span className="text-[9.5px] text-zinc-600">{formatTime(session.timestamp)}</span>
        </span>
      </div>
      {ctx.groupEditing.active && <GroupInput ctx={ctx} />}
      {ctx.editing.active ? (
        <AliasInput ctx={ctx} accent="border-zinc-600 focus:border-cyan-500" />
      ) : (
        <>
          {alias && <p className="text-[12px] text-cyan-400 leading-snug line-clamp-1 break-words font-medium">{alias}</p>}
          <p className={`text-[12px] leading-snug line-clamp-2 break-words ${alias ? "text-zinc-500 text-[11px]" : "text-zinc-300"}`}>
            {session.display}
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Swiss · numbered ---------- */

function SwissRow({ ctx }: { ctx: RowCtx }) {
  const { session, selected, alias, group, index } = ctx;
  const num = String(index + 1).padStart(2, "0");
  return (
    <div
      onClick={() => !ctx.editing.active && !ctx.groupEditing.active && ctx.onSelect()}
      className={`group/item relative flex gap-3.5 px-5 py-4 border-b border-zinc-800/70 cursor-pointer transition-colors ${
        selected ? "bg-cyan-700/10" : "hover:bg-zinc-900"
      }`}
    >
      {selected && <span className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />}
      <span className={`text-[11px] pt-0.5 w-5 shrink-0 ${selected ? "text-cyan-400" : "text-zinc-600"}`}>{num}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2.5 mb-1">
          <span className="text-[13px] font-bold tracking-tight truncate text-zinc-100">{session.projectName}</span>
          {group && (
            <span className="text-[9px] px-1.5 py-px bg-violet-600/15 text-violet-400 shrink-0">{group}</span>
          )}
          <span className="ml-auto flex items-center gap-1 shrink-0">
            <RowActions ctx={ctx} />
            <span className="text-[10px] text-zinc-500">{formatTime(session.timestamp)}</span>
          </span>
        </div>
        {ctx.groupEditing.active && <GroupInput ctx={ctx} />}
        {ctx.editing.active ? (
          <AliasInput ctx={ctx} accent="border-zinc-600 focus:border-cyan-500" />
        ) : (
          <>
            {alias && <p className="text-[12.5px] text-cyan-500 leading-snug line-clamp-1 break-words font-semibold">{alias}</p>}
            <p className={`text-[12.5px] leading-relaxed line-clamp-2 break-words ${alias ? "text-zinc-500 text-[11px]" : "text-zinc-400"}`}>
              {session.display}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function SessionRow({ variant, ctx }: { variant: ThemeId; ctx: RowCtx }) {
  switch (variant) {
    case "archive":
      return <ArchiveRow ctx={ctx} />;
    case "blueprint":
      return <BlueprintRow ctx={ctx} />;
    case "swiss":
      return <SwissRow ctx={ctx} />;
    default:
      return <TerminalRow ctx={ctx} />;
  }
}
