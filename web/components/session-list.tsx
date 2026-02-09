import { useState, useMemo, memo, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Session } from "@claude-run/api";
import { formatTime, fetchSessionMeta, getSessionMetaCache, saveSessionMeta } from "../utils";
import type { SessionMeta } from "../utils";

interface SessionListProps {
  sessions: Session[];
  selectedSession: string | null;
  onSelectSession: (sessionId: string) => void;
  selectedGroup: string | null;
  onSelectGroup: (group: string | null) => void;
  loading?: boolean;
}

const SessionList = memo(function SessionList(props: SessionListProps) {
  const {
    sessions,
    selectedSession,
    onSelectSession,
    selectedGroup,
    onSelectGroup,
    loading,
  } = props;
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState<SessionMeta>(getSessionMetaCache);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [groupTargetId, setGroupTargetId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSessionMeta().then(setMeta);
  }, []);

  const updateMeta = useCallback((fn: (prev: SessionMeta) => SessionMeta) => {
    setMeta((prev) => {
      const next = fn(prev);
      saveSessionMeta(next);
      return next;
    });
  }, []);

  // --- alias ---
  const startEditing = useCallback(
    (sessionId: string, currentDisplay: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(sessionId);
      setEditValue(meta.aliases[sessionId] || currentDisplay);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [meta.aliases],
  );

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    updateMeta((prev) => {
      const aliases = { ...prev.aliases };
      if (
        trimmed &&
        trimmed !== sessions.find((s) => s.id === editingId)?.display
      ) {
        aliases[editingId] = trimmed;
      } else {
        delete aliases[editingId];
      }
      return { ...prev, aliases };
    });
    setEditingId(null);
  }, [editingId, editValue, sessions, updateMeta]);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  // --- delete ---
  const toggleDelete = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      updateMeta((prev) => {
        const deleted = { ...prev.deleted };
        if (deleted[sessionId]) {
          delete deleted[sessionId];
        } else {
          deleted[sessionId] = true;
        }
        return { ...prev, deleted };
      });
    },
    [updateMeta],
  );

  // --- group ---
  const startGroupEdit = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setGroupTargetId(sessionId);
      setGroupInput(meta.groups[sessionId] || "");
      setTimeout(() => groupInputRef.current?.focus(), 0);
    },
    [meta.groups],
  );

  const commitGroup = useCallback(() => {
    if (!groupTargetId) return;
    const trimmed = groupInput.trim();
    updateMeta((prev) => {
      const groups = { ...prev.groups };
      let groupList = [...prev.groupList];
      if (trimmed) {
        groups[groupTargetId] = trimmed;
        if (!groupList.includes(trimmed)) {
          groupList.push(trimmed);
        }
      } else {
        delete groups[groupTargetId];
      }
      // clean up unused groups
      const usedGroups = new Set(Object.values(groups));
      groupList = groupList.filter((g) => usedGroups.has(g));
      return { ...prev, groups, groupList };
    });
    setGroupTargetId(null);
  }, [groupTargetId, groupInput, updateMeta]);

  const cancelGroup = useCallback(() => setGroupTargetId(null), []);

  // --- filter ---
  const filteredSessions = useMemo(() => {
    let list = sessions;
    // deleted filter
    if (!showDeleted) {
      list = list.filter((s) => !meta.deleted[s.id]);
    } else {
      list = list.filter((s) => meta.deleted[s.id]);
    }
    // group filter
    if (selectedGroup) {
      list = list.filter((s) => meta.groups[s.id] === selectedGroup);
    }
    // search
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.display.toLowerCase().includes(query) ||
          s.projectName.toLowerCase().includes(query) ||
          (meta.aliases[s.id] || "").toLowerCase().includes(query) ||
          (meta.groups[s.id] || "").toLowerCase().includes(query),
      );
    }
    return list;
  }, [sessions, search, meta, showDeleted, selectedGroup]);

  const virtualizer = useVirtualizer({
    count: filteredSessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 10,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  return (
    <div className="h-full overflow-hidden bg-zinc-950 flex flex-col">
      {/* search */}
      <div className="px-3 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 text-zinc-500">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* group + deleted filter bar */}
      <div className="px-3 py-1.5 border-b border-zinc-800/60 flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => { onSelectGroup(null); setShowDeleted(false); }}
          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
            !selectedGroup && !showDeleted
              ? "bg-cyan-600/30 text-cyan-300"
              : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          All
        </button>
        {meta.groupList.map((g) => (
          <button
            key={g}
            onClick={() => { onSelectGroup(selectedGroup === g ? null : g); setShowDeleted(false); }}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              selectedGroup === g
                ? "bg-violet-600/30 text-violet-300"
                : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {g}
          </button>
        ))}
        <button
          onClick={() => { setShowDeleted(!showDeleted); onSelectGroup(null); }}
          className={`px-2 py-0.5 rounded text-[10px] transition-colors ml-auto ${
            showDeleted
              ? "bg-rose-600/30 text-rose-300"
              : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
          }`}
          title="Show deleted"
        >
          <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="w-5 h-5 text-zinc-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : filteredSessions.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-600">
            {search
              ? "No sessions match"
              : showDeleted
                ? "No deleted sessions"
                : "No sessions found"}
          </p>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const session = filteredSessions[virtualItem.index];
              const alias = meta.aliases[session.id];
              const group = meta.groups[session.id];
              const isDeleted = meta.deleted[session.id];
              const isEditing = editingId === session.id;
              const isGroupEditing = groupTargetId === session.id;
              return (
                <div
                  key={session.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={`group/item px-3 py-3.5 text-left transition-colors overflow-hidden border-b border-zinc-800/40 cursor-pointer ${
                    selectedSession === session.id
                      ? "bg-cyan-700/30"
                      : "hover:bg-zinc-900/60"
                  } ${virtualItem.index === 0 ? "border-t border-t-zinc-800/40" : ""}`}
                  onClick={() =>
                    !isEditing && !isGroupEditing && onSelectSession(session.id)
                  }
                >
                  {/* top row: project + actions + time */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-zinc-500 font-medium truncate">
                        {session.projectName}
                      </span>
                      {group && (
                        <span className="text-[9px] px-1.5 py-px rounded bg-violet-600/20 text-violet-400 shrink-0">
                          {group}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* group btn */}
                      <button
                        onClick={(e) => startGroupEdit(session.id, e)}
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
                        title="Set group"
                      >
                        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </button>
                      {/* rename btn */}
                      <button
                        onClick={(e) =>
                          startEditing(session.id, session.display, e)
                        }
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
                        title="Rename"
                      >
                        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {/* delete / restore btn */}
                      <button
                        onClick={(e) => toggleDelete(session.id, e)}
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700/50 rounded"
                        title={isDeleted ? "Restore" : "Delete"}
                      >
                        {isDeleted ? (
                          <svg className="w-3 h-3 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                      <span className="text-[10px] text-zinc-600 ml-0.5">
                        {formatTime(session.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* group inline editor */}
                  {isGroupEditing && (
                    <div className="mb-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={groupInputRef}
                        value={groupInput}
                        onChange={(e) => setGroupInput(e.target.value)}
                        onBlur={commitGroup}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitGroup();
                          if (e.key === "Escape") cancelGroup();
                        }}
                        placeholder="Group name (empty to remove)"
                        list="group-suggestions"
                        className="flex-1 text-[11px] text-zinc-200 bg-zinc-800 border border-violet-600/50 rounded px-1.5 py-0.5 focus:outline-none focus:border-violet-500"
                      />
                      <datalist id="group-suggestions">
                        {meta.groupList.map((g) => (
                          <option key={g} value={g} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {/* alias editor or display */}
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[12px] text-zinc-200 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500"
                    />
                  ) : (
                    <>
                      {alias && (
                        <p className="text-[12px] text-cyan-400 leading-snug line-clamp-1 break-words font-medium">
                          {alias}
                        </p>
                      )}
                      <p
                        className={`text-[12px] leading-snug line-clamp-2 break-words ${alias ? "text-zinc-500 text-[11px]" : "text-zinc-300"}`}
                      >
                        {session.display}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-zinc-800/60">
        <div className="text-[10px] text-zinc-600 text-center">
          {filteredSessions.length} / {sessions.length} session
          {sessions.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
});

export default SessionList;
