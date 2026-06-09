export type ThemeId = "terminal" | "archive" | "blueprint" | "swiss";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  /** Chinese label shown in the switcher */
  cn: string;
  /** signature swatch color, shown in the switcher regardless of active theme */
  swatch: string;
}

export const THEMES: ThemeDef[] = [
  { id: "terminal", name: "Terminal", cn: "终端", swatch: "#22d3ee" },
  { id: "archive", name: "Archive", cn: "档案", swatch: "#b1432a" },
  { id: "blueprint", name: "Blueprint", cn: "蓝图", swatch: "#3b82f6" },
  { id: "swiss", name: "Swiss", cn: "瑞士", swatch: "#e8002d" },
];

const STORAGE_KEY = "claude-run-theme";

export function getTheme(): ThemeId {
  try {
    const t = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (t && THEMES.some((x) => x.id === t)) {
      return t;
    }
  } catch {
    // ignore (private mode / SSR)
  }
  return "terminal";
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute("data-theme", id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
