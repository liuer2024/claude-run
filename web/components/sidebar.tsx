import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Session } from "@claude-run/api";
import {
  fetchSessionMeta,
  getSessionMetaCache,
  saveSessionMeta,
  type SessionMeta,
} from "../utils";
import { useTheme } from "../theme-context";
import type { ThemeId } from "../theme";
import ProjectPicker from "./project-picker";
import type { ProjectStat } from "../lib/group-projects";
import { SessionRow, type RowCtx } from "./session-row";

interface SidebarProps {
  sessions: Session[];
  selectedProject: string | null;
  onSelectProject: (p: string | null) => void;
  selectedSession: string | null;
  onSelectSession: (id: string) => void;
  selectedGroup: string | null;
  onSelectGroup: (g: string | null) => void;
  onShareSession: (id: string) => void;
  loading?: boolean;
}

const ROW_ESTIMATE: Record<ThemeId, number> = {
  terminal: 76,
  archive: 96,
  blueprint: 92,
  swiss: 96,
};

function Masthead({ theme }: { theme: ThemeId }) {
  if (theme === "archive") {
    return (
      <div className="px-5 pt-4 pb-3 border-b border-zinc-800/60">
        <div className="text-[9px] tracking-[0.25em] text-zinc-500 mb-1">SESSION ARCHIVE</div>
        <div className="font-serif text-2xl leading-none text-zinc-100">
          Claude <span className="italic text-cyan-500">Run</span>
        </div>
      </div>
    );
  }
  if (theme === "blueprint") {
    return (
      <div className="px-5 pt-3.5 pb-3 border-b border-dashed border-zinc-700/70">
        <div className="text-[9px] tracking-[0.2em] text-cyan-500 flex justify-between">
          <span>DWG · SESSION-MAP</span>
          <span className="text-zinc-600">REV 0.2.3</span>
        </div>
        <div className="text-xl font-semibold tracking-wider mt-1 text-zinc-100">
          CLAUDE <span className="text-cyan-400">RUN</span>
        </div>
      </div>
    );
  }
  if (theme === "swiss") {
    return (
      <div className="px-5 pt-5 pb-4 border-b border-zinc-900">
        <div className="font-sans text-2xl font-extrabold tracking-tight uppercase leading-none text-zinc-100">
          Claude Run
        </div>
        <div className="w-9 h-1 bg-cyan-400 mt-3" />
      </div>
    );
  }
  return null; // terminal: picker sits at the top, like before
}

export default function Sidebar(props: SidebarProps) {
  const {
    sessions,
    selectedProject,
    onSelectProject,
    selectedSession,
    onSelectSession,
    selectedGroup,
    onSelectGroup,
    onShareSession,
    loading,
  } = props;
  const { theme } = useTheme();

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
      if (trimmed && trimmed !== sessions.find((s) => s.id === editingId)?.display) {
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
        if (!groupList.includes(trimmed)) groupList.push(trimmed);
      } else {
        delete groups[groupTargetId];
      }
      const used = new Set(Object.values(groups));
      groupList = groupList.filter((g) => used.has(g));
      return { ...prev, groups, groupList };
    });
    setGroupTargetId(null);
  }, [groupTargetId, groupInput, updateMeta]);

  const cancelGroup = useCallback(() => setGroupTargetId(null), []);

  // project list for the picker — derived from the loaded sessions, so only
  // projects that actually have sessions show up (each with its session count).
  const projectStats = useMemo<ProjectStat[]>(() => {
    const m = new Map<string, number>();
    for (const s of sessions) {
      m.set(s.project, (m.get(s.project) || 0) + 1);
    }
    return [...m].map(([full, count]) => ({ full, count }));
  }, [sessions]);

  const projectScoped = useMemo(
    () =>
      selectedProject
        ? sessions.filter((s) => s.project === selectedProject)
        : sessions,
    [sessions, selectedProject],
  );

  // --- filter ---
  const filteredSessions = useMemo(() => {
    let list = projectScoped;
    list = showDeleted
      ? list.filter((s) => meta.deleted[s.id])
      : list.filter((s) => !meta.deleted[s.id]);
    if (selectedGroup) {
      list = list.filter((s) => meta.groups[s.id] === selectedGroup);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.display.toLowerCase().includes(q) ||
          s.projectName.toLowerCase().includes(q) ||
          (meta.aliases[s.id] || "").toLowerCase().includes(q) ||
          (meta.groups[s.id] || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [projectScoped, search, meta, showDeleted, selectedGroup]);

  const virtualizer = useVirtualizer({
    count: filteredSessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE[theme],
    overscan: 10,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  return (
    <div className="h-full overflow-hidden bg-zinc-950 flex flex-col">
      <Masthead theme={theme} />

      {/* project picker */}
      <div className="border-b border-zinc-800/60">
        <ProjectPicker
          projects={projectStats}
          value={selectedProject}
          onChange={onSelectProject}
        />
      </div>

      {/* search */}
      <div className="px-3 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 text-zinc-500">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* group + deleted filter bar */}
      <div className="px-3 py-1.5 border-b border-zinc-800/60 flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => {
            onSelectGroup(null);
            setShowDeleted(false);
          }}
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
            onClick={() => {
              onSelectGroup(selectedGroup === g ? null : g);
              setShowDeleted(false);
            }}
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
          onClick={() => {
            setShowDeleted(!showDeleted);
            onSelectGroup(null);
          }}
          className={`px-2 py-0.5 rounded text-[10px] transition-colors ml-auto ${
            showDeleted ? "bg-rose-600/30 text-rose-300" : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
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
            <svg className="w-5 h-5 text-zinc-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filteredSessions.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-600">
            {search ? "No sessions match" : showDeleted ? "No deleted sessions" : "No sessions found"}
          </p>
        ) : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const session = filteredSessions[vi.index];
              const ctx: RowCtx = {
                session,
                index: vi.index,
                selected: selectedSession === session.id,
                alias: meta.aliases[session.id],
                group: meta.groups[session.id],
                isDeleted: !!meta.deleted[session.id],
                onSelect: () => onSelectSession(session.id),
                onShare: () => onShareSession(session.id),
                startEditing: (e) => startEditing(session.id, session.display, e),
                startGroupEdit: (e) => startGroupEdit(session.id, e),
                toggleDelete: (e) => toggleDelete(session.id, e),
                editing: {
                  active: editingId === session.id,
                  value: editValue,
                  set: setEditValue,
                  commit: commitEdit,
                  cancel: cancelEdit,
                  ref: inputRef,
                },
                groupEditing: {
                  active: groupTargetId === session.id,
                  value: groupInput,
                  set: setGroupInput,
                  commit: commitGroup,
                  cancel: cancelGroup,
                  ref: groupInputRef,
                  list: meta.groupList,
                },
              };
              return (
                <div
                  key={session.id}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)` }}
                >
                  <SessionRow variant={theme} ctx={ctx} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-zinc-800/60">
        <div className="text-[10px] text-zinc-600 text-center">
          {filteredSessions.length} / {projectScoped.length} session{projectScoped.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
