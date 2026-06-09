import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { THEMES } from "../theme";
import { useTheme } from "../theme-context";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

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

  return (
    <div ref={wrapRef} className="ml-auto relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="切换主题"
        className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <span
          className="block w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/15"
          style={{ background: current.swatch }}
        />
        <span className="text-xs">{current.cn}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-32 py-1 rounded-md border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40"
        >
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                  active ? "text-cyan-300 bg-cyan-700/20" : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <span
                  className="block w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/15 shrink-0"
                  style={{ background: t.swatch }}
                />
                <span className="flex-1">{t.cn}</span>
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
