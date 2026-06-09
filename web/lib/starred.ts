const KEY = "claude-run-starred-projects";

export function getStarred(): string[] {
  try {
    const v = localStorage.getItem(KEY);
    const arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveStarred(list: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore (private mode)
  }
}
