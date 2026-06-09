import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Folder, Search, Star } from "lucide-react";
import {
  groupProjects,
  basename,
  type ProjectStat,
  type ProjectItem,
} from "../lib/group-projects";
import { getStarred, saveStarred } from "../lib/starred";

interface ProjectPickerProps {
  projects: ProjectStat[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * The "All Projects" selector. Opens a popover that buckets projects by parent
 * directory (collapsible groups + count badges), with a pinned "starred" strip
 * for quick switching. Colors follow the active theme via Tailwind's CSS
 * variables; structure is shared across themes.
 */
export default function ProjectPicker({ projects, value, onChange }: ProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [starred, setStarred] = useState<string[]>(getStarred);
  const wrapRef = useRef<HTMLDivElement>(null);

  const starredSet = useMemo(() => new Set(starred), [starred]);

  const toggleStar = (full: string) => {
    setStarred((prev) => {
      const next = prev.includes(full)
        ? prev.filter((x) => x !== full)
        : [...prev, full];
      saveStarred(next);
      return next;
    });
  };

  const grouped = useMemo(() => groupProjects(projects), [projects]);

  const matchesQuery = (it: ProjectItem, label: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return it.name.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grouped.groups;
    return grouped.groups
      .map((g) => ({ ...g, items: g.items.filter((it) => matchesQuery(it, g.label)) }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, query]);

  const starredItems = useMemo(() => {
    return projects
      .filter((p) => starredSet.has(p.full))
      .map<ProjectItem>((p) => ({ full: p.full, name: basename(p.full), count: p.count }))
      .filter((it) => matchesQuery(it, ""))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, starredSet, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label = value ? basename(value) : "All Projects";

  const StarToggle = ({ full, always }: { full: string; always?: boolean }) => {
    const on = starredSet.has(full);
    return (
      <span
        role="button"
        title={on ? "取消收藏" : "收藏"}
        onClick={(e) => {
          e.stopPropagation();
          toggleStar(full);
        }}
        className={`shrink-0 p-0.5 rounded hover:bg-zinc-800 transition ${
          on || always ? "" : "opacity-0 group-hover/pi:opacity-100"
        }`}
      >
        <Star
          className={`w-3 h-3 ${on ? "fill-amber-400 text-amber-400" : "text-zinc-500"}`}
        />
      </span>
    );
  };

  const ProjectButton = ({
    it,
    indent,
  }: {
    it: ProjectItem;
    indent: string;
  }) => (
    <button
      type="button"
      onClick={() => {
        onChange(it.full);
        setOpen(false);
      }}
      className={`group/pi w-full flex items-center gap-1.5 ${indent} pr-2 py-1.5 rounded-md text-[12px] border-l-2 transition-colors cursor-pointer ${
        value === it.full
          ? "bg-cyan-700/25 text-cyan-300 border-cyan-500 font-medium"
          : "text-zinc-400 border-transparent hover:bg-zinc-900"
      }`}
    >
      <span className="flex-1 min-w-0 truncate">{it.name}</span>
      <StarToggle full={it.full} />
      <span className="text-[10px] text-zinc-600 shrink-0 w-5 text-right">{it.count}</span>
    </button>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-[50px] flex items-center gap-2.5 px-5 text-left cursor-pointer text-zinc-300 hover:bg-zinc-900/60 transition-colors"
      >
        <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-sm">{label}</span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-[calc(100%-2px)] z-50 flex flex-col max-h-[64vh] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 text-zinc-500">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="筛选项目 / 目录…"
              className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] transition-colors cursor-pointer ${
                value === null
                  ? "bg-cyan-700/25 text-cyan-300"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              <span className="font-medium">所有项目</span>
              <span className="text-[11px] text-zinc-500">{grouped.totalSessions}</span>
            </button>

            {/* starred quick-switch strip */}
            {starredItems.length > 0 && (
              <>
                <div className="flex items-center gap-1 px-2 pt-2.5 pb-1 text-[9px] tracking-wider text-zinc-600">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  收藏
                </div>
                {starredItems.map((it) => (
                  <ProjectButton key={`star-${it.full}`} it={it} indent="pl-3" />
                ))}
                <div className="mx-2 my-1.5 h-px bg-zinc-800/60" />
              </>
            )}

            {filteredGroups.map((g) => {
              const isCollapsed = collapsed[g.key] && !query.trim();
              return (
                <div key={g.key} className="mt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))
                    }
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                  >
                    <ChevronDown
                      className={`w-3 h-3 text-zinc-600 shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    />
                    <Folder className="w-3 h-3 text-violet-400/80 shrink-0" />
                    <span
                      className={`flex-1 min-w-0 truncate text-[11px] ${g.isOther ? "italic text-zinc-500" : "text-zinc-400"}`}
                    >
                      {g.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-px rounded-full bg-zinc-800 text-zinc-500 shrink-0">
                      {g.items.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div>
                      {g.items.map((it) => (
                        <ProjectButton key={it.full} it={it} indent="pl-7" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/60 text-[9.5px] text-zinc-600">
            <span>
              {grouped.groups.length} 组 · {grouped.total} 项 · {grouped.totalSessions} 会话
            </span>
            <span>★ 收藏置顶</span>
          </div>
        </div>
      )}
    </div>
  );
}
